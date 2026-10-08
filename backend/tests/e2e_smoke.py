"""
End-to-end smoke test ของ backend ทั้งระบบ — ยิง HTTP จริงไปที่เซิร์ฟเวอร์ที่รันอยู่

วิธีใช้ (ต้องรัน uvicorn และ seed.py ไว้ก่อน):
    python tests/e2e_smoke.py [path/to/face.jpg]

ถ้าไม่ระบุรูป จะใช้รูปล่าสุดใน uploads/faces (ต้องเป็นหน้าของ student01 ที่อนุมัติแล้ว)
ข้อมูลที่สร้างระหว่างทดสอบจะขึ้นต้นด้วย TEST- และถูกลบทิ้งตอนจบ
"""
import datetime as dt
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

BASE = "http://127.0.0.1:8000"
TAG = "TEST-" + uuid.uuid4().hex[:6]
results: list[tuple[bool, str]] = []


def call(method, path, token=None, json_body=None, form=None, file_bytes=None):
    headers = {}
    data = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if json_body is not None:
        data = json.dumps(json_body).encode()
        headers["Content-Type"] = "application/json"
    elif form is not None:
        data = urllib.parse.urlencode(form).encode()
    elif file_bytes is not None:
        boundary = uuid.uuid4().hex
        data = (
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"face.jpg\"\r\n"
            f"Content-Type: image/jpeg\r\n\r\n"
        ).encode() + file_bytes + f"\r\n--{boundary}--\r\n".encode()
        headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            body = r.read().decode()
            return r.status, json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return e.code, json.loads(body)
        except ValueError:
            return e.code, body


def check(name, method, path, expect, **kw):
    code, body = call(method, path, **kw)
    ok = code == expect
    detail = "" if ok else f"  -> ได้ {code}: {str(body)[:200]}"
    results.append((ok, name))
    print(f"[{'PASS' if ok else 'FAIL'}] {name} ({method} {path} คาด {expect}){detail}")
    return body if ok else None


def expect_check(name, actual, expected):
    ok = actual == expected
    results.append((ok, name))
    print(f"[{'PASS' if ok else 'FAIL'}] {name}" + ("" if ok else f"  -> ได้ {actual!r} คาด {expected!r}"))


def raw_status(path, token):
    """status code ของ endpoint ที่ตอบเป็นไฟล์ (ไม่ใช่ JSON)"""
    req = urllib.request.Request(BASE + path, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req) as r:
            r.read()
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def login(email, password):
    code, body = call("POST", "/auth/token", form={"username": email, "password": password})
    assert code == 200, f"login {email} ไม่สำเร็จ: {code} {body}"
    return body["access_token"]


