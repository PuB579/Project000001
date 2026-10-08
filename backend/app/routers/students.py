from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_teacher
from app.models import Student, User, UserRole
from app.schemas import StudentCreate, StudentOut, StudentSelfUpdate, StudentUpdate
from app.security import hash_password

router = APIRouter(prefix="/students", tags=["students"])


def _latest_face(student: Student) -> tuple[str, int | None]:
    """สถานะใบหน้าล่าสุดของนักศึกษา: none / pending / approved / rejected"""
    if not student.face_profiles:
        return "none", None
    latest = max(student.face_profiles, key=lambda fp: fp.id)
    if not latest.approvals:
        return "pending", latest.id
    return latest.approvals[-1].status.value, latest.id


def to_student_out(student: Student) -> StudentOut:
    face_status, face_profile_id = _latest_face(student)
    return StudentOut(
        id=student.id,
        user_id=student.user_id,
        email=student.user.email,
        student_code=student.student_code,
        first_name=student.first_name,
        last_name=student.last_name,
        full_name=student.full_name,
        faculty=student.faculty,
        major=student.major,
        phone=student.phone,
        has_approved_face=student.has_approved_face,
        face_status=face_status,
        face_profile_id=face_profile_id,
        is_active=student.user.is_active,
        created_at=student.created_at,
    )


@router.get("", response_model=list[StudentOut])
def list_students(
    db: Session = Depends(get_db),
    _teacher=Depends(require_teacher),
):
    students = db.query(Student).all()
    return [to_student_out(s) for s in students]


@router.post("", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    _teacher=Depends(require_teacher),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="อีเมลนี้ถูกใช้งานแล้ว")

    existing_code = db.query(Student).filter(Student.student_code == payload.student_code).first()
    if existing_code:
        raise HTTPException(status_code=400, detail="รหัสนักศึกษานี้ถูกใช้งานแล้ว")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=UserRole.student,
    )
    db.add(user)
    db.flush()

    student = Student(
        user_id=user.id,
        student_code=payload.student_code,
        first_name=payload.first_name,
        last_name=payload.last_name,
        faculty=payload.faculty,
        major=payload.major,
        phone=payload.phone,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return to_student_out(student)


@router.get("/me", response_model=StudentOut)
def get_my_student_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.student or current_user.student_profile is None:
        raise HTTPException(status_code=404, detail="บัญชีนี้ไม่ใช่นักศึกษา")
    return to_student_out(current_user.student_profile)


@router.put("/me", response_model=StudentOut)
def update_my_student_profile(
    payload: StudentSelfUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    student = current_user.student_profile
    if current_user.role != UserRole.student or student is None:
        raise HTTPException(status_code=404, detail="บัญชีนี้ไม่ใช่นักศึกษา")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(student, key, value)
    db.commit()
    db.refresh(student)
    return to_student_out(student)


@router.get("/{student_id}", response_model=StudentOut)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    _teacher=Depends(require_teacher),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if student is None:
        raise HTTPException(status_code=404, detail="ไม่พบนักศึกษานี้")
    return to_student_out(student)


@router.put("/{student_id}", response_model=StudentOut)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    _teacher=Depends(require_teacher),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if student is None:
        raise HTTPException(status_code=404, detail="ไม่พบนักศึกษานี้")
    data = payload.model_dump(exclude_unset=True)
    # is_active อยู่ที่ตาราง users ไม่ใช่ students
    if "is_active" in data:
        student.user.is_active = bool(data.pop("is_active"))
    for key, value in data.items():
        setattr(student, key, value)
    db.commit()
    db.refresh(student)
    return to_student_out(student)


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    _teacher=Depends(require_teacher),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if student is None:
        raise HTTPException(status_code=404, detail="ไม่พบนักศึกษานี้")
    user = student.user
    db.delete(student)
    if user is not None:
        db.delete(user)
    db.commit()
