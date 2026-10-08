"""
Pydantic schemas (request/response models) — v2 style
"""
from __future__ import annotations

import datetime as dt
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import (
    AttendanceMethod,
    AttendanceStatus,
    ApprovalStatus,
    EnrollmentStatus,
    ScoreMode,
    UserRole,
)


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class LoginRequest(BaseModel):
    username: str = Field(description="อีเมล รหัสนักศึกษา หรือรหัสอาจารย์")
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: UserRole
    is_active: bool
    full_name: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------------------------------------------------------------------------
# Department
# ---------------------------------------------------------------------------
class DepartmentBase(BaseModel):
    name: str
    description: str | None = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentOut(DepartmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: dt.datetime
    updated_at: dt.datetime


# ---------------------------------------------------------------------------
# Student
# ---------------------------------------------------------------------------
class StudentCreate(BaseModel):
    email: EmailStr
    password: str
    student_code: str
    first_name: str
    last_name: str
    faculty: str | None = None
    major: str | None = None
    phone: str | None = None


class StudentUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    faculty: str | None = None
    major: str | None = None
    phone: str | None = None
    is_active: bool | None = None


class StudentSelfUpdate(BaseModel):
    """ข้อมูลที่นักศึกษาแก้เองได้"""
    phone: str | None = None


class StudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    email: EmailStr
    student_code: str
    first_name: str
    last_name: str
    full_name: str
    faculty: str | None
    major: str | None
    phone: str | None
    has_approved_face: bool
    # สถานะใบหน้าล่าสุด: none (ยังไม่ลงทะเบียน) / pending / approved / rejected
    face_status: str = "none"
    face_profile_id: int | None = None
    is_active: bool = True
    created_at: dt.datetime


# ---------------------------------------------------------------------------
# Teacher
# ---------------------------------------------------------------------------
class TeacherCreate(BaseModel):
    email: EmailStr
    password: str
    teacher_code: str
    first_name: str
    last_name: str
    department_id: int | None = None
    position: str | None = None
    phone: str | None = None


class TeacherUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    department_id: int | None = None
    position: str | None = None
    phone: str | None = None


class TeacherSelfUpdate(BaseModel):
    """ข้อมูลที่อาจารย์แก้เองได้ (department_id ให้แก้ผ่าน /teachers/{id})"""
    first_name: str | None = None
    last_name: str | None = None
    position: str | None = None
    phone: str | None = None


class TeacherOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    email: EmailStr
    teacher_code: str
    first_name: str
    last_name: str
    full_name: str
    department_id: int | None
    position: str | None
    phone: str | None
    department_name: str | None = None
    created_at: dt.datetime


# ---------------------------------------------------------------------------
# Course
# ---------------------------------------------------------------------------
class CourseBase(BaseModel):
    course_code: str
    course_name: str
    teacher_id: int | None = None
    department_id: int | None = None
    credit: int | None = None
    description: str | None = None


class CourseCreate(CourseBase):
    pass


class CourseOut(CourseBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: dt.datetime
    updated_at: dt.datetime


# ---------------------------------------------------------------------------
# Class
# ---------------------------------------------------------------------------
class ClassBase(BaseModel):
    course_id: int
    class_code: str | None = None
    class_name: str | None = None
    semester: str | None = None
    academic_year: str | None = None
    start_date: dt.date | None = None
    end_date: dt.date | None = None
    checkin_open_offset_minutes: int = 0
    checkin_close_offset_minutes: int = 30
    late_threshold_minutes: int = 5
    face_confidence_threshold: int = 85
    allow_manual_fallback: bool = True


class ClassCreate(ClassBase):
    pass


class ClassUpdate(BaseModel):
    class_code: str | None = None
    class_name: str | None = None
    semester: str | None = None
    academic_year: str | None = None
    start_date: dt.date | None = None
    end_date: dt.date | None = None
    checkin_open_offset_minutes: int | None = None
    checkin_close_offset_minutes: int | None = None
    late_threshold_minutes: int | None = None
    face_confidence_threshold: int | None = None
    allow_manual_fallback: bool | None = None


class ClassOut(ClassBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    # ข้อมูลประกอบจากรายวิชา (อ่านอย่างเดียว)
    course_code: str | None = None
    course_name: str | None = None
    credit: int | None = None
    teacher_id: int | None = None
    teacher_name: str | None = None
    student_count: int = 0
    created_at: dt.datetime
    updated_at: dt.datetime


# ---------------------------------------------------------------------------
# Enrollment
# ---------------------------------------------------------------------------
class EnrollmentCreate(BaseModel):
    class_id: int
    student_id: int


class EnrollmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    class_id: int
    student_id: int
    enroll_date: dt.date
    status: EnrollmentStatus
    student: StudentOut | None = None


# ---------------------------------------------------------------------------
# Face
# ---------------------------------------------------------------------------
class FaceRegisterResponse(BaseModel):
    face_profile_id: int
    status: ApprovalStatus
    message: str


class FaceStatusOut(BaseModel):
    has_approved_face: bool
    latest_status: ApprovalStatus | None
    face_profile_id: int | None


class FaceApprovalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    face_profile_id: int
    teacher_id: int
    status: ApprovalStatus
    remark: str | None
    created_at: dt.datetime
    student_id: int
    student_name: str
    student_code: str
    image_path: str | None


class FaceApprovalDecision(BaseModel):
    status: ApprovalStatus = Field(..., description="approved หรือ rejected เท่านั้น")
    remark: str | None = None


# ---------------------------------------------------------------------------
# Attendance
# ---------------------------------------------------------------------------
class AttendanceSessionCreate(BaseModel):
    class_id: int
    session_date: dt.date | None = None
    start_time: dt.time | None = None
    end_time: dt.time | None = None


class AttendanceSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    class_id: int
    session_date: dt.date
    start_time: dt.time | None
    end_time: dt.time | None
    created_by: int | None
    created_at: dt.datetime


class MySessionOut(BaseModel):
    """คาบเรียนวันนี้ของนักศึกษาที่ login อยู่ พร้อมช่วงเวลาเช็คชื่อและสถานะของตัวเอง"""
    session_id: int
    class_id: int
    class_code: str | None
    course_code: str
    course_name: str
    teacher_name: str | None
    session_date: dt.date
    start_time: dt.time | None
    end_time: dt.time | None
    open_at: dt.datetime | None
    close_at: dt.datetime | None
    is_open: bool
    my_status: AttendanceStatus | None
    my_check_in_time: dt.time | None
    my_method: AttendanceMethod | None = None
    my_confidence: Decimal | None = None
    late_minutes: int | None = None
    late_threshold_minutes: int = 5
    # สถานะที่แท้จริง: present / late / absent / open (เช็คชื่อได้อยู่) / upcoming (ยังไม่ถึงเวลา)
    status: str


class CheckinRequest(BaseModel):
    session_id: int


class CheckinResponse(BaseModel):
    status: AttendanceStatus
    method: AttendanceMethod
    confidence: float | None
    student_name: str
    message: str


class ManualCheckinRequest(BaseModel):
    session_id: int
    enrollment_id: int
    status: AttendanceStatus = AttendanceStatus.present


class AttendanceDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    enrollment_id: int
    status: AttendanceStatus
    method: AttendanceMethod
    check_in_time: dt.time | None
    confidence: Decimal | None
    created_at: dt.datetime
    student_id: int | None = None
    student_name: str | None = None
    student_code: str | None = None


class AttendanceRecordOut(BaseModel):
    """หนึ่งแถว = นักศึกษาหนึ่งคน ในคาบเรียนหนึ่งคาบ (รวมคนที่ไม่ได้เช็คชื่อด้วย)"""
    session_id: int
    session_date: dt.date
    start_time: dt.time | None
    end_time: dt.time | None
    class_id: int
    class_code: str | None
    course_code: str
    course_name: str
    enrollment_id: int
    student_id: int
    student_code: str
    student_name: str
    status: str
    method: AttendanceMethod | None
    check_in_time: dt.time | None
    confidence: Decimal | None
    late_minutes: int | None


class AttendanceSummary(BaseModel):
    class_id: int
    total_sessions: int
    total_students: int
    present_count: int
    late_count: int
    absent_count: int


# ---------------------------------------------------------------------------
# Scores
# ---------------------------------------------------------------------------
class LateTierIn(BaseModel):
    min_minutes: int
    deduction: Decimal


class LateTierOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    min_minutes: int
    deduction: Decimal


class AttendanceScoreRuleCreate(BaseModel):
    class_id: int
    mode: ScoreMode = ScoreMode.direct
    full_score: Decimal = Decimal("10.00")
    session_count: int = 16
    session_full_score: Decimal = Decimal("10.00")
    pass_threshold: Decimal = Decimal("5.00")
    late_tiers: list[LateTierIn] = Field(default_factory=list)


class AttendanceScoreRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    class_id: int
    mode: ScoreMode
    full_score: Decimal
    session_count: int
    session_full_score: Decimal
    pass_threshold: Decimal
    late_tiers: list[LateTierOut] = Field(default_factory=list)


class StudentScoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    student_id: int
    class_id: int
    score: Decimal
    note: str | None
    is_manual_override: bool
    updated_at: dt.datetime
    student_name: str | None = None
    student_code: str | None = None


class StudentScoreOverride(BaseModel):
    score: Decimal
    note: str | None = None
    # False = คะแนนนี้ตรงกับที่ระบบคำนวณ (ให้ /recalculate อัปเดตต่อได้)
    manual: bool = True


# ---------------------------------------------------------------------------
# Announcements
# ---------------------------------------------------------------------------
class AnnouncementCreate(BaseModel):
    class_id: int | None = None
    title: str
    body: str
    pinned: bool = False


class AnnouncementUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    pinned: bool | None = None


class AnnouncementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    teacher_id: int | None
    class_id: int | None
    title: str
    body: str
    pinned: bool
    created_at: dt.datetime
    teacher_name: str | None = None
