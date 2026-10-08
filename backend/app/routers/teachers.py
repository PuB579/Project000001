from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_teacher
from app.models import Teacher, User, UserRole
from app.schemas import TeacherCreate, TeacherOut, TeacherSelfUpdate, TeacherUpdate
from app.security import hash_password

router = APIRouter(prefix="/teachers", tags=["teachers"])


def to_teacher_out(teacher: Teacher) -> TeacherOut:
    return TeacherOut(
        id=teacher.id,
        user_id=teacher.user_id,
        email=teacher.user.email,
        teacher_code=teacher.teacher_code,
        first_name=teacher.first_name,
        last_name=teacher.last_name,
        full_name=teacher.full_name,
        department_id=teacher.department_id,
        position=teacher.position,
        phone=teacher.phone,
        department_name=teacher.department.name if teacher.department else None,
        created_at=teacher.created_at,
    )


@router.get("", response_model=list[TeacherOut])
def list_teachers(db: Session = Depends(get_db)):
    teachers = db.query(Teacher).all()
    return [to_teacher_out(t) for t in teachers]


@router.post("", response_model=TeacherOut, status_code=status.HTTP_201_CREATED)
def create_teacher(
    payload: TeacherCreate,
    db: Session = Depends(get_db),
    _teacher=Depends(require_teacher),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="อีเมลนี้ถูกใช้งานแล้ว")

    existing_code = db.query(Teacher).filter(Teacher.teacher_code == payload.teacher_code).first()
    if existing_code:
        raise HTTPException(status_code=400, detail="รหัสอาจารย์นี้ถูกใช้งานแล้ว")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=UserRole.teacher,
    )
    db.add(user)
    db.flush()

    teacher = Teacher(
        user_id=user.id,
        teacher_code=payload.teacher_code,
        first_name=payload.first_name,
        last_name=payload.last_name,
        department_id=payload.department_id,
        position=payload.position,
        phone=payload.phone,
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return to_teacher_out(teacher)


@router.get("/me", response_model=TeacherOut)
def get_my_teacher_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != UserRole.teacher or current_user.teacher_profile is None:
        raise HTTPException(status_code=404, detail="บัญชีนี้ไม่ใช่อาจารย์")
    return to_teacher_out(current_user.teacher_profile)


@router.put("/me", response_model=TeacherOut)
def update_my_teacher_profile(
    payload: TeacherSelfUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    teacher = current_user.teacher_profile
    if current_user.role != UserRole.teacher or teacher is None:
        raise HTTPException(status_code=404, detail="บัญชีนี้ไม่ใช่อาจารย์")
    for key, value in payload.model_dump(exclude_unset=True).items():
        if key in ("first_name", "last_name") and not (value or "").strip():
            raise HTTPException(status_code=400, detail="ชื่อและนามสกุลห้ามว่าง")
        setattr(teacher, key, value)
    db.commit()
    db.refresh(teacher)
    return to_teacher_out(teacher)


@router.get("/{teacher_id}", response_model=TeacherOut)
def get_teacher(teacher_id: int, db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if teacher is None:
        raise HTTPException(status_code=404, detail="ไม่พบอาจารย์คนนี้")
    return to_teacher_out(teacher)


@router.put("/{teacher_id}", response_model=TeacherOut)
def update_teacher(
    teacher_id: int,
    payload: TeacherUpdate,
    db: Session = Depends(get_db),
    _teacher=Depends(require_teacher),
):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if teacher is None:
        raise HTTPException(status_code=404, detail="ไม่พบอาจารย์คนนี้")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(teacher, key, value)
    db.commit()
    db.refresh(teacher)
    return to_teacher_out(teacher)


@router.delete("/{teacher_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    _teacher=Depends(require_teacher),
):
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if teacher is None:
        raise HTTPException(status_code=404, detail="ไม่พบอาจารย์คนนี้")
    user = teacher.user
    db.delete(teacher)
    if user is not None:
        db.delete(user)
    db.commit()
