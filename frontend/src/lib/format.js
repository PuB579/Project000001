// ฟังก์ชันช่วยจัดรูปแบบวันที่/เวลา/สถานะ และดาวน์โหลดไฟล์ ใช้ร่วมกันทุกหน้า

// วันที่ตามเวลาเครื่อง ในรูปแบบ YYYY-MM-DD (ใช้ส่งเป็น query ให้ backend)
export function isoDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(d, days) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

// "2026-10-05" -> Date เวลาเที่ยงคืนของเครื่อง (ไม่ใช่ UTC)
export function parseDate(iso) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

// "2026-10-05" -> "5 ต.ค. 2569"
export function thaiDate(iso, opts = { day: "numeric", month: "short", year: "numeric" }) {
  if (!iso) return "-";
  return parseDate(iso).toLocaleDateString("th-TH", opts);
}

// "2026-10-05" -> "5 ต.ค."
export const thaiDayMonth = (iso) => thaiDate(iso, { day: "numeric", month: "short" });

// "09:05:00" -> "09:05"
export const hhmm = (t) => (t ? t.slice(0, 5) : "--:--");

export function timeRange(start, end) {
  if (!start) return "-";
  return end ? `${hhmm(start)} - ${hhmm(end)}` : hhmm(start);
}

// ชื่อเต็มของนักศึกษา/อาจารย์ -> อักษรตัวแรก ใช้แทนรูปโปรไฟล์
export const initial = (name) => (name || "?").trim().charAt(0) || "?";

export const STATUS_LABEL = {
  present: "เข้าเรียน",
  late: "มาสาย",
  absent: "ขาดเรียน",
  open: "รอเช็คชื่อ",
  upcoming: "ยังไม่ถึงเวลา",
};

// นับจำนวนตามสถานะ (เฉพาะคาบที่ได้ผลแล้ว ไม่นับ open/upcoming)
export function countStatus(rows) {
  const c = { present: 0, late: 0, absent: 0 };
  rows.forEach((r) => {
    if (r.status in c) c[r.status] += 1;
  });
  c.total = c.present + c.late + c.absent;
  // อัตราการเข้าเรียน = (ตรงเวลา + สาย) / ทั้งหมด
  c.rate = c.total ? ((c.present + c.late) / c.total) * 100 : 0;
  return c;
}

export const pct = (part, total) => (total ? (part / total) * 100 : 0);

export function groupBy(rows, keyFn) {
  const map = new Map();
  rows.forEach((r) => {
    const k = keyFn(r);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  });
  return map;
}

// แนวโน้มรายวัน: [{ day, present, late, absent, rate }] เรียงตามวันที่
export function dailyTrend(rows, dateKey = "session_date") {
  return [...groupBy(rows, (r) => r[dateKey]).entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, list]) => {
      const c = countStatus(list);
      return {
        date,
        day: thaiDayMonth(date),
        present: c.present,
        late: c.late,
        absent: c.absent,
        rate: Math.round(c.rate * 10) / 10,
      };
    });
}

// ภาคเรียน "1" + ปี "2568" -> "1/2568"
export function termLabel(cls) {
  if (!cls) return "-";
  if (cls.semester && cls.academic_year) return `${cls.semester}/${cls.academic_year}`;
  return cls.academic_year || cls.semester || "-";
}

// สถานะของคลาสตามช่วงวันที่เปิด-ปิดภาค
export function classPhase(cls, today = isoDate()) {
  if (cls.start_date && today < cls.start_date) return "notstarted";
  if (cls.end_date && today > cls.end_date) return "ended";
  return "teaching";
}

// ---------------------------------------------------------------------------
// ดาวน์โหลดไฟล์
// ---------------------------------------------------------------------------
export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const csvCell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// CSV พร้อม BOM เพื่อให้ Excel อ่านภาษาไทยถูกต้อง
export function toCsv(headers, rows) {
  const lines = [headers, ...rows].map((r) => r.map(csvCell).join(","));
  return new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
}

const htmlEscape = (v) =>
  String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function htmlTable(title, headers, rows) {
  return `<h2>${htmlEscape(title)}</h2><table border="1" cellspacing="0" cellpadding="4"><thead><tr>${headers
    .map((h) => `<th>${htmlEscape(h)}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${htmlEscape(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

// ไฟล์ .xls แบบตาราง HTML — Excel เปิดได้โดยไม่ต้องใช้ไลบรารีเพิ่ม
export function toExcel(title, headers, rows) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>${htmlTable(
    title,
    headers,
    rows
  )}</body></html>`;
  return new Blob(["﻿" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
}

// PDF: เปิดหน้าต่างพิมพ์ของเบราว์เซอร์ ให้ผู้ใช้เลือก "บันทึกเป็น PDF"
export function printTable(title, headers, rows) {
  const win = window.open("", "_blank");
  if (!win) throw new Error("เบราว์เซอร์บล็อกหน้าต่างใหม่ กรุณาอนุญาต pop-up แล้วลองอีกครั้ง");
  win.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${htmlEscape(title)}</title>
    <style>body{font-family:sans-serif;padding:24px}table{border-collapse:collapse;width:100%;font-size:12px}
    th{background:#eff6ff}th,td{border:1px solid #cbd5e1;padding:6px;text-align:left}</style></head>
    <body>${htmlTable(title, headers, rows)}</body></html>`
  );
  win.document.close();
  win.focus();
  win.print();
}
