import { useMemo } from "react";
import { useApi } from "../../lib/useApi";

// ข้อมูลหลักที่หน้าฝั่งอาจารย์ใช้ร่วมกัน:
// - classes: คลาสทั้งหมดที่อาจารย์คนนี้สอน (พร้อมชื่อวิชา/จำนวนนักศึกษา)
// - records: ทุกแถว (คาบ x นักศึกษา) รวมคนที่ไม่ได้เช็คชื่อ สถานะ present/late/absent/open/upcoming
export function useTeacherData({ start, end } = {}) {
  const classesReq = useApi("/classes/mine", []);
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  const qs = params.toString();
  const recordsReq = useApi(`/attendance/records${qs ? `?${qs}` : ""}`, []);

  const classById = useMemo(
    () => new Map((classesReq.data || []).map((c) => [c.id, c])),
    [classesReq.data]
  );

  return {
    classes: classesReq.data || [],
    records: recordsReq.data || [],
    classById,
    loading: classesReq.loading || recordsReq.loading,
    error: classesReq.error || recordsReq.error,
    reload: () => {
      classesReq.reload();
      recordsReq.reload();
    },
  };
}

// สีประจำคลาส วนตามลำดับ
export const CLASS_COLORS = [
  { icon: "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400", solid: "bg-blue-500" },
  { icon: "bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400", solid: "bg-purple-500" },
  { icon: "bg-orange-100 dark:bg-orange-950/40 text-orange-500 dark:text-orange-400", solid: "bg-orange-400" },
  { icon: "bg-teal-100 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400", solid: "bg-teal-400" },
  { icon: "bg-rose-100 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400", solid: "bg-rose-400" },
];

export const colorOf = (index) => CLASS_COLORS[index % CLASS_COLORS.length];
