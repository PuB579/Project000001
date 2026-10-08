// ตัวกลางสำหรับเรียก backend API และเก็บข้อมูลการ login
// ตั้งค่า URL ของ backend ได้ด้วย VITE_API_URL ในไฟล์ frontend/.env

export const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const TOKEN_KEY = "faceattend_token";
const USER_KEY = "faceattend_user";

// "จดจำฉัน" = localStorage (อยู่ข้ามการปิดเบราว์เซอร์), ไม่ติ๊ก = sessionStorage
function readStore(key) {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function saveSession(token, user, remember) {
  clearSession();
  try {
    const store = remember ? localStorage : sessionStorage;
    store.setItem(TOKEN_KEY, token);
    store.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // storage ถูกปิดไว้ — ใช้งานต่อได้จนกว่าจะรีเฟรชหน้า
  }
}

// อัปเดตข้อมูลผู้ใช้ที่เก็บไว้ (เช่น หลังแก้ชื่อในโปรไฟล์) โดยใช้ storage เดิม
export function updateStoredUser(patch) {
  try {
    for (const store of [localStorage, sessionStorage]) {
      const raw = store.getItem(USER_KEY);
      if (raw) store.setItem(USER_KEY, JSON.stringify({ ...JSON.parse(raw), ...patch }));
    }
  } catch {
    // ignore
  }
}

export function clearSession() {
  try {
    for (const store of [localStorage, sessionStorage]) {
      store.removeItem(TOKEN_KEY);
      store.removeItem(USER_KEY);
    }
  } catch {
    // ignore
  }
}

export function getToken() {
  return readStore(TOKEN_KEY);
}

export function getUser() {
  const raw = readStore(USER_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// body เป็น FormData จะส่งเป็น multipart, เป็น object จะส่งเป็น JSON
export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let payload = body;
  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(API_BASE + path, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่า backend ทำงานอยู่");
  }

  if (res.status === 401 && auth) {
    clearSession();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.assign("/login");
    }
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) {
    throw new ApiError(res.status, errorMessage(data) || `เกิดข้อผิดพลาด (${res.status})`);
  }
  return data;
}

// โหลดไฟล์ที่ต้องยืนยันตัวตน (เช่นรูปใบหน้า) แล้วคืนเป็น object URL สำหรับ <img src>
export async function apiObjectUrl(path) {
  const token = getToken();
  const res = await fetch(API_BASE + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, `โหลดไฟล์ไม่สำเร็จ (${res.status})`);
  return URL.createObjectURL(await res.blob());
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// FastAPI ส่ง detail เป็น string หรือเป็น list ของ validation error
function errorMessage(data) {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) return data.detail.map((d) => d.msg).join(", ");
  return "";
}
