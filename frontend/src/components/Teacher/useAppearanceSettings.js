import { useCallback, useSyncExternalStore } from "react";
import { translate } from "./translations";

const STORAGE_KEY = "cs-faceattend-appearance";

const FONT_SIZE_PX = { small: "14px", normal: "16px", large: "18px" };

const DEFAULTS = { theme: "light", language: "th", fontSize: "normal" };

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function resolveIsDark(theme) {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  // theme === "system"
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function applyToDocument(s) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolveIsDark(s.theme));
  root.style.fontSize = FONT_SIZE_PX[s.fontSize] ?? FONT_SIZE_PX.normal;
  root.lang = s.language;
}

/* ------------------------------------------------------------------
 * Store กลาง (ก้อนเดียวทั้งแอป)
 * เดิมแต่ละ component ที่เรียก hook มี useState ของตัวเอง ทำให้
 * TeacherLayout (แถบซ้าย/หัวหน้า) ไม่รู้ว่าหน้า Settings เปลี่ยนภาษาแล้ว
 * ตอนนี้ทุก component อ่าน/เขียน store เดียวกัน จึงอัปเดตพร้อมกันทันที
 * ------------------------------------------------------------------ */
let state = loadStored();
const listeners = new Set();

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

function setState(patch) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage ใช้ไม่ได้ (เช่นโหมดส่วนตัว) — ยังทำงานต่อได้ในหน่วยความจำ
  }
  applyToDocument(state);
  listeners.forEach((l) => l());
}

// ติดตั้ง listener ระดับแอปครั้งเดียว
if (typeof window !== "undefined") {
  applyToDocument(state);

  // โหมด "ตามระบบ": เปลี่ยนตาม OS แบบสด ๆ
  window
    .matchMedia?.("(prefers-color-scheme: dark)")
    .addEventListener?.("change", () => {
      if (state.theme === "system") applyToDocument(state);
    });

  // ซิงก์ข้ามแท็บ: เปลี่ยนในแท็บหนึ่ง แท็บอื่นเปลี่ยนตาม
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    state = loadStored();
    applyToDocument(state);
    listeners.forEach((l) => l());
  });
}

const setTheme = (theme) => setState({ theme });
const setLanguage = (language) => setState({ language });
const setFontSize = (fontSize) => setState({ fontSize });

/**
 * เรียกครั้งเดียวตอนแอปเริ่มทำงาน (เช่นบรรทัดแรก ๆ ของ main.jsx)
 * ตอนนี้ import ไฟล์นี้ก็ apply ให้อัตโนมัติแล้ว แต่เก็บฟังก์ชันไว้เพื่อให้โค้ดเดิมไม่พัง
 */
export function applyStoredAppearance() {
  applyToDocument(state);
}

export function useAppearanceSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot);

  // t("notifications.email.title") -> ข้อความในภาษาที่เลือกอยู่ อัปเดตทุก component พร้อมกัน
  const t = useCallback((key) => translate(settings.language, key), [settings.language]);

  return { ...settings, setTheme, setLanguage, setFontSize, t };
}

/*
สำคัญมาก — ต้องทำ 1 ครั้งในไฟล์ CSS หลักของโปรเจกต์ (ไฟล์ที่มี `@import "tailwindcss";`
มักจะชื่อ src/index.css หรือ src/App.css) เพิ่มบรรทัดนี้ต่อท้าย import:

  @custom-variant dark (&:where(.dark, .dark *));

เหตุผล: Tailwind v4 ผูก dark: เข้ากับ prefers-color-scheme ของระบบโดยอัตโนมัติเท่านั้น
ถ้าไม่เพิ่มบรรทัดนี้ ปุ่ม "โหมดมืด" / "โหมดสว่าง" ที่กดเลือกเองจะไม่มีผล
*/