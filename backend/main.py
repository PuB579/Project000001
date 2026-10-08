"""
CS FaceAttend — Backend API (FastAPI + MySQL/MariaDB)
======================================================
เขียนใหม่ทั้งหมดให้ตรงกับฐานข้อมูลจริงที่สร้างผ่าน phpMyAdmin
(project_face_ai_db) แบบ column-level ทุกตาราง

รันด้วย:
    uvicorn main:app --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    announcements,
    attendance,
    auth,
    classes,
    courses,
    departments,
    face,
    scores,
    students,
    teachers,
)

app = FastAPI(
    title="CS FaceAttend API",
    description="ระบบเช็คชื่อเข้าเรียนด้วยการสแกนใบหน้า — ภาควิชาวิทยาการคอมพิวเตอร์",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(departments.router)
app.include_router(teachers.router)
app.include_router(students.router)
app.include_router(courses.router)
app.include_router(classes.router)
app.include_router(face.router)
app.include_router(attendance.router)
app.include_router(scores.router)
app.include_router(announcements.router)


@app.get("/")
def root():
    return {
        "name": "CS FaceAttend API",
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
