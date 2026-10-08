"""
SQLAlchemy ORM models
=====================
ไฟล์นี้ต้องตรงกับโครงสร้างฐานข้อมูลจริง (project_face_ai_db) เป๊ะๆ ทุกคอลัมน์
สร้างจากไฟล์ export จริงของ phpMyAdmin (project_face_ai_db.sql) — ห้ามเดา/เติมคอลัมน์เอง
ถ้าจะแก้โครงสร้าง ให้แก้ที่ฐานข้อมูลก่อน แล้วค่อยมาแก้ไฟล์นี้ให้ตรงกัน

รวม 15 ตาราง:
users, departments, students, teachers, courses, classes, enrollments,
attendance_sessions, attendance_details, face_profiles, face_approvals,
attendance_score_rules, late_tiers, student_scores, announcements
"""
import enum

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    func,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.database import Base


# ---------------------------------------------------------------------------
# Enums (ตรงกับ ENUM ที่ประกาศไว้ในฐานข้อมูล)
# ---------------------------------------------------------------------------
class UserRole(str, enum.Enum):
    student = "student"
    teacher = "teacher"


class EnrollmentStatus(str, enum.Enum):
    enrolled = "enrolled"
    completed = "completed"
    withdrawn = "withdrawn"


class AttendanceStatus(str, enum.Enum):
    present = "present"
    late = "late"
    absent = "absent"


class AttendanceMethod(str, enum.Enum):
    face = "face"
    manual = "manual"


class ApprovalStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class ScoreMode(str, enum.Enum):
    direct = "direct"
    per_session = "per_session"


# ---------------------------------------------------------------------------
# users
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    student_profile = relationship(
        "Student", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    teacher_profile = relationship(
        "Teacher", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# departments
# ---------------------------------------------------------------------------
class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    teachers = relationship("Teacher", back_populates="department")
    courses = relationship("Course", back_populates="department")


# ---------------------------------------------------------------------------
# students
# ---------------------------------------------------------------------------
class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    student_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    faculty: Mapped[str | None] = mapped_column(String(255), nullable=True)
    major: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", back_populates="student_profile")
    enrollments = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan")
    face_profiles = relationship(
        "FaceProfile", back_populates="student", cascade="all, delete-orphan"
    )
    scores = relationship("StudentScore", back_populates="student", cascade="all, delete-orphan")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def has_approved_face(self) -> bool:
        for fp in self.face_profiles:
            if not fp.is_active:
                continue
            if fp.approvals and fp.approvals[-1].status == ApprovalStatus.approved:
                return True
        return False


# ---------------------------------------------------------------------------
# teachers
# ---------------------------------------------------------------------------
class Teacher(Base):
    __tablename__ = "teachers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    teacher_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    department_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    position: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", back_populates="teacher_profile")
    department = relationship("Department", back_populates="teachers")
    courses = relationship("Course", back_populates="teacher")
    face_approvals = relationship("FaceApproval", back_populates="teacher")
    announcements = relationship("Announcement", back_populates="teacher")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


# ---------------------------------------------------------------------------
# courses
# ---------------------------------------------------------------------------
class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    course_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    course_name: Mapped[str] = mapped_column(String(255), nullable=False)
    teacher_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True
    )
    department_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    credit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    teacher = relationship("Teacher", back_populates="courses")
    department = relationship("Department", back_populates="courses")
    classes = relationship("Class", back_populates="course", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# classes
# ---------------------------------------------------------------------------
class Class(Base):
    __tablename__ = "classes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    class_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    class_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    semester: Mapped[str | None] = mapped_column(String(20), nullable=True)
    academic_year: Mapped[str | None] = mapped_column(String(10), nullable=True)
    start_date: Mapped[object | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[object | None] = mapped_column(Date, nullable=True)

    # per-class check-in configuration (ไม่ใช้ค่า global อีกต่อไป)
    checkin_open_offset_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    checkin_close_offset_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    late_threshold_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    face_confidence_threshold: Mapped[int] = mapped_column(Integer, nullable=False, default=85)
    allow_manual_fallback: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    course = relationship("Course", back_populates="classes")
    enrollments = relationship("Enrollment", back_populates="class_", cascade="all, delete-orphan")
    sessions = relationship(
        "AttendanceSession", back_populates="class_", cascade="all, delete-orphan"
    )
    score_rule = relationship(
        "AttendanceScoreRule", back_populates="class_", uselist=False, cascade="all, delete-orphan"
    )
    student_scores = relationship(
        "StudentScore", back_populates="class_", cascade="all, delete-orphan"
    )
    announcements = relationship(
        "Announcement", back_populates="class_", cascade="all, delete-orphan"
    )

    # ข้อมูลประกอบสำหรับ ClassOut (ไม่ใช่คอลัมน์ในฐานข้อมูล)
    @property
    def course_code(self) -> str | None:
        return self.course.course_code if self.course else None

    @property
    def course_name(self) -> str | None:
        return self.course.course_name if self.course else None

    @property
    def credit(self) -> int | None:
        return self.course.credit if self.course else None

    @property
    def teacher_id(self) -> int | None:
        return self.course.teacher_id if self.course else None

    @property
    def teacher_name(self) -> str | None:
        return self.course.teacher.full_name if self.course and self.course.teacher else None

    @property
    def student_count(self) -> int:
        return sum(1 for e in self.enrollments if e.status == EnrollmentStatus.enrolled)


# ---------------------------------------------------------------------------
# enrollments
# ---------------------------------------------------------------------------
class Enrollment(Base):
    __tablename__ = "enrollments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    class_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False
    )
    student_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    enroll_date: Mapped[object] = mapped_column(Date, server_default=func.curdate())
    status: Mapped[EnrollmentStatus] = mapped_column(
        Enum(EnrollmentStatus), nullable=False, default=EnrollmentStatus.enrolled
    )
    created_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    class_ = relationship("Class", back_populates="enrollments")
    student = relationship("Student", back_populates="enrollments")
    attendance_details = relationship(
        "AttendanceDetail", back_populates="enrollment", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# attendance_sessions
# ---------------------------------------------------------------------------
class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    class_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False
    )
    session_date: Mapped[object] = mapped_column(Date, nullable=False)
    start_time: Mapped[object | None] = mapped_column(Time, nullable=True)
    end_time: Mapped[object | None] = mapped_column(Time, nullable=True)
    created_by: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())

    class_ = relationship("Class", back_populates="sessions")
    creator = relationship("Teacher")
    attendance_details = relationship(
        "AttendanceDetail", back_populates="session", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# attendance_details
# ---------------------------------------------------------------------------
class AttendanceDetail(Base):
    __tablename__ = "attendance_details"
    __table_args__ = ()

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False
    )
    enrollment_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[AttendanceStatus] = mapped_column(Enum(AttendanceStatus), nullable=False)
    method: Mapped[AttendanceMethod] = mapped_column(
        Enum(AttendanceMethod), nullable=False, default=AttendanceMethod.face
    )
    check_in_time: Mapped[object | None] = mapped_column(Time, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())

    session = relationship("AttendanceSession", back_populates="attendance_details")
    enrollment = relationship("Enrollment", back_populates="attendance_details")


