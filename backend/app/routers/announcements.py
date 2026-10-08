from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_teacher
from app.models import Announcement, Enrollment, User, UserRole
from app.schemas import AnnouncementCreate, AnnouncementOut, AnnouncementUpdate

router = APIRouter(prefix="/announcements", tags=["announcements"])


def _to_out(a: Announcement) -> AnnouncementOut:
    return AnnouncementOut(
        id=a.id,
        teacher_id=a.teacher_id,
        class_id=a.class_id,
        title=a.title,
        body=a.body,
        pinned=a.pinned,
        created_at=a.created_at,
        teacher_name=a.teacher.full_name if a.teacher else None,
    )


@router.get("", response_model=list[AnnouncementOut])
def list_announcements(
    class_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Announcement)

    if class_id is not None:
        query = query.filter(Announcement.class_id == class_id)
    elif current_user.role == UserRole.student and current_user.student_profile:
        class_ids = [e.class_id for e in current_user.student_profile.enrollments]
        query = query.filter(
            (Announcement.class_id.in_(class_ids)) | (Announcement.class_id.is_(None))
        )

    announcements = query.order_by(Announcement.pinned.desc(), Announcement.created_at.desc()).all()
    return [_to_out(a) for a in announcements]


@router.post("", response_model=AnnouncementOut, status_code=status.HTTP_201_CREATED)
def create_announcement(
    payload: AnnouncementCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    announcement = Announcement(
        teacher_id=current_user.teacher_profile.id if current_user.teacher_profile else None,
        class_id=payload.class_id,
        title=payload.title,
        body=payload.body,
        pinned=payload.pinned,
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return _to_out(announcement)


@router.get("/{announcement_id}", response_model=AnnouncementOut)
def get_announcement(announcement_id: int, db: Session = Depends(get_db)):
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if announcement is None:
        raise HTTPException(status_code=404, detail="ไม่พบประกาศนี้")
    return _to_out(announcement)


@router.put("/{announcement_id}", response_model=AnnouncementOut)
def update_announcement(
    announcement_id: int,
    payload: AnnouncementUpdate,
    _teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if announcement is None:
        raise HTTPException(status_code=404, detail="ไม่พบประกาศนี้")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(announcement, key, value)
    db.commit()
    db.refresh(announcement)
    return _to_out(announcement)


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(
    announcement_id: int,
    _teacher: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if announcement is None:
        raise HTTPException(status_code=404, detail="ไม่พบประกาศนี้")
    db.delete(announcement)
    db.commit()
