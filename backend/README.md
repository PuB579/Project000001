# CS FaceAttend — Backend (เขียนใหม่ทั้งหมด v2)

Backend API สำหรับระบบเช็คชื่อเข้าเรียนด้วยการสแกนใบหน้า (ภาควิชาวิทยาการคอมพิวเตอร์)
เขียนด้วย **FastAPI** + **MySQL/MariaDB** (เชื่อมต่อผ่าน SQLAlchemy + PyMySQL)

> **สำคัญ**: เวอร์ชันนี้เขียนใหม่ทั้งหมดให้ตรงกับฐานข้อมูลจริงที่สร้างผ่าน
> phpMyAdmin (`project_face_ai_db`) แบบ column-level ทุกตาราง (ไม่ใช่เดาจาก ER diagram อีกต่อไป)
> **backend ไม่สร้างตารางเอง** ฐานข้อมูลต้องมีอยู่แล้วก่อนรัน

---

## 1. โครงสร้างฐานข้อมูล (15 ตาราง)

ตรงกับไฟล์ `project_face_ai_db.sql` ที่ export จาก phpMyAdmin เป๊ะๆ:

| ตาราง | หน้าที่ |
|---|---|
| `users` | บัญชีผู้ใช้ (email, password_hash, role) |
| `departments` | ภาควิชา |
| `students` | ข้อมูลนักศึกษา (แยกจาก users) |
| `teachers` | ข้อมูลอาจารย์ (แยกจาก users) |
| `courses` | รายวิชา |
| `classes` | คลาสเรียน (ของแต่ละวิชา) พร้อมค่า config การเช็คชื่อรายคลาส |
| `enrollments` | การลงทะเบียนเรียนของนักศึกษา |
| `attendance_sessions` | คาบเรียนที่เปิดให้เช็คชื่อ |
| `attendance_details` | ผลการเช็คชื่อแต่ละคน แต่ละคาบ (มีคอลัมน์ `method`: face/manual) |
| `face_profiles` | รูปใบหน้า + embedding ของนักศึกษา |
| `face_approvals` | สถานะการอนุมัติใบหน้าโดยอาจารย์ |
| `attendance_score_rules` | เกณฑ์การให้คะแนนเช็คชื่อ ต่อคลาส |
| `late_tiers` | ระดับการหักคะแนนตามความล่าช้า |
| `student_scores` | คะแนนเช็คชื่อของนักศึกษาแต่ละคน ต่อคลาส |
| `announcements` | ประกาศจากอาจารย์ |

ค่า config ต่อคลาส (ในตาราง `classes`) ที่ backend อ่านมาใช้จริง (ไม่ใช้ค่า global แล้ว):
- `checkin_open_offset_minutes`, `checkin_close_offset_minutes`
- `late_threshold_minutes` — ใช้ตัดสิน present/late
- `face_confidence_threshold` — ใช้ตัดสินว่าความมั่นใจของใบหน้าพอหรือไม่
- `allow_manual_fallback` — อนุญาตให้เช็คชื่อแบบ manual หรือไม่

---

## 2. การติดตั้ง

### 2.1 เตรียม Python ที่เข้ากันได้

แนะนำ **Python 3.11 หรือ 3.12** (หลีกเลี่ยง Python 3.14 เพราะ numpy/dlib
ยังไม่มี prebuilt wheel ให้ ต้องคอมไพล์เองซึ่งมักพังบน Windows)

ถ้าเครื่องมีหลายเวอร์ชัน ใช้ Windows `py` launcher เลือกเวอร์ชันตรงๆ:

```powershell
py -3.12 -m venv .venv
.venv\Scripts\activate
```

ถ้ายังไม่มี Python เลย ("Python was not found..." ที่ Windows เด้ง Microsoft Store):
1. โหลด Python 3.12 จาก https://www.python.org/downloads/ (อย่าโหลดจาก Store)
2. ตอนติดตั้ง ติ๊ก "Add python.exe to PATH" ด้วย
3. หรือถ้าไม่อยากติดตั้งใหม่ ปิด App execution alias ที่
   Settings > Apps > Advanced app settings > App execution aliases

### 2.2 ติดตั้ง dependencies หลัก

```bash
pip install -r requirements.txt
```

### 2.3 ติดตั้งระบบจดจำใบหน้า (แยกต่างหาก)

