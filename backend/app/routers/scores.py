import datetime as dt
from decimal import ROUND_HALF_UP, Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.attendance_utils import effective_status, late_minutes
from app.database import get_db
from app.deps import require_student, require_teacher
from app.models import (
    AttendanceScoreRule,
    AttendanceSession,
    AttendanceStatus,
    Class,
    Enrollment,
    LateTier,
    ScoreMode,
    Student,
    StudentScore,
    User,
)
from app.schemas import (
    AttendanceScoreRuleCreate,
    AttendanceScoreRuleOut,
    StudentScoreOut,
    StudentScoreOverride,
)

router = APIRouter(prefix="/scores", tags=["scores"])


# ---------------------------------------------------------------------------
# Score rules (ตั้งค่าเกณฑ์การให้คะแนนต่อคลาส)
# ---------------------------------------------------------------------------
@router.put("/rules/{class_id}", response_model=AttendanceScoreRuleOut)
def upsert_score_rule(
    class_id: int,
    payload: AttendanceScoreRuleCreate,
    db: Session = Depends(get_db),
    _teacher: User = Depends(require_teacher),
):
    if payload.class_id != class_id:
        raise HTTPException(status_code=400, detail="class_id ไม่ตรงกับ path")

    class_ = db.query(Class).filter(Class.id == class_id).first()
    if class_ is None:
        raise HTTPException(status_code=404, detail="ไม่พบคลาสเรียนนี้")

    rule = db.query(AttendanceScoreRule).filter(AttendanceScoreRule.class_id == class_id).first()
    if rule is None:
        rule = AttendanceScoreRule(class_id=class_id)
        db.add(rule)

    rule.mode = payload.mode
    rule.full_score = payload.full_score
    rule.session_count = payload.session_count
    rule.session_full_score = payload.session_full_score
    rule.pass_threshold = payload.pass_threshold

    db.flush()

    # แทนที่ late_tiers ทั้งหมดด้วยชุดใหม่
    db.query(LateTier).filter(LateTier.rule_id == rule.id).delete()
    for tier in payload.late_tiers:
        db.add(LateTier(rule_id=rule.id, min_minutes=tier.min_minutes, deduction=tier.deduction))

    db.commit()
    db.refresh(rule)
    return rule


@router.get("/rules/{class_id}", response_model=AttendanceScoreRuleOut | None)
def get_score_rule(class_id: int, db: Session = Depends(get_db)):
    return db.query(AttendanceScoreRule).filter(AttendanceScoreRule.class_id == class_id).first()


