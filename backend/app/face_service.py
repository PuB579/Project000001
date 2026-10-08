"""
Face recognition service
=========================
ใช้ไลบรารี `face_recognition` (อิงบน dlib) แบบ "optional dependency"
ถ้ายังไม่ได้ติดตั้ง (เช่นตอน dev เร็วๆ บน Windows ที่ลง dlib ยาก) ระบบ API
ส่วนอื่นจะยังทำงานได้ปกติ มีแค่ endpoint ที่เกี่ยวกับใบหน้าเท่านั้นที่จะโยน
FaceServiceUnavailable ออกมา (กลายเป็น HTTP 503 ที่ router)

ค่า embedding ถูกเก็บเป็น TEXT (JSON) ในคอลัมน์ face_profiles.embedding
เพราะ MySQL ไม่มีชนิดข้อมูล array/vector แบบ PostgreSQL
"""
from __future__ import annotations

import json

import numpy as np

try:
    import face_recognition  # type: ignore

    FACE_RECOGNITION_AVAILABLE = True
except ImportError:  # pragma: no cover - ขึ้นกับเครื่องที่รัน
    face_recognition = None  # type: ignore
    FACE_RECOGNITION_AVAILABLE = False

from app.config import settings


class FaceServiceUnavailable(Exception):
    """ยกขึ้นเมื่อยังไม่ได้ติดตั้ง face_recognition/dlib บนเครื่องนี้"""


class NoFaceDetected(Exception):
    """ไม่พบใบหน้าในรูปที่อัปโหลดมา"""


class MultipleFacesDetected(Exception):
    """พบใบหน้ามากกว่า 1 ใบหน้าในรูปเดียว"""


def _ensure_available() -> None:
    if not FACE_RECOGNITION_AVAILABLE:
        raise FaceServiceUnavailable(
            "ยังไม่ได้ติดตั้งไลบรารีจดจำใบหน้า (face_recognition/dlib) บนเซิร์ฟเวอร์นี้ "
            "โปรดติดตั้งตามขั้นตอนใน README.md (pip install dlib-bin แล้วตามด้วย "
            "pip install --no-deps face_recognition==1.3.0)"
        )


def encode_face(image_bytes: bytes) -> list[float]:
    """
    รับไบต์ของรูปภาพ -> คืนค่า face encoding (128 มิติ) เป็น list[float]
    ถ้าไม่พบใบหน้า -> NoFaceDetected
    ถ้าพบมากกว่า 1 ใบหน้า -> MultipleFacesDetected
    """
    _ensure_available()

    import io
    from PIL import Image

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    np_image = np.array(image)

    face_locations = face_recognition.face_locations(np_image)
    if len(face_locations) == 0:
        raise NoFaceDetected("ไม่พบใบหน้าในรูปภาพที่อัปโหลด กรุณาถ่ายใหม่ให้เห็นใบหน้าชัดเจน")
    if len(face_locations) > 1:
        raise MultipleFacesDetected("พบมากกว่า 1 ใบหน้าในรูปเดียวกัน กรุณาถ่ายให้มีใบหน้าเดียว")

    encodings = face_recognition.face_encodings(np_image, known_face_locations=face_locations)
    return encodings[0].tolist()


def embedding_to_json(encoding: list[float]) -> str:
    return json.dumps(encoding)


def embedding_from_json(text: str) -> list[float]:
    return json.loads(text)


def _distance_to_confidence(distance: float) -> float:
    """
    แปลง face distance (ยิ่งน้อยยิ่งเหมือน, ปกติ 0.0-1.0+) ให้เป็น confidence
    แบบเปอร์เซ็นต์ (0-100, ยิ่งมากยิ่งมั่นใจ) เพื่อเทียบกับ
    classes.face_confidence_threshold ได้ตรงไปตรงมา
    """
    confidence = (1.0 - min(distance, 1.0)) * 100
    return max(0.0, round(confidence, 2))


def find_best_match(
    probe_encoding: list[float],
    candidates: list[tuple[int, list[float]]],
) -> tuple[int | None, float]:
    """
    candidates: list ของ (student_id, embedding)
    คืนค่า (student_id ที่ตรงที่สุด หรือ None ถ้าไม่มีผู้สมัครเลย, confidence เปอร์เซ็นต์)
    """
    _ensure_available()

    if not candidates:
        return None, 0.0

    probe = np.array(probe_encoding)
    known_encodings = [np.array(enc) for _, enc in candidates]

    distances = face_recognition.face_distance(known_encodings, probe)
    best_index = int(np.argmin(distances))
    best_distance = float(distances[best_index])
    best_student_id = candidates[best_index][0]

    return best_student_id, _distance_to_confidence(best_distance)


def is_confident_enough(confidence: float, threshold: int) -> bool:
    return confidence >= threshold
