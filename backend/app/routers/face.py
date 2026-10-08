import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.deps import get_current_user, require_student, require_teacher
from app.face_service import (
    FaceServiceUnavailable,
    MultipleFacesDetected,
    NoFaceDetected,
    embedding_to_json,
    encode_face,
)
from app.models import ApprovalStatus, FaceApproval, FaceProfile, Student, User
from app.schemas import (
    FaceApprovalDecision,
    FaceApprovalOut,
    FaceRegisterResponse,
    FaceStatusOut,
)

router = APIRouter(prefix="/face", tags=["face"])


def _save_image(file_bytes: bytes, original_filename: str) -> str:
    uploads_root = settings.uploads_dir
    face_dir = os.path.join(uploads_root, settings.face_uploads_subdir)
    os.makedirs(face_dir, exist_ok=True)

    ext = os.path.splitext(original_filename)[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    full_path = os.path.join(face_dir, filename)

    with open(full_path, "wb") as f:
        f.write(file_bytes)

    return full_path


@router.post("/register", response_model=FaceRegisterResponse, status_code=status.HTTP_201_CREATED)
async def register_face(
    file: UploadFile = File(...),
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    student = current_user.student_profile
    if student is None:
        raise HTTPException(status_code=404, detail="ไม่พบโปรไฟล์นักศึกษาของบัญชีนี้")

    image_bytes = await file.read()

    try:
        encoding = encode_face(image_bytes)
    except FaceServiceUnavailable as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except (NoFaceDetected, MultipleFacesDetected) as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    image_path = _save_image(image_bytes, file.filename or "face.jpg")

    # ปิดใช้งาน face_profile เก่า (ถ้ามี) เพื่อไม่ให้ชนกับอันใหม่ที่รออนุมัติ
    old_profiles = db.query(FaceProfile).filter(
        FaceProfile.student_id == student.id, FaceProfile.is_active == True  # noqa: E712
    ).all()
    for p in old_profiles:
        p.is_active = False

    face_profile = FaceProfile(
        student_id=student.id,
        image_path=image_path,
        embedding=embedding_to_json(encoding),
        is_active=True,
    )
    db.add(face_profile)
    db.flush()

    approval = FaceApproval(
        face_profile_id=face_profile.id,
        teacher_id=_pick_any_teacher_id(db),
        status=ApprovalStatus.pending,
    )
    db.add(approval)
    db.commit()
    db.refresh(face_profile)

    return FaceRegisterResponse(
        face_profile_id=face_profile.id,
        status=ApprovalStatus.pending,
        message="อัปโหลดใบหน้าสำเร็จ กรุณารอให้อาจารย์อนุมัติก่อนจึงจะเช็คชื่อด้วยใบหน้าได้",
    )


def _pick_any_teacher_id(db: Session) -> int | None:
    """
    ตาราง face_approvals กำหนดให้ teacher_id เป็น NOT NULL แต่ตอนอัปโหลดเรายังไม่รู้ว่า
    อาจารย์คนไหนจะเป็นคนอนุมัติ จึงใส่ค่าเริ่มต้นเป็นอาจารย์คนแรกที่เจอไปก่อน
    (เมื่ออาจารย์คนใดก็ได้กดอนุมัติ/ปฏิเสธจริง ระบบจะอัปเดต teacher_id ให้เป็นคนที่ตัดสินใจแทน)
    """
    from app.models import Teacher

    teacher = db.query(Teacher).first()
    return teacher.id if teacher else None


@router.get("/status", response_model=FaceStatusOut)
def get_face_status(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    student = current_user.student_profile
    if student is None:
        raise HTTPException(status_code=404, detail="ไม่พบโปรไฟล์นักศึกษาของบัญชีนี้")

    latest_profile = (
        db.query(FaceProfile)
        .filter(FaceProfile.student_id == student.id)
        .order_by(FaceProfile.id.desc())
        .first()
    )
    if latest_profile is None:
        return FaceStatusOut(has_approved_face=False, latest_status=None, face_profile_id=None)

    latest_approval = latest_profile.approvals[-1] if latest_profile.approvals else None
    return FaceStatusOut(
        has_approved_face=student.has_approved_face,
        latest_status=latest_approval.status if latest_approval else None,
        face_profile_id=latest_profile.id,
    )


@router.get("/pending", response_model=list[FaceApprovalOut])
def list_pending_approvals(
    _teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    approvals = (
        db.query(FaceApproval).filter(FaceApproval.status == ApprovalStatus.pending).all()
    )
    result = []
    for a in approvals:
        student = a.face_profile.student
        result.append(
            FaceApprovalOut(
                id=a.id,
                face_profile_id=a.face_profile_id,
                teacher_id=a.teacher_id,
                status=a.status,
                remark=a.remark,
                created_at=a.created_at,
                student_id=student.id,
                student_name=student.full_name,
                student_code=student.student_code,
                image_path=a.face_profile.image_path,
            )
        )
    return result


@router.post("/{approval_id}/decision", response_model=FaceApprovalOut)
def decide_approval(
    approval_id: int,
    payload: FaceApprovalDecision,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    if payload.status not in (ApprovalStatus.approved, ApprovalStatus.rejected):
        raise HTTPException(status_code=400, detail="status ต้องเป็น approved หรือ rejected เท่านั้น")

    approval = db.query(FaceApproval).filter(FaceApproval.id == approval_id).first()
    if approval is None:
        raise HTTPException(status_code=404, detail="ไม่พบคำขออนุมัตินี้")

    approval.status = payload.status
    approval.remark = payload.remark
    approval.teacher_id = current_user.teacher_profile.id

    db.commit()
    db.refresh(approval)

    student = approval.face_profile.student
    return FaceApprovalOut(
        id=approval.id,
        face_profile_id=approval.face_profile_id,
        teacher_id=approval.teacher_id,
        status=approval.status,
        remark=approval.remark,
        created_at=approval.created_at,
        student_id=student.id,
        student_name=student.full_name,
        student_code=student.student_code,
        image_path=approval.face_profile.image_path,
    )


@router.get("/{face_profile_id}/image")
def get_face_image(
    face_profile_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """รูปใบหน้าที่อัปโหลดไว้ (เจ้าของ หรืออาจารย์เท่านั้น)"""
    profile = db.query(FaceProfile).filter(FaceProfile.id == face_profile_id).first()
    if profile is None or not profile.image_path:
        raise HTTPException(status_code=404, detail="ไม่พบรูปใบหน้านี้")

    is_owner = (
        current_user.student_profile is not None
        and current_user.student_profile.id == profile.student_id
    )
    if not (is_owner or current_user.teacher_profile is not None):
        raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์ดูรูปนี้")

    # กันไม่ให้อ่านไฟล์นอกโฟลเดอร์ uploads
    uploads_root = os.path.realpath(settings.uploads_dir)
    path = os.path.realpath(profile.image_path)
    if os.path.commonpath([uploads_root, path]) != uploads_root or not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="ไม่พบไฟล์รูปใบหน้า")
    return FileResponse(path)


@router.delete("/{face_profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_face_profile(
    face_profile_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(FaceProfile).filter(FaceProfile.id == face_profile_id).first()
    if profile is None:
        raise HTTPException(status_code=404, detail="ไม่พบข้อมูลใบหน้านี้")

    is_owner = (
        current_user.student_profile is not None
        and current_user.student_profile.id == profile.student_id
    )
    is_teacher = current_user.teacher_profile is not None
    if not (is_owner or is_teacher):
        raise HTTPException(status_code=403, detail="คุณไม่มีสิทธิ์ลบข้อมูลนี้")

    db.delete(profile)
    db.commit()