# ---------------------------------------------------------------------------
# face_profiles
# ---------------------------------------------------------------------------
class FaceProfile(Base):
    __tablename__ = "face_profiles"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    embedding: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    student = relationship("Student", back_populates="face_profiles")
    approvals = relationship(
        "FaceApproval",
        back_populates="face_profile",
        cascade="all, delete-orphan",
        order_by="FaceApproval.id",
    )


# ---------------------------------------------------------------------------
# face_approvals
# ---------------------------------------------------------------------------
class FaceApproval(Base):
    __tablename__ = "face_approvals"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    face_profile_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("face_profiles.id", ondelete="CASCADE"), nullable=False
    )
    teacher_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus), nullable=False, default=ApprovalStatus.pending
    )
    remark: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    face_profile = relationship("FaceProfile", back_populates="approvals")
    teacher = relationship("Teacher", back_populates="face_approvals")


# ---------------------------------------------------------------------------
# attendance_score_rules
# ---------------------------------------------------------------------------
class AttendanceScoreRule(Base):
    __tablename__ = "attendance_score_rules"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    class_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("classes.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    mode: Mapped[ScoreMode] = mapped_column(Enum(ScoreMode), nullable=False, default=ScoreMode.direct)
    full_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=10.00)
    session_count: Mapped[int] = mapped_column(Integer, nullable=False, default=16)
    session_full_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=10.00)
    pass_threshold: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=5.00)
    created_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    class_ = relationship("Class", back_populates="score_rule")
    late_tiers = relationship(
        "LateTier",
        back_populates="rule",
        cascade="all, delete-orphan",
        order_by="LateTier.min_minutes",
    )


# ---------------------------------------------------------------------------
# late_tiers
# ---------------------------------------------------------------------------
class LateTier(Base):
    __tablename__ = "late_tiers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    rule_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("attendance_score_rules.id", ondelete="CASCADE"), nullable=False
    )
    min_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    deduction: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)

    rule = relationship("AttendanceScoreRule", back_populates="late_tiers")


# ---------------------------------------------------------------------------
# student_scores
# ---------------------------------------------------------------------------
class StudentScore(Base):
    __tablename__ = "student_scores"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    class_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False
    )
    score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=0.00)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_manual_override: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    updated_at: Mapped[object] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    student = relationship("Student", back_populates="scores")
    class_ = relationship("Class", back_populates="student_scores")


# ---------------------------------------------------------------------------
# announcements
# ---------------------------------------------------------------------------
class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    teacher_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True
    )
    class_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("classes.id", ondelete="CASCADE"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[object] = mapped_column(DateTime, server_default=func.now())

    teacher = relationship("Teacher", back_populates="announcements")
    class_ = relationship("Class", back_populates="announcements")