# ---------------------------------------------------------------------------
# คำนวณ + ดูคะแนน
# ---------------------------------------------------------------------------
def _compute_score_for_student(db: Session, class_id: int, student_id: int) -> Decimal:
    """
    สูตรเดียวกับหน้า "คะแนนเข้าเรียน" ของอาจารย์ (TeacherAttendanceScore.jsx)
    - มาสาย: หักตามขั้นที่ min_minutes สูงสุดที่ไม่เกินจำนวนนาทีที่สาย
    - direct: เต็ม full_score, ขาดหนึ่งครั้งหัก full_score / session_count
    - per_session: ครั้งละ session_full_score รวมเป็นคะแนนดิบ แล้วแปลงสัดส่วนเป็น full_score
    คาบที่หมดเวลาเช็คชื่อแล้วแต่ไม่มีบันทึก นับเป็นขาด
    """
    rule = db.query(AttendanceScoreRule).filter(AttendanceScoreRule.class_id == class_id).first()
    if rule is None:
        return Decimal("0.00")

    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.class_id == class_id, Enrollment.student_id == student_id)
        .first()
    )
    if enrollment is None:
        return Decimal("0.00")

    class_ = enrollment.class_
    sessions = db.query(AttendanceSession).filter(AttendanceSession.class_id == class_id).all()
    now = dt.datetime.now().replace(microsecond=0)

    present = 0
    absent = 0
    late_list: list[int] = []
    for session in sessions:
        detail = next(
            (d for d in session.attendance_details if d.enrollment_id == enrollment.id), None
        )
        status_ = effective_status(session, class_, detail, now)
        if status_ == AttendanceStatus.present.value:
            present += 1
        elif status_ == AttendanceStatus.late.value:
            late_list.append(late_minutes(session, detail.check_in_time) or 0)
        elif status_ == AttendanceStatus.absent.value:
            absent += 1

    tiers = sorted(rule.late_tiers, key=lambda t: t.min_minutes, reverse=True)

    def late_penalty(minutes: int) -> Decimal:
        tier = next((t for t in tiers if minutes >= t.min_minutes), None)
        return Decimal(tier.deduction) if tier else Decimal("0")

    full = Decimal(rule.full_score)
    if rule.mode == ScoreMode.direct:
        absent_deduction = full / rule.session_count if rule.session_count else Decimal("0")
        raw = full - sum((late_penalty(m) for m in late_list), Decimal("0")) - absent * absent_deduction
    else:
        session_full = Decimal(rule.session_full_score)
        raw_max = session_full * rule.session_count
        if not raw_max:
            return Decimal("0.00")
        raw_score = present * session_full + sum(
            (max(Decimal("0"), session_full - late_penalty(m)) for m in late_list), Decimal("0")
        )
        raw = raw_score / raw_max * full

    return max(Decimal("0"), min(full, raw)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@router.post("/recalculate/{class_id}", response_model=list[StudentScoreOut])
def recalculate_scores(
    class_id: int,
    db: Session = Depends(get_db),
    _teacher: User = Depends(require_teacher),
):
    enrollments = db.query(Enrollment).filter(Enrollment.class_id == class_id).all()
    results = []
    for e in enrollments:
        computed = _compute_score_for_student(db, class_id, e.student_id)

        score_row = (
            db.query(StudentScore)
            .filter(StudentScore.class_id == class_id, StudentScore.student_id == e.student_id)
            .first()
        )
        if score_row is None:
            score_row = StudentScore(class_id=class_id, student_id=e.student_id, score=computed)
            db.add(score_row)
        elif not score_row.is_manual_override:
            score_row.score = computed

        db.flush()
        results.append(score_row)

    db.commit()

    output = []
    for row in results:
        student = db.query(Student).filter(Student.id == row.student_id).first()
        output.append(
            StudentScoreOut(
                id=row.id,
                student_id=row.student_id,
                class_id=row.class_id,
                score=row.score,
                note=row.note,
                is_manual_override=row.is_manual_override,
                updated_at=row.updated_at,
                student_name=student.full_name if student else None,
                student_code=student.student_code if student else None,
            )
        )
    return output


@router.get("/class/{class_id}", response_model=list[StudentScoreOut])
def list_class_scores(
    class_id: int,
    db: Session = Depends(get_db),
    _teacher: User = Depends(require_teacher),
):
    rows = db.query(StudentScore).filter(StudentScore.class_id == class_id).all()
    output = []
    for row in rows:
        student = db.query(Student).filter(Student.id == row.student_id).first()
        output.append(
            StudentScoreOut(
                id=row.id,
                student_id=row.student_id,
                class_id=row.class_id,
                score=row.score,
                note=row.note,
                is_manual_override=row.is_manual_override,
                updated_at=row.updated_at,
                student_name=student.full_name if student else None,
                student_code=student.student_code if student else None,
            )
        )
    return output


@router.put("/class/{class_id}/student/{student_id}", response_model=StudentScoreOut)
def override_student_score(
    class_id: int,
    student_id: int,
    payload: StudentScoreOverride,
    db: Session = Depends(get_db),
    _teacher: User = Depends(require_teacher),
):
    row = (
        db.query(StudentScore)
        .filter(StudentScore.class_id == class_id, StudentScore.student_id == student_id)
        .first()
    )
    if row is None:
        row = StudentScore(class_id=class_id, student_id=student_id)
        db.add(row)

    row.score = payload.score
    row.note = payload.note
    row.is_manual_override = payload.manual
    db.commit()
    db.refresh(row)

    student = db.query(Student).filter(Student.id == student_id).first()
    return StudentScoreOut(
        id=row.id,
        student_id=row.student_id,
        class_id=row.class_id,
        score=row.score,
        note=row.note,
        is_manual_override=row.is_manual_override,
        updated_at=row.updated_at,
        student_name=student.full_name if student else None,
        student_code=student.student_code if student else None,
    )


@router.get("/me/{class_id}", response_model=StudentScoreOut | None)
def get_my_score(
    class_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    student = current_user.student_profile
    if student is None:
        raise HTTPException(status_code=404, detail="ไม่พบโปรไฟล์นักศึกษาของบัญชีนี้")

    row = (
        db.query(StudentScore)
        .filter(StudentScore.class_id == class_id, StudentScore.student_id == student.id)
        .first()
    )
    if row is None:
        return None

    return StudentScoreOut(
        id=row.id,
        student_id=row.student_id,
        class_id=row.class_id,
        score=row.score,
        note=row.note,
        is_manual_override=row.is_manual_override,
        updated_at=row.updated_at,
        student_name=student.full_name,
        student_code=student.student_code,
    )
