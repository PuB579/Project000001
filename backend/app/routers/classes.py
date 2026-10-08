from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_teacher
from app.models import Class, Enrollment, Student, User, UserRole
from app.routers.students import to_student_out
from app.schemas import ClassCreate, ClassOut, ClassUpdate, EnrollmentCreate, EnrollmentOut

router = APIRouter(prefix="/classes", tags=["classes"])


@router.get("", response_model=list[ClassOut])
def list_classes(course_id: int | None = None, db: Session = Depends(get_db)):
    query = db.query(Class)
    if course_id is not None:
        query = query.filter(Class.course_id == course_id)
    return query.all()


@router.post("", response_model=ClassOut, status_code=status.HTTP_201_CREATED)
def create_class(
    payload: ClassCreate,
    db: Session = Depends(get_db),
    _teacher=Depends(require_teacher),
):
    class_ = Class(**payload.model_dump())
    db.add(class_)
    db.commit()
    db.refresh(class_)
    return class_


@router.get("/mine", response_model=list[ClassOut])
def list_my_classes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """คลาสของนักศึกษาที่ login อยู่ (เฉพาะที่ลงทะเบียนแล้ว) หรือของอาจารย์ (วิชาที่สอน)"""
    if current_user.role == UserRole.student and current_user.student_profile:
        student_id = current_user.student_profile.id
        class_ids = (
            db.query(Enrollment.class_id).filter(Enrollment.student_id == student_id).subquery()
        )
        return db.query(Class).filter(Class.id.in_(class_ids)).all()

    if current_user.role == UserRole.teacher and current_user.teacher_profile:
        teacher_id = current_user.teacher_profile.id
        return (
            db.query(Class)
            .join(Class.course)
            .filter(Class.course.has(teacher_id=teacher_id))
            .all()
        )

    return []


@router.get("/{class_id}", response_model=ClassOut)
def get_class(class_id: int, db: Session = Depends(get_db)):
    class_ = db.query(Class).filter(Class.id == class_id).first()
    if class_ is None:
        raise HTTPException(status_code=404, detail="ไม่พบคลาสเรียนนี้")
    return class_


@router.put("/{class_id}", response_model=ClassOut)
def update_class(
    class_id: int,
    payload: ClassUpdate,
    db: Session = Depends(get_db),
    _teacher=Depends(require_teacher),
):
    class_ = db.query(Class).filter(Class.id == class_id).first()
    if class_ is None:
        raise HTTPException(status_code=404, detail="ไม่พบคลาสเรียนนี้")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(class_, key, value)
    db.commit()
    db.refresh(class_)
    return class_


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_class(
    class_id: int,
    db: Session = Depends(get_db),
    _teacher=Depends(require_teacher),
):
    class_ = db.query(Class).filter(Class.id == class_id).first()
    if class_ is None:
        raise HTTPException(status_code=404, detail="ไม่พบคลาสเรียนนี้")
    db.delete(class_)
    db.commit()


# ---------------------------------------------------------------------------
# Enrollments
# ---------------------------------------------------------------------------
@router.get("/{class_id}/students", response_model=list[EnrollmentOut])
def list_class_students(class_id: int, db: Session = Depends(get_db)):
    enrollments = db.query(Enrollment).filter(Enrollment.class_id == class_id).all()
    result = []
    for e in enrollments:
        result.append(
            EnrollmentOut(
                id=e.id,
                class_id=e.class_id,
                student_id=e.student_id,
                enroll_date=e.enroll_date,
                status=e.status,
                student=to_student_out(e.student) if e.student else None,
            )
        )
    return result


@router.post(
    "/{class_id}/students",
    response_model=EnrollmentOut,
    status_code=status.HTTP_201_CREATED,
)
def enroll_student(
    class_id: int,
    payload: EnrollmentCreate,
    db: Session = Depends(get_db),
    _teacher=Depends(require_teacher),
):
    if payload.class_id != class_id:
        raise HTTPException(status_code=400, detail="class_id ไม่ตรงกับ path")

    class_ = db.query(Class).filter(Class.id == class_id).first()
    if class_ is None:
        raise HTTPException(status_code=404, detail="ไม่พบคลาสเรียนนี้")

    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if student is None:
        raise HTTPException(status_code=404, detail="ไม่พบนักศึกษานี้")

    existing = (
        db.query(Enrollment)
        .filter(Enrollment.class_id == class_id, Enrollment.student_id == payload.student_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="นักศึกษาคนนี้ลงทะเบียนคลาสนี้ไปแล้ว")

    enrollment = Enrollment(class_id=class_id, student_id=payload.student_id)
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return EnrollmentOut(
        id=enrollment.id,
        class_id=enrollment.class_id,
        student_id=enrollment.student_id,
        enroll_date=enrollment.enroll_date,
        status=enrollment.status,
        student=to_student_out(student),
    )


@router.delete(
    "/{class_id}/students/{enrollment_id}", status_code=status.HTTP_204_NO_CONTENT
)
def unenroll_student(
    class_id: int,
    enrollment_id: int,
    db: Session = Depends(get_db),
    _teacher=Depends(require_teacher),
):
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.id == enrollment_id, Enrollment.class_id == class_id)
        .first()
    )
    if enrollment is None:
        raise HTTPException(status_code=404, detail="ไม่พบการลงทะเบียนนี้")
    db.delete(enrollment)
    db.commit()
