"""
ฟังก์ชันกลางเกี่ยวกับช่วงเวลาเช็คชื่อและสถานะ "ที่แท้จริง" ของนักศึกษาแต่ละคนในแต่ละคาบ

ตาราง attendance_details มีแถวเฉพาะคนที่เช็คชื่อแล้ว (หรืออาจารย์บันทึกให้)
คนที่ไม่มาเช็คชื่อเลยจะไม่มีแถว จึงต้องอนุมานเอง:
- หมดช่วงเวลาเช็คชื่อแล้วแต่ไม่มีแถว  -> absent
- อยู่ในช่วงเวลาเช็คชื่อ              -> open
- ยังไม่ถึงเวลาเปิดเช็คชื่อ            -> upcoming
"""
import datetime as dt

from app.models import AttendanceDetail, AttendanceSession, Class

EFFECTIVE_OPEN = "open"
EFFECTIVE_UPCOMING = "upcoming"


def checkin_window(
    session: AttendanceSession, class_: Class
) -> tuple[dt.datetime | None, dt.datetime | None]:
    """ช่วงเวลาที่เปิดให้เช็คชื่อ: [start - open_offset, start + close_offset] ไม่เกิน end_time"""
    if session.start_time is None:
        return None, None
    start_dt = dt.datetime.combine(session.session_date, session.start_time)
    open_dt = start_dt - dt.timedelta(minutes=class_.checkin_open_offset_minutes)
    close_dt = start_dt + dt.timedelta(minutes=class_.checkin_close_offset_minutes)
    if session.end_time is not None:
        close_dt = min(close_dt, dt.datetime.combine(session.session_date, session.end_time))
    return open_dt, close_dt


def effective_status(
    session: AttendanceSession,
    class_: Class,
    detail: AttendanceDetail | None,
    now: dt.datetime,
) -> str:
    if detail is not None:
        return detail.status.value
    open_dt, close_dt = checkin_window(session, class_)
    if close_dt is None:
        # คาบที่ไม่มีเวลาเริ่ม: นับว่าขาดเมื่อผ่านวันนั้นไปแล้ว
        return "absent" if session.session_date < now.date() else EFFECTIVE_OPEN
    if now > close_dt:
        return "absent"
    if open_dt is not None and now < open_dt:
        return EFFECTIVE_UPCOMING
    return EFFECTIVE_OPEN


def late_minutes(session: AttendanceSession, check_in_time: dt.time | None) -> int | None:
    """จำนวนนาทีที่เช็คชื่อหลังเวลาเริ่มคาบ (0 ถ้าไม่สาย)"""
    if session.start_time is None or check_in_time is None:
        return None
    start_dt = dt.datetime.combine(session.session_date, session.start_time)
    checkin_dt = dt.datetime.combine(session.session_date, check_in_time)
    return max(0, int((checkin_dt - start_dt).total_seconds() // 60))