def main():
    face_path = Path(sys.argv[1]) if len(sys.argv) > 1 else max(
        Path("uploads/faces").glob("*.jpg"), key=lambda p: p.stat().st_mtime
    )
    face = face_path.read_bytes()
    now = dt.datetime.now()
    today = now.date().isoformat()

    T = login("teacher01@example.com", "Teach123!")
    S = login("student01@example.com", "Passw0rd!")
    teacher_id = call("GET", "/teachers/me", T)[1]["id"]
    student_id = call("GET", "/students/me", S)[1]["id"]

    print("\n== สิทธิ์การเข้าถึง ==")
    check("ไม่มี token -> 401", "GET", "/auth/me", 401)
    check("นักศึกษาสร้างรายวิชาไม่ได้", "POST", "/courses", 403, token=S,
          json_body={"course_code": TAG, "course_name": TAG})
    check("นักศึกษาเปิดคาบไม่ได้", "POST", "/attendance/sessions", 403, token=S, json_body={"class_id": 1})

    print("\n== ภาควิชา ==")
    dep = check("สร้างภาควิชา", "POST", "/departments", 201, token=T, json_body={"name": TAG + "-dept"})
    dep_id = dep and dep["id"]
    if dep_id:
        check("แก้ภาควิชา", "PUT", f"/departments/{dep_id}", 200, token=T,
              json_body={"name": TAG + "-dept2", "description": "x"})
        check("ดูภาควิชา", "GET", f"/departments/{dep_id}", 200, token=T)

    print("\n== อาจารย์ / นักศึกษา ==")
    t2 = check("สร้างอาจารย์", "POST", "/teachers", 201, token=T, json_body={
        "email": f"{TAG.lower()}-t@example.com", "password": "Teach123!", "teacher_code": TAG,
        "first_name": "ทดสอบ", "last_name": "อาจารย์", "department_id": dep_id})
    t2_id = t2 and t2["id"]
    if t2_id:
        check("แก้อาจารย์", "PUT", f"/teachers/{t2_id}", 200, token=T, json_body={"position": "ผศ."})
        check("อาจารย์ใหม่ login ได้", "POST", "/auth/token", 200,
              form={"username": f"{TAG.lower()}-t@example.com", "password": "Teach123!"})
    s2 = check("สร้างนักศึกษา", "POST", "/students", 201, token=T, json_body={
        "email": f"{TAG.lower()}-s@example.com", "password": "Passw0rd!", "student_code": TAG[:15],
        "first_name": "ทดสอบ", "last_name": "นักศึกษา"})
    s2_id = s2 and s2["id"]
    if s2_id:
        check("แก้นักศึกษา", "PUT", f"/students/{s2_id}", 200, token=T, json_body={"major": "CS"})
        check("อีเมลซ้ำต้องสร้างไม่ได้", "POST", "/students", 400, token=T, json_body={
            "email": f"{TAG.lower()}-s@example.com", "password": "x", "student_code": TAG[:14] + "X",
            "first_name": "a", "last_name": "b"})

    print("\n== รายวิชา / คลาส / ลงทะเบียน ==")
    course = check("สร้างรายวิชา", "POST", "/courses", 201, token=T, json_body={
        "course_code": TAG, "course_name": TAG + " วิชาทดสอบ", "teacher_id": teacher_id, "credit": 3})
    course_id = course and course["id"]
    class_id = None
    if course_id:
        check("แก้รายวิชา", "PUT", f"/courses/{course_id}", 200, token=T, json_body={
            "course_code": TAG, "course_name": TAG + " แก้แล้ว", "teacher_id": teacher_id})
        cls = check("สร้างคลาส", "POST", "/classes", 201, token=T, json_body={
            "course_id": course_id, "class_code": TAG + "-SEC1", "late_threshold_minutes": 5,
            "checkin_close_offset_minutes": 30})
        class_id = cls and cls["id"]
    enr_s1 = enr_s2 = None
    if class_id:
        check("แก้คลาส", "PUT", f"/classes/{class_id}", 200, token=T, json_body={"semester": "1"})
        e = check("ลงทะเบียน student01", "POST", f"/classes/{class_id}/students", 201, token=T,
                  json_body={"class_id": class_id, "student_id": student_id})
        enr_s1 = e and e["id"]
        if s2_id:
            e = check("ลงทะเบียนนักศึกษาทดสอบ", "POST", f"/classes/{class_id}/students", 201, token=T,
                      json_body={"class_id": class_id, "student_id": s2_id})
            enr_s2 = e and e["id"]
        check("ลงทะเบียนซ้ำต้องไม่ได้", "POST", f"/classes/{class_id}/students", 400, token=T,
              json_body={"class_id": class_id, "student_id": student_id})
        check("รายชื่อในคลาส", "GET", f"/classes/{class_id}/students", 200, token=T)

    if class_id:
        print("\n== เปิดคาบ + เช็คชื่อด้วยใบหน้า ==")
        sess = check("เปิดคาบวันนี้", "POST", "/attendance/sessions", 201, token=T, json_body={"class_id": class_id})
        sess_id = sess and sess["id"]
        if sess_id:
            body = check("เช็คชื่อด้วยใบหน้า", "POST", f"/attendance/checkin?session_id={sess_id}", 200,
                         token=S, file_bytes=face)
            if body:
                print(f"       สถานะ={body['status']} ความมั่นใจ={body['confidence']}")
            check("เช็คชื่อซ้ำต้องไม่ได้", "POST", f"/attendance/checkin?session_id={sess_id}", 400,
                  token=S, file_bytes=face)

        yesterday = (now - dt.timedelta(days=1)).date().isoformat()
        old = check("เปิดคาบของเมื่อวาน", "POST", "/attendance/sessions", 201, token=T,
                    json_body={"class_id": class_id, "session_date": yesterday, "start_time": "09:00:00"})
        if old:
            check("เช็คชื่อคาบเมื่อวานต้องไม่ได้", "POST", f"/attendance/checkin?session_id={old['id']}", 400,
                  token=S, file_bytes=face)

        future = now + dt.timedelta(minutes=60)
        if future.date() == now.date():
            f = check("เปิดคาบที่ยังไม่ถึงเวลา", "POST", "/attendance/sessions", 201, token=T, json_body={
                "class_id": class_id, "session_date": today, "start_time": future.strftime("%H:%M:%S")})
            if f:
                check("เช็คชื่อก่อนเวลาเปิดต้องไม่ได้", "POST", f"/attendance/checkin?session_id={f['id']}",
                      400, token=S, file_bytes=face)
        past = now - dt.timedelta(minutes=45)
        if past.date() == now.date():
            p = check("เปิดคาบที่เริ่มไป 45 นาทีแล้ว", "POST", "/attendance/sessions", 201, token=T, json_body={
                "class_id": class_id, "session_date": today, "start_time": past.strftime("%H:%M:%S")})
            if p:
                check("เช็คชื่อหลังหมดเวลา 30 นาทีต้องไม่ได้", "POST",
                      f"/attendance/checkin?session_id={p['id']}", 400, token=S, file_bytes=face)

        print("\n== เช็คชื่อแบบ manual + สรุปผล ==")
        if sess_id and enr_s2:
            check("อาจารย์เช็คชื่อ manual (late)", "POST", "/attendance/manual", 200, token=T,
                  json_body={"session_id": sess_id, "enrollment_id": enr_s2, "status": "late"})
            check("อาจารย์แก้สถานะเป็น absent", "POST", "/attendance/manual", 200, token=T,
                  json_body={"session_id": sess_id, "enrollment_id": enr_s2, "status": "absent"})
        check("ดูการเช็คชื่อทั้งคลาส", "GET", f"/attendance/class/{class_id}", 200, token=T)
        summary = check("สรุปการเข้าเรียน", "GET", f"/attendance/summary/{class_id}", 200, token=T)
        if summary is not None:
            print("       " + json.dumps(summary, ensure_ascii=False)[:300])
        check("ประวัติของนักศึกษา", "GET", "/attendance/history", 200, token=S)

        print("\n== คะแนน ==")
        check("ตั้งกฎคะแนน", "PUT", f"/scores/rules/{class_id}", 200, token=T, json_body={
            "class_id": class_id, "mode": "per_session", "full_score": 10, "session_count": 4,
            "session_full_score": 1, "pass_threshold": 0.8,
            "late_tiers": [{"min_minutes": 5, "deduction": 0.25}, {"min_minutes": 15, "deduction": 0.5}]})
        check("คำนวณคะแนน", "POST", f"/scores/recalculate/{class_id}", 200, token=T)
        scores = check("ดูคะแนนทั้งคลาส", "GET", f"/scores/class/{class_id}", 200, token=T)
        if scores is not None:
            print("       " + json.dumps(scores, ensure_ascii=False, default=str)[:300])
        check("นักศึกษาดูคะแนนตัวเอง", "GET", f"/scores/me/{class_id}", 200, token=S)
        if s2_id:
            check("อาจารย์แก้คะแนนเอง", "PUT", f"/scores/class/{class_id}/student/{s2_id}", 200, token=T,
                  json_body={"score": 7.5, "note": "test"})

        print("\n== สถานะที่อนุมานได้ (คนที่ไม่ได้เช็คชื่อ) ==")
        rows = check("ทุกแถวของคลาส (อาจารย์)", "GET", f"/attendance/records?class_id={class_id}", 200, token=T)
        if rows is not None:
            mine = sorted(r["status"] for r in rows if r["student_id"] == student_id)
            # วันนี้เช็คชื่อได้ 1, เมื่อวาน + คาบที่หมดเวลา = ขาด 2, คาบที่ยังไม่ถึงเวลา = upcoming 1
            expect = sorted(["present", "absent", "absent"] + (["upcoming"] if future.date() == now.date() else []))
            if past.date() != now.date():
                expect.remove("absent")
            expect_check("สถานะของ student01 ครบทุกคาบ", mine, expect)
        check("นักศึกษาดู records ไม่ได้", "GET", "/attendance/records", 403, token=S)
        mys = check("คาบของฉันย้อนหลัง (นักศึกษา)", "GET",
                    f"/attendance/my-sessions?start={yesterday}&end={today}", 200, token=S)
        if mys is not None:
            y = [s["status"] for s in mys if s["class_id"] == class_id and s["session_date"] == yesterday]
            expect_check("คาบเมื่อวานที่ไม่ได้เช็คชื่อ = ขาด", y, ["absent"])

        print("\n== สูตรคะแนน (ตรงกับหน้าเว็บ) ==")
        rec = check("คำนวณคะแนนอีกครั้ง", "POST", f"/scores/recalculate/{class_id}", 200, token=T)
        if rec is not None:
            s1 = next(r for r in rec if r["student_id"] == student_id)
            # per_session: มา 1 จาก 4 คาบ ครั้งละ 1 -> 1/4 x 10 = 2.50
            expect_check("คะแนน student01 = 2.50", s1["score"], "2.50")
        if s2_id:
            r = check("บันทึกคะแนนแบบไม่ใช่ manual", "PUT", f"/scores/class/{class_id}/student/{s2_id}", 200,
                      token=T, json_body={"score": 0, "manual": False})
            if r:
                expect_check("is_manual_override = false", r["is_manual_override"], False)

        print("\n== ข้อมูลประกอบสำหรับหน้าเว็บ ==")
        mine_classes = check("คลาสของอาจารย์", "GET", "/classes/mine", 200, token=T)
        if mine_classes is not None:
            c = next((c for c in mine_classes if c["id"] == class_id), None)
            expect_check("คลาสมีชื่อวิชาและจำนวนนักศึกษา", c and (c["course_code"], c["student_count"]), (TAG, 2))
        studs = check("รายชื่อนักศึกษา", "GET", "/students", 200, token=T)
        if studs is not None:
            s1 = next(s for s in studs if s["id"] == student_id)
            expect_check("มีสถานะใบหน้า", s1["face_status"], "approved")
            status_code = raw_status(f"/face/{s1['face_profile_id']}/image", T)
            expect_check("อาจารย์ดูรูปใบหน้าได้", status_code, 200)

    print("\n== แก้ข้อมูลตัวเอง / รหัสผ่าน ==")
    me = call("GET", "/students/me", S)[1]
    check("นักศึกษาแก้เบอร์โทรตัวเอง", "PUT", "/students/me", 200, token=S, json_body={"phone": "0800000000"})
    check("คืนค่าเบอร์โทรเดิม", "PUT", "/students/me", 200, token=S, json_body={"phone": me["phone"]})
    tme = call("GET", "/teachers/me", T)[1]
    check("อาจารย์แก้ตำแหน่งตัวเอง", "PUT", "/teachers/me", 200, token=T, json_body={"position": TAG})
    check("คืนค่าตำแหน่งเดิม", "PUT", "/teachers/me", 200, token=T, json_body={"position": tme["position"]})
    check("รหัสผ่านเดิมผิด -> 400", "POST", "/auth/change-password", 400, token=S,
          json_body={"current_password": "wrong", "new_password": "abcdef"})
    if s2_id:
        S2 = login(f"{TAG.lower()}-s@example.com", "Passw0rd!")
        check("เปลี่ยนรหัสผ่าน", "POST", "/auth/change-password", 204, token=S2,
              json_body={"current_password": "Passw0rd!", "new_password": "NewPass1!"})
        check("login ด้วยรหัสผ่านใหม่", "POST", "/auth/token", 200,
              form={"username": f"{TAG.lower()}-s@example.com", "password": "NewPass1!"})

    print("\n== ประกาศ ==")
    ann = check("สร้างประกาศ", "POST", "/announcements", 201, token=T,
                json_body={"class_id": class_id, "title": TAG, "body": "ทดสอบ", "pinned": False})
    check("นักศึกษาสร้างประกาศไม่ได้", "POST", "/announcements", 403, token=S,
          json_body={"title": TAG, "body": "x", "pinned": False})
    if ann:
        check("แก้ประกาศ", "PUT", f"/announcements/{ann['id']}", 200, token=T, json_body={"pinned": True})
        check("นักศึกษาเห็นประกาศ", "GET", f"/announcements/{ann['id']}", 200, token=S)
        check("ลบประกาศ", "DELETE", f"/announcements/{ann['id']}", 204, token=T)

    print("\n== ลบข้อมูลทดสอบ ==")
    if class_id and enr_s1:
        check("ถอนรายวิชา student01", "DELETE", f"/classes/{class_id}/students/{enr_s1}", 204, token=T)
    if class_id:
        check("ลบคลาส (มีคาบ/เช็คชื่อ/คะแนนอยู่)", "DELETE", f"/classes/{class_id}", 204, token=T)
    if course_id:
        check("ลบรายวิชา", "DELETE", f"/courses/{course_id}", 204, token=T)
    if s2_id:
        check("ลบนักศึกษา", "DELETE", f"/students/{s2_id}", 204, token=T)
    if t2_id:
        check("ลบอาจารย์", "DELETE", f"/teachers/{t2_id}", 204, token=T)
    if dep_id:
        check("ลบภาควิชา", "DELETE", f"/departments/{dep_id}", 204, token=T)

    failed = [n for ok, n in results if not ok]
    print(f"\nผ่าน {len(results) - len(failed)}/{len(results)}")
    for n in failed:
        print("  ✗", n)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
