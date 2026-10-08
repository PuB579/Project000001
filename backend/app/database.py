"""
การเชื่อมต่อฐานข้อมูล MySQL/MariaDB ผ่าน SQLAlchemy + PyMySQL

สำคัญ: ฐานข้อมูลถูกสร้างไว้แล้วจริงผ่าน phpMyAdmin (ดู project_face_ai_db.sql)
โค้ดนี้ "ไม่" เรียก Base.metadata.create_all() แบบ auto-create ทุกอย่าง
เพราะตารางมีอยู่แล้ว การเรียก create_all() จะแค่เติมตารางที่ขาดหายไป (ถ้ามี)
ไม่ไปลบ/แก้ไขตารางเดิมที่มีอยู่ ถ้าชื่อคอลัมน์ในโมเดลไม่ตรงกับฐานข้อมูลจริง
จะไม่มี error ตอน startup แต่จะ error ตอนรันคำสั่ง (runtime) แทน
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