`dlib` ตัวจริงต้องคอมไพล์จาก source (ต้องมี CMake + Visual Studio Build Tools)
ให้ใช้ `dlib-bin` (prebuilt wheel) แทนเพื่อความง่าย:

```bash
pip install dlib-bin
pip install --no-deps face_recognition==1.3.0
```

> ถ้ายังไม่ติดตั้ง 2 บรรทัดนี้ ระบบ API ส่วนอื่นยังใช้งานได้ปกติ
> จะ error (HTTP 503) เฉพาะตอนเรียก endpoint ที่เกี่ยวกับใบหน้าเท่านั้น

### 2.4 ตั้งค่าการเชื่อมต่อฐานข้อมูล

คัดลอก `.env.example` เป็น `.env` แล้วแก้ `DATABASE_URL` ให้ตรงกับฐานข้อมูลจริงของคุณ
(เช่น ถ้าใช้ XAMPP/phpMyAdmin ปกติ user คือ `root` ไม่มีรหัสผ่าน):

```
DATABASE_URL=mysql+pymysql://root:@localhost:3306/project_face_ai_db?charset=utf8mb4
```

### 2.5 สร้างข้อมูลตัวอย่าง (ไม่บังคับ)

```bash
python seed.py
```

จะได้บัญชีทดสอบ:

| บทบาท | อีเมล | รหัสผ่าน |
|---|---|---|
| อาจารย์ | teacher01@example.com | Teach123! |
| นักศึกษา | student01@example.com | Passw0rd! |

### 2.6 รันเซิร์ฟเวอร์

```bash
uvicorn main:app --reload
```

เปิด http://127.0.0.1:8000/docs เพื่อดู API docs (Swagger UI)

---

## 3. ลำดับการทดสอบระบบ

1. Login เป็นอาจารย์ (`POST /auth/login`)
2. สร้าง/ดูคลาสเรียน ตั้งค่า `face_confidence_threshold`, `late_threshold_minutes` ตามต้องการ
3. เปิดคาบเรียน (`POST /attendance/sessions`)
4. Login เป็นนักศึกษา
5. อัปโหลดใบหน้า (`POST /face/register`) — สถานะจะเป็น pending
6. กลับไป login อาจารย์ อนุมัติใบหน้า (`POST /face/{id}/decision`)
7. นักศึกษาเช็คชื่อด้วยใบหน้า (`POST /attendance/checkin`)
8. อาจารย์ดูสรุปผล (`GET /attendance/summary/{class_id}`) และคำนวณคะแนน (`POST /scores/recalculate/{class_id}`)

---

## 4. Endpoint สรุป

| กลุ่ม | Base path |
|---|---|
| Auth | `/auth` |
| ภาควิชา | `/departments` |
| อาจารย์ | `/teachers` |
| นักศึกษา | `/students` |
| รายวิชา | `/courses` |
| คลาสเรียน + การลงทะเบียน | `/classes` |
| ใบหน้า + การอนุมัติ | `/face` |
| การเช็คชื่อ | `/attendance` |
| คะแนนเช็คชื่อ | `/scores` |
| ประกาศ | `/announcements` |

ดูรายละเอียด request/response ทั้งหมดได้ที่ `/docs` (Swagger) หลังรันเซิร์ฟเวอร์แล้ว

---

## 5. สิ่งที่ยังไม่ได้ทำ (รู้ไว้ก่อน)

- Refresh token (ตอนนี้มีแค่ access token อายุ 8 ชม.)
- Export ฝั่ง backend (ตอนนี้ frontend สร้างไฟล์ CSV / Excel (.xls) / PDF (ผ่านหน้าพิมพ์) เองจากข้อมูล JSON)
- Alembic migration (เพราะฐานข้อมูลถูกจัดการผ่าน phpMyAdmin โดยตรง)

## 6. การทดสอบ

ทดสอบ end-to-end กับ MySQL/MariaDB จริงแล้ว (ผ่าน 50/50) ด้วยสคริปต์:

```bash
# ต้องรัน uvicorn และ seed.py ไว้ก่อน และ student01 ต้องมีใบหน้าที่อนุมัติแล้ว
python tests/e2e_smoke.py [path/to/face.jpg]
```

ข้อมูลที่สร้างระหว่างทดสอบจะขึ้นต้นด้วย `TEST-` และถูกลบทิ้งตอนจบ
