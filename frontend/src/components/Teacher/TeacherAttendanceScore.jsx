import { useMemo, useState } from "react";
import {
  ChevronDown,
  Award,
  Search,
  RotateCcw,
  SlidersHorizontal,
  Save,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Info,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import TeacherLayout from "./TeacherLayout";
import LoadState from "../LoadState";
import { useAppearanceSettings } from "./useAppearanceSettings";
import { useTeacherData } from "./useTeacherData";
import { api } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { downloadBlob, groupBy, printTable, toExcel } from "../../lib/format";

const DEFAULT_SESSION_COUNT = 16;
// เงื่อนไขเริ่มต้น: มาสายตั้งแต่ 5 นาที หัก 1 คะแนน, ตั้งแต่ 10 นาที หัก 2 คะแนน, ตั้งแต่ 20 นาที หัก 3 คะแนน
// (ครูปรับ/เพิ่ม/ลบเงื่อนไขได้อิสระ แยกเป็นรายวิชา)
function defaultLateTiers() {
  return [
    { id: "tier-1", minMinutes: 5, deduction: 1 },
    { id: "tier-2", minMinutes: 10, deduction: 2 },
    { id: "tier-3", minMinutes: 20, deduction: 3 },
  ];
}

// mode "direct"     = กำหนดคะแนนเต็มรวมโดยตรง (เช่น เต็ม 10) แล้วหักคะแนนตรงในสเกลนี้เลย
// mode "perSession"  = กำหนดคะแนนเต็มต่อครั้ง (เช่น ครั้งละ 10 × 20 ครั้ง = ดิบ 200) แล้วแปลงสัดส่วนกลับมาเป็นคะแนนเต็มที่ใช้เข้าเกรด
function defaultRule(sessionCount = DEFAULT_SESSION_COUNT) {
  return {
    mode: "direct",
    full: 10,
    sessionCount,
    sessionFull: 10,
    passThreshold: 5,
    lateTiers: defaultLateTiers(),
  };
}

// หาขั้นที่ตรงกับจำนวนนาทีที่สาย (ใช้ threshold สูงสุดที่ <= นาทีที่สาย)
function latePenaltyFor(minutes, lateTiers) {
  const applicable = [...lateTiers].filter((t) => minutes >= t.minMinutes).sort((a, b) => b.minMinutes - a.minMinutes)[0];
  return applicable ? applicable.deduction : 0;
}

// โหมด "direct": คะแนนที่หักต่อครั้งที่ขาด = คะแนนเต็ม ÷ จำนวนครั้งเช็คชื่อ (ขาดครั้งนั้นจึงได้ 0 คะแนนเสมอ)
function directAbsentDeduction(rule) {
  return rule.sessionCount ? rule.full / rule.sessionCount : 0;
}

function computeScoreDirect(student, rule) {
  const latePenalty = (student.lateRecords || []).reduce((sum, m) => sum + latePenaltyFor(m, rule.lateTiers), 0);
  const absentPenalty = student.absent * directAbsentDeduction(rule);
  const raw = rule.full - latePenalty - absentPenalty;
  return Math.max(0, Math.round(Math.min(rule.full, raw) * 100) / 100);
}

// โหมด "perSession": แต่ละครั้งมีคะแนนเต็มของตัวเอง (sessionFull) รวมทุกครั้งเป็นคะแนนดิบ
// (เช่น ครั้งละ 10 × 20 ครั้ง = ดิบ 200) แล้วแปลงสัดส่วนกลับมาเป็น "คะแนนเต็ม" ที่ใช้เข้าเกรดจริง
function computeScorePerSession(student, rule) {
  const rawMax = rule.sessionFull * rule.sessionCount;
  if (!rawMax) return 0;

  const presentRaw = student.present * rule.sessionFull;
  const lateRaw = (student.lateRecords || []).reduce((sum, m) => {
    const penalty = latePenaltyFor(m, rule.lateTiers);
    return sum + Math.max(0, rule.sessionFull - penalty);
  }, 0);
  // ขาดเรียน = ได้ 0 คะแนนดิบของครั้งนั้นเสมอ ไม่ต้องตั้งค่าเอง
  const rawScore = presentRaw + lateRaw;

  const normalized = (rawScore / rawMax) * rule.full;
  return Math.max(0, Math.round(Math.min(rule.full, normalized) * 100) / 100);
}

function computeScore(student, rule) {
  return rule.mode === "perSession" ? computeScorePerSession(student, rule) : computeScoreDirect(student, rule);
}

let tierIdCounter = 100;

export default function TeacherAttendanceScore() {
  const { t } = useAppearanceSettings();
  const { classes, records, loading, error, reload } = useTeacherData();
  const [pickedClassId, setPickedClassId] = useState(null);
  const classId = pickedClassId ?? classes[0]?.id ?? null;
  const cls = classes.find((c) => c.id === classId);
  const course = { code: cls?.course_code || "-", name: cls?.course_name || "" };

  const ruleReq = useApi(classId ? `/scores/rules/${classId}` : null);
  const savedReq = useApi(classId ? `/scores/class/${classId}` : null, []);
  const rosterReq = useApi(classId ? `/classes/${classId}/students` : null, []);
  const [ruleEdits, setRuleEdits] = useState({}); // classId -> rule ที่แก้ไว้แต่ยังไม่บันทึก
  const [scoreEdits, setScoreEdits] = useState({}); // classId -> { studentId: { score, note } }
  const [savedAt, setSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [search, setSearch] = useState("");

  const classRecords = useMemo(
    () => records.filter((r) => r.class_id === classId && ["present", "late", "absent"].includes(r.status)),
    [records, classId]
  );
  const sessionCount = new Set(records.filter((r) => r.class_id === classId).map((r) => r.session_id)).size;

  const serverRule = ruleReq.data && ruleReq.data.class_id === classId ? ruleReq.data : null;
  const rule =
    ruleEdits[classId] ||
    (serverRule
      ? {
          mode: serverRule.mode === "per_session" ? "perSession" : "direct",
          full: Number(serverRule.full_score),
          sessionCount: serverRule.session_count,
          sessionFull: Number(serverRule.session_full_score),
          passThreshold: Number(serverRule.pass_threshold),
          lateTiers: serverRule.late_tiers.map((tier) => ({
            id: `tier-${tier.id}`,
            minMinutes: tier.min_minutes,
            deduction: Number(tier.deduction),
          })),
        }
      : defaultRule(Math.max(sessionCount, DEFAULT_SESSION_COUNT)));

  const setRule = (patch) => setRuleEdits((prev) => ({ ...prev, [classId]: { ...rule, ...patch } }));

  // สถิติของนักศึกษาแต่ละคนในคลาส (รวมคนที่ยังไม่มีคาบเรียนเลย)
  const baseStudents = useMemo(() => {
    const byStudent = groupBy(classRecords, (r) => r.student_id);
    const roster = (rosterReq.data || []).filter((e) => e.class_id === classId && e.student);
    return roster.map((e) => {
      const rows = byStudent.get(e.student_id) || [];
      return {
        id: e.student_id,
        code: e.student.student_code,
        name: e.student.full_name,
        present: rows.filter((r) => r.status === "present").length,
        lateRecords: rows.filter((r) => r.status === "late").map((r) => r.late_minutes || 0),
        absent: rows.filter((r) => r.status === "absent").length,
      };
    });
  }, [classRecords, rosterReq.data, classId]);

  const savedById = useMemo(() => {
    const rows = (savedReq.data || []).filter((s) => s.class_id === classId);
    return new Map(rows.map((s) => [s.student_id, s]));
  }, [savedReq.data, classId]);

  const allStudents = baseStudents.map((s) => {
    const edit = scoreEdits[classId]?.[s.id];
    const saved = savedById.get(s.id);
    const computed = computeScore(s, rule);
    return {
      ...s,
      computed,
      score: edit?.score ?? (saved?.is_manual_override ? Number(saved.score) : computed),
      note: edit?.note ?? saved?.note ?? "",
    };
  });
  const q = search.trim().toLowerCase();
  const students = q ? allStudents.filter((s) => `${s.code} ${s.name}`.toLowerCase().includes(q)) : allStudents;

  const handleRuleField = (field, value) => {
    const num = value === "" ? 0 : parseFloat(value);
    if (!Number.isNaN(num)) setRule({ [field]: num });
  };

  const handleModeChange = (mode) => setRule({ mode });

  const handleTierField = (tierId, field, value) => {
    const num = value === "" ? 0 : parseFloat(value);
    if (Number.isNaN(num)) return;
    setRule({ lateTiers: rule.lateTiers.map((tier) => (tier.id === tierId ? { ...tier, [field]: num } : tier)) });
  };

  const addTier = () => {
    tierIdCounter += 1;
    setRule({ lateTiers: [...rule.lateTiers, { id: `tier-${tierIdCounter}`, minMinutes: 5, deduction: 1 }] });
  };

  const removeTier = (tierId) => setRule({ lateTiers: rule.lateTiers.filter((tier) => tier.id !== tierId) });

  const editStudent = (id, patch) => {
    setScoreEdits((prev) => {
      const current = allStudents.find((s) => s.id === id);
      const forClass = prev[classId] || {};
      return {
        ...prev,
        [classId]: { ...forClass, [id]: { score: current.score, note: current.note, ...forClass[id], ...patch } },
      };
    });
    setSavedAt(null);
  };

  // คำนวณใหม่ทุกคนตามเกณฑ์ปัจจุบัน (คงหมายเหตุไว้)
  const recalcAll = () => {
    setScoreEdits((prev) => ({
      ...prev,
      [classId]: Object.fromEntries(allStudents.map((s) => [s.id, { score: s.computed, note: s.note }])),
    }));
    setSavedAt(null);
  };

  const handleScoreChange = (id, value) => {
    const num = value === "" ? 0 : parseFloat(value);
    if (!Number.isNaN(num)) editStudent(id, { score: num });
  };

  const handleNoteChange = (id, value) => editStudent(id, { note: value });

  const handleSaveAll = async () => {
    if (!classId) return;
    setSaving(true);
    setSaveError("");
    try {
      await api(`/scores/rules/${classId}`, {
        method: "PUT",
        body: {
          class_id: classId,
          mode: rule.mode === "perSession" ? "per_session" : "direct",
          full_score: rule.full,
          session_count: rule.sessionCount,
          session_full_score: rule.sessionFull,
          pass_threshold: rule.passThreshold,
          late_tiers: rule.lateTiers.map((tier) => ({ min_minutes: tier.minMinutes, deduction: tier.deduction })),
        },
      });
      // คะแนนที่ไม่ตรงกับสูตร = อาจารย์แก้เอง (manual) ระบบจะไม่คำนวณทับ
      await Promise.all(
        allStudents.map((s) =>
          api(`/scores/class/${classId}/student/${s.id}`, {
            method: "PUT",
            body: { score: s.score, note: s.note || null, manual: Math.abs(s.score - s.computed) > 0.005 },
          })
        )
      );
      setRuleEdits((prev) => ({ ...prev, [classId]: undefined }));
      setScoreEdits((prev) => ({ ...prev, [classId]: undefined }));
      ruleReq.reload();
      savedReq.reload();
      setSavedAt(new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const exportHeaders = ["รหัสนักศึกษา", "ชื่อ-นามสกุล", "เข้าเรียน", "มาสาย", "ขาดเรียน", `คะแนน (เต็ม ${rule.full})`, "หมายเหตุ"];
  const exportRows = () =>
    allStudents.map((s) => [s.code, s.name, s.present, s.lateRecords.length, s.absent, s.score, s.note]);
  const exportTitle = `คะแนนเข้าเรียน ${course.code} ${course.name}`;
  const exportExcel = () => downloadBlob(`คะแนนเข้าเรียน_${course.code}.xls`, toExcel(exportTitle, exportHeaders, exportRows()));
  const exportPdf = () => {
    try {
      printTable(exportTitle, exportHeaders, exportRows());
    } catch (err) {
      setSaveError(err.message);
    }
  };

  const sortedTiers = [...rule.lateTiers].sort((a, b) => a.minMinutes - b.minMinutes);

  const stats = (() => {
    const total = students.length;
    const avg = total ? students.reduce((sum, s) => sum + s.score, 0) / total : 0;
    const fullCount = students.filter((s) => s.score >= rule.full).length;
    const lowCount = students.filter((s) => s.score < rule.passThreshold).length;
    return { total, avg, fullCount, lowCount };
  })();

  const distribution = (() => {
    const buckets = [
      { key: "90-100", label: "90-100%", color: "#22c55e", count: 0 },
      { key: "70-89", label: "70-89%", color: "#3b82f6", count: 0 },
      { key: "50-69", label: "50-69%", color: "#f59e0b", count: 0 },
      { key: "below50", label: t("scores.below50"), color: "#ef4444", count: 0 },
    ];
    students.forEach((s) => {
      const pct = rule.full ? (s.score / rule.full) * 100 : 0;
      if (pct >= 90) buckets[0].count += 1;
      else if (pct >= 70) buckets[1].count += 1;
      else if (pct >= 50) buckets[2].count += 1;
      else buckets[3].count += 1;
    });
    return buckets;
  })();

  return (
    <TeacherLayout
      titleIcon={Award}
      titleKey="nav.scores"
      subtitleKey="scores.subtitle"
      headerExtra={
        <div className="relative hidden sm:block shrink-0">
          <select
            value={classId ?? ""}
            onChange={(e) => setPickedClassId(Number(e.target.value))}
            className="appearance-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl pl-4 pr-9 py-2.5 text-sm text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 cursor-pointer"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.course_code} — {c.course_name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      }
    >
      {/* Mobile course select */}
      <LoadState
        loading={loading || ruleReq.loading}
        error={error || ruleReq.error || savedReq.error || rosterReq.error || saveError}
        onRetry={reload}
      />
      <div className="sm:hidden">
        <select
          value={classId ?? ""}
          onChange={(e) => setPickedClassId(Number(e.target.value))}
          className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.course_code} — {c.course_name}
            </option>
          ))}
        </select>
      </div>

      {/* Scoring rule card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              {t("scores.ruleCardTitle")}{" "}
              <span className="text-slate-400 dark:text-slate-500 font-medium text-sm">
                — {t("scores.onlyCoursePrefix")} {course.code}
              </span>
            </h3>
          </div>
          <button
            onClick={recalcAll}
            className="flex items-center gap-2 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors text-sm font-semibold px-4 py-2 rounded-xl"
          >
            <RefreshCw className="w-4 h-4" />
            {t("scores.recalcAll")}
          </button>
        </div>

        {/* Calculation mode switch */}
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => handleModeChange("direct")}
            className={`text-sm font-medium px-4 py-2 rounded-xl border transition-colors ${
              rule.mode === "direct"
                ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            {t("scores.modeDirect")}
          </button>
          <button
            onClick={() => handleModeChange("perSession")}
            className={`text-sm font-medium px-4 py-2 rounded-xl border transition-colors ${
              rule.mode === "perSession"
                ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            {t("scores.modePerSession")}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <RuleField
            label={t("scores.fields.sessionCount")}
            value={rule.sessionCount}
            onChange={(v) => handleRuleField("sessionCount", v)}
            suffix={t("common.units.times")}
          />
          {rule.mode === "perSession" && (
            <RuleField
              label={t("scores.fields.sessionFull")}
              value={rule.sessionFull}
              onChange={(v) => handleRuleField("sessionFull", v)}
              suffix={t("scores.fields.sessionFullSuffix")}
            />
          )}
          <RuleField
            label={t("scores.fields.fullScore")}
            value={rule.full}
            onChange={(v) => handleRuleField("full", v)}
            suffix={t("common.units.points")}
          />
          <RuleField
            label={t("scores.fields.passThreshold")}
            value={rule.passThreshold}
            onChange={(v) => handleRuleField("passThreshold", v)}
            suffix={t("common.units.points")}
          />
        </div>

        {rule.mode === "perSession" && (
          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-xl px-4 py-2.5">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>
              {t("scores.perSessionInfoPrefix")} = {rule.sessionFull} × {rule.sessionCount} ={" "}
              <strong>
                {(rule.sessionFull * rule.sessionCount).toLocaleString()} {t("common.units.points")}
              </strong>{" "}
              {t("scores.perSessionInfoSuffix")}
            </span>
          </div>
        )}

        <div className="mt-3 text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-4 py-2.5">
          <strong className="text-red-500 dark:text-red-400 font-semibold">{t("scores.absentDeductionLabel")}</strong>{" "}
          {rule.mode === "perSession" ? (
            <>
              {t("scores.absentAutoZero")} {rule.sessionFull} {t("common.units.points")}/{t("common.units.times")})
            </>
          ) : (
            <>
              {t("scores.absentAutoDeduct")} −{directAbsentDeduction(rule).toFixed(2)} {t("scores.absentAutoDeductSuffix")}
            </>
          )}{" "}
          {t("scores.absentAlwaysZero")}
        </div>

        {/* Tiered late-penalty editor */}
        <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t("scores.lateTiersTitle")}</h4>
            </div>
            <button
              onClick={addTier}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors px-3 py-1.5 rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              {t("scores.addCondition")}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2.5">
            {rule.mode === "perSession"
              ? `${t("scores.tiersHintPerSession")} (${t("scores.fields.fullScore")} ${rule.sessionFull} ${t("common.units.points")}/${t("common.units.times")})`
              : t("scores.tiersHintDirect")}
          </p>

          <div className="space-y-2.5">
            {sortedTiers.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-500 italic">{t("scores.noConditions")}</p>}
            {sortedTiers.map((tier) => (
              <div key={tier.id} className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2.5">
                <span className="text-sm text-slate-600 dark:text-slate-300">{t("scores.lateFrom")}</span>
                <input
                  type="number"
                  min="0"
                  value={tier.minMinutes}
                  onChange={(e) => handleTierField(tier.id, "minMinutes", e.target.value)}
                  className="w-16 text-sm font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
                />
                <span className="text-sm text-slate-600 dark:text-slate-300">{t("scores.minutesUpDeduct")}</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={tier.deduction}
                  onChange={(e) => handleTierField(tier.id, "deduction", e.target.value)}
                  className="w-16 text-sm font-semibold text-red-500 dark:text-red-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
                />
                <span className="text-sm text-slate-600 dark:text-slate-300">{t("scores.pointsPerTime")}</span>
                <div className="flex-1" />
                <button
                  onClick={() => removeTier(tier.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
                  aria-label={t("scores.removeCondition")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2 mt-5 text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {rule.mode === "perSession" ? t("scores.formulaPerSession") : t("scores.formulaDirect")} — {t("scores.formulaFooter")}
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={<Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />} iconBg="bg-blue-100 dark:bg-blue-950/40" label={t("scores.stats.totalStudents")} value={stats.total} sub={t("common.units.people")} />
        <StatCard icon={<Award className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />} iconBg="bg-emerald-100 dark:bg-emerald-950/40" label={t("scores.stats.avgScore")} value={stats.avg.toFixed(1)} sub={`/ ${rule.full}`} />
        <StatCard icon={<CheckCircle2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />} iconBg="bg-purple-100 dark:bg-purple-950/40" label={t("scores.stats.fullScoreCount")} value={stats.fullCount} sub={t("common.units.people")} />
        <StatCard
          icon={<AlertTriangle className="w-6 h-6 text-red-500 dark:text-red-400" />}
          iconBg="bg-red-100 dark:bg-red-950/40"
          label={t("scores.stats.belowThreshold")}
          value={stats.lowCount}
          sub={t("common.units.people")}
          subColor={stats.lowCount > 0 ? "text-red-500 dark:text-red-400" : "text-slate-400 dark:text-slate-500"}
        />
      </div>

      {/* Distribution chart + filter/export toolbar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100">{t("scores.distributionTitle")}</h3>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                  formatter={(value) => [`${value} ${t("scores.distributionCountUnit")}`, t("scores.distributionTooltipLabel")]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {distribution.map((d) => (
                    <Cell key={d.key} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100">{t("scores.searchExportTitle")}</h3>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("scores.searchPlaceholder")}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
              />
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">{t("scores.editHint")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button onClick={() => setSearch("")} className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-500 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <RotateCcw className="w-4 h-4" />
              {t("common.actions.reset")}
            </button>
            <button onClick={exportExcel} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 transition-colors text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm shadow-emerald-100 dark:shadow-emerald-950">
              {t("common.actions.exportExcel")}
            </button>
            <button onClick={exportPdf} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 transition-colors text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm shadow-red-100 dark:shadow-red-950">
              {t("common.actions.exportPdf")}
            </button>
          </div>
        </div>
      </div>

      {/* Score table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">
            {t("scores.individualScoreTitle")}{" "}
            <span className="text-slate-400 dark:text-slate-500 font-medium">
              — {course.code} {course.name}
            </span>
          </h3>
          {savedAt && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t("scores.lastSavedPrefix")} {savedAt}
            </span>
          )}
        </div>

        <table className="w-full text-sm min-w-[960px]">
          <thead>
            <tr className="text-left text-xs text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
              <th className="py-2 pr-3 font-medium">{t("scores.table.studentId")}</th>
              <th className="py-2 pr-3 font-medium">{t("scores.table.name")}</th>
              <th className="py-2 pr-3 font-medium text-center">{t("scores.table.present")}</th>
              <th className="py-2 pr-3 font-medium text-center">{t("scores.table.late")}</th>
              <th className="py-2 pr-3 font-medium text-center">{t("scores.table.absent")}</th>
              <th className="py-2 pr-3 font-medium">{t("scores.table.score")}</th>
              <th className="py-2 pr-3 font-medium">{t("scores.table.status")}</th>
              <th className="py-2 pr-3 font-medium">{t("scores.table.note")}</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const passed = s.score >= rule.passThreshold;
              const pct = rule.full ? (s.score / rule.full) * 100 : 0;
              const lateCount = (s.lateRecords || []).length;
              const lateTitle = lateCount
                ? s.lateRecords.map((m) => `${t("common.status.late")} ${m} ${t("common.units.minutes")}`).join(", ")
                : t("scores.noConditions");
              return (
                <tr key={s.id} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                  <td className="py-3 pr-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{s.code}</td>
                  <td className="py-3 pr-3 text-slate-800 dark:text-slate-100 font-medium whitespace-nowrap">
                    {s.name}
                  </td>
                  <td className="py-3 pr-3 text-emerald-600 dark:text-emerald-400 font-medium text-center">{s.present}</td>
                  <td className="py-3 pr-3 text-amber-500 dark:text-amber-400 font-medium text-center cursor-help" title={lateTitle}>
                    {lateCount}
                  </td>
                  <td className="py-3 pr-3 text-red-500 dark:text-red-400 font-medium text-center">{s.absent}</td>
                  <td className="py-3 pr-3 min-w-[160px]">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={rule.full}
                        value={s.score}
                        onChange={(e) => handleScoreChange(s.id, e.target.value)}
                        className="w-16 text-sm font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
                      />
                      <span className="text-xs text-slate-400 dark:text-slate-500">/ {rule.full}</span>
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden hidden xl:block">
                        <div
                          className={`h-full rounded-full ${
                            pct >= 90 ? "bg-emerald-500" : pct >= 70 ? "bg-blue-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        passed
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                          : "bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400"
                      }`}
                    >
                      {passed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      {passed ? t("scores.passStatus") : t("scores.needsAttention")}
                    </span>
                  </td>
                  <td className="py-3 pr-3 min-w-[200px]">
                    <input
                      type="text"
                      value={s.note}
                      onChange={(e) => handleNoteChange(s.id, e.target.value)}
                      placeholder={t("scores.notePlaceholder")}
                      className="w-full text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 mt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-500">{t("scores.bottomHint")}</p>
          <button
            onClick={handleSaveAll}
            disabled={saving || !classId}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-colors text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm shadow-blue-200 dark:shadow-blue-950"
          >
            <Save className="w-4 h-4" />
            {t("scores.saveAllScores")}
          </button>
        </div>
      </div>
    </TeacherLayout>
  );
}

function StatCard({ icon, iconBg, label, value, sub, subColor }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{label}</div>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{value}</span>
          <span className={`text-xs ${subColor || "text-slate-400 dark:text-slate-500"}`}>{sub}</span>
        </div>
      </div>
    </div>
  );
}

function RuleField({ label, value, onChange, suffix }) {
  return (
    <div>
      <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</label>
      <div className="flex items-center gap-2 mt-1.5">
        <input
          type="number"
          step="0.5"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
        />
      </div>
      <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{suffix}</div>
    </div>
  );
}