from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Student, Teacher, User
from app.schemas import ChangePasswordRequest, LoginRequest, TokenResponse, UserOut
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _full_name_of(user: User) -> str:
    if user.student_profile:
        return user.student_profile.full_name
    if user.teacher_profile:
        return user.teacher_profile.full_name
    return user.email


def _to_user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        full_name=_full_name_of(user),
    )


def _find_user(username: str, db: Session) -> User | None:
    """หา user จากอีเมล รหัสนักศึกษา หรือรหัสอาจารย์"""
    username = username.strip()
    user = db.query(User).filter(User.email == username).first()
    if user is None:
        student = db.query(Student).filter(Student.student_code == username).first()
        user = student.user if student else None
    if user is None:
        teacher = db.query(Teacher).filter(Teacher.teacher_code == username).first()
        user = teacher.user if teacher else None
    return user


def _authenticate(username: str, password: str, db: Session) -> User:
    user = _find_user(username, db)
    if user is None or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="บัญชีนี้ถูกระงับการใช้งาน",
        )

    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = _authenticate(payload.username, payload.password, db)
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return TokenResponse(access_token=token, user=_to_user_out(user))


@router.post("/token", include_in_schema=False)
def login_form(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Form-based login for the Swagger UI "Authorize" button."""
    user = _authenticate(form.username, form.password, db)
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return _to_user_out(current_user)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="รหัสผ่านปัจจุบันไม่ถูกต้อง")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม")
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
