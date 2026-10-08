"""
Seed script — สร้างข้อมูลตัวอย่างสำหรับทดสอบระบบ
รันด้วย: python seed.py

จะสร้าง:
- ภาควิชา 1 ภาค (วิทยาการคอมพิวเตอร์)
- อาจารย์ 1 คน: teacher01@example.com / Teach123!
- นักศึกษา 1 คน: student01@example.com / Passw0rd!
- รายวิชา 5 วิชา (CS-201 ถึง CS-205) แต่ละวิชามี 1 คลาส ภาคเรียน 1/2568
- ลงทะเบียนนักศึกษาในทุกคลาส
"""
from app.database import SessionLocal
from app.models import Class, Course, Department, Enrollment, Student, Teacher, User, UserRole
from app.security import hash_password


def run():
    db = SessionLocal()
    try:
        department = db.query(Department).filter(Department.name == "วิทยาการคอมพิวเตอร์").first()
        if department is None:
            department = Department(
                name="วิทยาการคอมพิวเตอร์",
                description="ภาควิชาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยแม่โจ้",
            )
            db.add(department)
            db.flush()
            print(f"✔ สร้างภาควิชา: {department.name}")

        teacher_user = db.query(User).filter(User.email == "teacher01@example.com").first()
        if teacher_user is None:
            teacher_user = User(
                email="teacher01@example.com",
                password_hash=hash_password("Teach123!"),
                role=UserRole.teacher,
            )
            db.add(teacher_user)
            db.flush()

            teacher = Teacher(
                user_id=teacher_user.id,
                teacher_code="T0001",
                first_name="สมชาย",
                last_name="ใจดี",
                department_id=department.id,
                position="อาจารย์ประจำ",
            )
            db.add(teacher)
            db.flush()
            print(f"✔ สร้างอาจารย์: {teacher_user.email} / Teach123!")
        else:
            teacher = teacher_user.teacher_profile

        student_user = db.query(User).filter(User.email == "student01@example.com").first()
        if student_user is None:
            student_user = User(
                email="student01@example.com",
                password_hash=hash_password("Passw0rd!"),
                role=UserRole.student,
            )
            db.add(student_user)
            db.flush()

            student = Student(
                user_id=student_user.id,
                student_code="6500001",
                first_name="สมหญิง",
                last_name="ตั้งใจเรียน",
                faculty="วิทยาศาสตร์",
                major="วิทยาการคอมพิวเตอร์",
            )
            db.add(student)
            db.flush()
            print(f"✔ สร้างนักศึกษา: {student_user.email} / Passw0rd!")
        else:
            student = student_user.student_profile

        course_defs = [
            ("CS-201", "โครงสร้างข้อมูลและอัลกอริทึม"),
            ("CS-202", "ระบบฐานข้อมูล"),
            ("CS-203", "การพัฒนาเว็บแอปพลิเคชัน"),
            ("CS-204", "ระบบปฏิบัติการ"),
            ("CS-205", "ปัญญาประดิษฐ์เบื้องต้น"),
        ]

        for code, name in course_defs:
            course = db.query(Course).filter(Course.course_code == code).first()
            if course is None:
                course = Course(
                    course_code=code,
                    course_name=name,
                    teacher_id=teacher.id,
                    department_id=department.id,
                    credit=3,
                )
                db.add(course)
                db.flush()
                print(f"✔ สร้างรายวิชา: {code} - {name}")

            class_ = db.query(Class).filter(Class.course_id == course.id).first()
            if class_ is None:
                class_ = Class(
                    course_id=course.id,
                    class_code=f"{code}-SEC1",
                    class_name=f"{name} (กลุ่ม 1)",
                    semester="1",
                    academic_year="2568",
                )
                db.add(class_)
                db.flush()
                print(f"  ↳ สร้างคลาส: {class_.class_code}")

            enrollment = (
                db.query(Enrollment)
                .filter(Enrollment.class_id == class_.id, Enrollment.student_id == student.id)
                .first()
            )
            if enrollment is None:
                db.add(Enrollment(class_id=class_.id, student_id=student.id))
                print(f"  ↳ ลงทะเบียน {student.student_code} ในคลาส {class_.class_code}")

        db.commit()
        print("\n เสร็จสิ้น! ข้อมูลตัวอย่างพร้อมใช้งาน")
        print("   อาจารย์: teacher01@example.com / Teach123!")
        print("   นักศึกษา: student01@example.com / Passw0rd!")

    finally:
        db.close()


if __name__ == "__main__":
    run()
