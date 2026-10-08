import { useEffect, useState } from "react";
import {
  X,
  Save,
  Clock,
  Gauge,
  ScanFace,
  UserPlus,
  Trash2,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  BookOpen,
} from "lucide-react";
import { api } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { hhmm, isoDate, STATUS_LABEL } from "../../lib/format";
import { useAppearanceSettings } from "./useAppearanceSettings";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900";
const labelCls = "text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5";

function ModalShell({ code, title, onClose, children, footer, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div
        className={`relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full ${
          wide ? "max-w-2xl" : "max-w-lg"
        } max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            {code && <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">{code}</div>}
            <h3 className="font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorText({ children }) {
  if (!children) return null;
  return (
    <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 text-red-600 dark:text-red-400 text-sm rounded-xl px-4 py-3">
      {children}
    </div>
  );
}

function PrimaryButton({ busy, children, ...props }) {
  return (
    <button
      {...props}
      disabled={busy || props.disabled}
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm shadow-blue-100 dark:shadow-blue-950"
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

function CancelButton({ onClick }) {
  const { t } = useAppearanceSettings();
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
    >
      {t("common.actions.cancel")}
    </button>
  );
}

// ---------------------------------------------------------------------------
// จัดการคลาส: เกณฑ์การเช็คชื่อ + รายชื่อนักศึกษาในคลาส
// ---------------------------------------------------------------------------
export function ManageCourseModal({ cls, onClose, onSaved }) {
  const { t } = useAppearanceSettings();
  const [rule, setRule] = useState({
    openOffset: cls.checkin_open_offset_minutes,
    closeOffset: cls.checkin_close_offset_minutes,
    lateThreshold: cls.late_threshold_minutes,
    confidence: cls.face_confidence_threshold,
    allowManualFallback: cls.allow_manual_fallback,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (patch) => setRule((r) => ({ ...r, ...patch }));

  async function handleSave() {
    setBusy(true);
    setError("");
    try {
      await api(`/classes/${cls.id}`, {
        method: "PUT",
        body: {
          checkin_open_offset_minutes: rule.openOffset,
          checkin_close_offset_minutes: rule.closeOffset,
          late_threshold_minutes: rule.lateThreshold,
          face_confidence_threshold: rule.confidence,
          allow_manual_fallback: rule.allowManualFallback,
        },
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell
      code={cls.course_code}
      title={`${t("courses.modal.titlePrefix")} ${cls.course_name}`}
      onClose={onClose}
      wide
      footer={
        <>
          <CancelButton onClick={onClose} />
          <PrimaryButton busy={busy} onClick={handleSave}>
            {!busy && <Save className="w-4 h-4" />}
            {t("courses.modal.saveRule")}
          </PrimaryButton>
        </>
      }
    >
      <ErrorText>{error}</ErrorText>
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <ScanFace className="w-4 h-4" />
        </div>
        <div>
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{t("courses.modal.faceCheckinTitle")}</h4>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">{t("courses.modal.faceCheckinDesc")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            {t("live.openOffset")}
          </label>
          <input
            type="number"
            min={0}
            max={120}
            value={rule.openOffset}
            onChange={(e) => update({ openOffset: Math.max(0, Number(e.target.value) || 0) })}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>
            <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            {t("live.closeOffset")}
          </label>
          <input
            type="number"
            min={1}
            max={300}
            value={rule.closeOffset}
            onChange={(e) => update({ closeOffset: Math.max(1, Number(e.target.value) || 1) })}
            className={inputCls}
          />
        </div>
      </div>
      <p className="text-[11px] text-slate-400 dark:text-slate-500 -mt-3">{t("live.offsetNote")}</p>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t("courses.modal.lateThreshold")}</label>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {rule.lateThreshold} {t("common.units.minutes")}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={30}
          value={rule.lateThreshold}
          onChange={(e) => update({ lateThreshold: Number(e.target.value) })}
          className="w-full accent-blue-600"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            {t("courses.modal.confidence")}
          </label>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{rule.confidence}%</span>
        </div>
        <input
          type="range"
          min={50}
          max={99}
          value={rule.confidence}
          onChange={(e) => update({ confidence: Number(e.target.value) })}
          className="w-full accent-blue-600"
        />
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{t("courses.modal.confidenceNote")}</p>
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t("courses.modal.manualFallback")}</div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">{t("courses.modal.manualFallbackDesc")}</div>
        </div>
        <button
          type="button"
          onClick={() => update({ allowManualFallback: !rule.allowManualFallback })}
          className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ${
            rule.allowManualFallback ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
          }`}
          aria-pressed={rule.allowManualFallback}
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${
              rule.allowManualFallback ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>

      <EnrollmentSection cls={cls} onChanged={onSaved} />
    </ModalShell>
  );
}

function EnrollmentSection({ cls, onChanged }) {
  const { t } = useAppearanceSettings();
  const enrolled = useApi(`/classes/${cls.id}/students`, []);
  const allStudents = useApi("/students", []);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const enrolledIds = new Set((enrolled.data || []).map((e) => e.student_id));
  const candidates = (allStudents.data || []).filter((s) => !enrolledIds.has(s.id));

  async function run(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
      enrolled.reload();
      onChanged?.(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const add = () =>
    run(async () => {
      await api(`/classes/${cls.id}/students`, {
        method: "POST",
        body: { class_id: cls.id, student_id: Number(pick) },
      });
      setPick("");
    });

  const remove = (enrollment) => {
    if (!window.confirm(`${t("live.confirmUnenroll")} ${enrollment.student?.full_name || ""}?`)) return;
    run(() => api(`/classes/${cls.id}/students/${enrollment.id}`, { method: "DELETE" }));
  };

  return (
    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
        {t("live.classStudents")} ({(enrolled.data || []).length} {t("common.units.people")})
      </h4>
      <ErrorText>{error || enrolled.error}</ErrorText>
      <div className="flex gap-2">
        <select value={pick} onChange={(e) => setPick(e.target.value)} className={inputCls}>
          <option value="">{t("live.pickStudent")}</option>
          {candidates.map((s) => (
            <option key={s.id} value={s.id}>
              {s.student_code} — {s.full_name}
            </option>
          ))}
        </select>
        <button
          onClick={add}
          disabled={!pick || busy}
          className="flex items-center gap-1.5 shrink-0 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold px-4 rounded-xl"
        >
          <UserPlus className="w-4 h-4" />
          {t("common.actions.add")}
        </button>
      </div>
      <div className="max-h-56 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
        {(enrolled.data || []).map((e) => (
          <div key={e.id} className="flex items-center justify-between py-2 text-sm">
            <div className="min-w-0">
              <span className="text-slate-500 dark:text-slate-400 mr-2">{e.student?.student_code}</span>
              <span className="text-slate-800 dark:text-slate-100">{e.student?.full_name}</span>
            </div>
            <button
              onClick={() => remove(e)}
              disabled={busy}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
              aria-label={t("live.unenroll")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {!enrolled.loading && (enrolled.data || []).length === 0 && (
          <div className="py-3 text-sm text-slate-400 dark:text-slate-500">{t("live.noStudentsInClass")}</div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// เช็คชื่อ: เปิดคาบเรียนวันนี้ + ดูสถานะ/บันทึกแบบ manual
// ---------------------------------------------------------------------------
const nowHHMM = () => new Date().toTimeString().slice(0, 5);

const statusCls = {
  present: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
  late: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
  absent: "bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400",
  open: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
  upcoming: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
};

export function SessionModal({ cls, onClose, onChanged }) {
  const { t } = useAppearanceSettings();
  const today = isoDate();
  const sessionReq = useApi(`/attendance/sessions/${cls.id}/today`);
  const session = sessionReq.data;
  const recordsReq = useApi(
    session ? `/attendance/records?class_id=${cls.id}&start=${today}&end=${today}` : null,
    []
  );
  const rows = (recordsReq.data || []).filter((r) => session && r.session_id === session.id);

  const [showForm, setShowForm] = useState(false);
  const [start, setStart] = useState(nowHHMM);
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // รีเฟรชสถานะทุก 15 วินาทีระหว่างเปิดหน้าต่างนี้ (นักศึกษากำลังสแกนหน้าเข้ามา)
  const reloadRecords = recordsReq.reload;
  useEffect(() => {
    if (!session) return undefined;
    const timer = setInterval(reloadRecords, 15000);
    return () => clearInterval(timer);
  }, [session, reloadRecords]);

  async function openSession() {
    setBusy(true);
    setError("");
    try {
      await api("/attendance/sessions", {
        method: "POST",
        body: {
          class_id: cls.id,
          session_date: today,
          start_time: `${start}:00`,
          end_time: end ? `${end}:00` : null,
        },
      });
      setShowForm(false);
      sessionReq.reload();
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function mark(row, status) {
    setError("");
    try {
      await api("/attendance/manual", {
        method: "POST",
        body: { session_id: row.session_id, enrollment_id: row.enrollment_id, status },
      });
      recordsReq.reload();
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  const form = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            <Clock className="w-3.5 h-3.5" />
            {t("live.startTime")}
          </label>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>
            <Clock className="w-3.5 h-3.5" />
            {t("live.endTime")}
          </label>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
        </div>
      </div>
      <p className="text-[11px] text-slate-400 dark:text-slate-500">
        {t("live.windowNotePrefix")} {cls.checkin_open_offset_minutes} {t("common.units.minutes")}{" "}
        {t("live.windowNoteMiddle")} {cls.checkin_close_offset_minutes} {t("common.units.minutes")}{" "}
        {t("live.windowNoteSuffix")} {cls.late_threshold_minutes} {t("common.units.minutes")}
      </p>
      <PrimaryButton busy={busy} onClick={openSession} disabled={!start}>
        {!busy && <PlayCircle className="w-4 h-4" />}
        {t("live.openSession")}
      </PrimaryButton>
    </div>
  );

  return (
    <ModalShell code={cls.course_code} title={`${t("courses.card.checkin")} — ${cls.course_name}`} onClose={onClose} wide>
      <ErrorText>{error || sessionReq.error || recordsReq.error}</ErrorText>
      {sessionReq.loading ? (
        <div className="text-sm text-slate-400">{t("live.loading")}</div>
      ) : !session ? (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("live.noSessionYet")}</p>
          {form}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl px-4 py-3">
            <div className="text-sm text-blue-700 dark:text-blue-300">
              {t("live.sessionToday")} {hhmm(session.start_time)}
              {session.end_time ? ` - ${hhmm(session.end_time)}` : ""}
            </div>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showForm ? t("common.actions.cancel") : t("live.openAnother")}
            </button>
          </div>
          {showForm && form}
          {!cls.allow_manual_fallback && (
            <p className="text-xs text-amber-600 dark:text-amber-400">{t("live.manualDisabled")}</p>
          )}
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {rows.map((r) => (
              <div key={r.enrollment_id} className="flex flex-wrap items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{r.student_name}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    {r.student_code}
                    {r.check_in_time && ` • ${hhmm(r.check_in_time)}`}
                    {r.method && ` • ${r.method === "face" ? t("live.byFace") : t("live.byManual")}`}
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCls[r.status]}`}>
                  {STATUS_LABEL[r.status]}
                </span>
                {cls.allow_manual_fallback && (
                  <div className="flex gap-1">
                    <MarkButton onClick={() => mark(r, "present")} title={STATUS_LABEL.present} cls="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
                      <CheckCircle2 className="w-4 h-4" />
                    </MarkButton>
                    <MarkButton onClick={() => mark(r, "late")} title={STATUS_LABEL.late} cls="text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40">
                      <Clock className="w-4 h-4" />
                    </MarkButton>
                    <MarkButton onClick={() => mark(r, "absent")} title={STATUS_LABEL.absent} cls="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40">
                      <XCircle className="w-4 h-4" />
                    </MarkButton>
                  </div>
                )}
              </div>
            ))}
            {!recordsReq.loading && rows.length === 0 && (
              <div className="py-3 text-sm text-slate-400 dark:text-slate-500">{t("live.noStudentsInClass")}</div>
            )}
          </div>
        </>
      )}
    </ModalShell>
  );
}

function MarkButton({ cls, title, onClick, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`w-8 h-8 flex items-center justify-center rounded-lg border border-slate-100 dark:border-slate-800 transition-colors ${cls}`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// สร้างรายวิชา + คลาสแรกของรายวิชา
// ---------------------------------------------------------------------------
export function CreateCourseModal({ onClose, onCreated }) {
  const { t } = useAppearanceSettings();
  const year = new Date().getFullYear() + 543;
  const [form, setForm] = useState({
    course_code: "",
    course_name: "",
    credit: 3,
    class_code: "",
    semester: "1",
    academic_year: String(year),
    start_date: "",
    end_date: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleCreate() {
    if (!form.course_code.trim() || !form.course_name.trim()) {
      setError(t("live.courseRequired"));
      return;
    }
    setBusy(true);
    setError("");
    let course = null;
    try {
      const me = await api("/teachers/me");
      course = await api("/courses", {
        method: "POST",
        body: {
          course_code: form.course_code.trim(),
          course_name: form.course_name.trim(),
          credit: form.credit === "" ? null : Number(form.credit),
          teacher_id: me.id,
          department_id: me.department_id,
        },
      });
      await api("/classes", {
        method: "POST",
        body: {
          course_id: course.id,
          class_code: form.class_code.trim() || `${course.course_code}-SEC1`,
          class_name: course.course_name,
          semester: form.semester || null,
          academic_year: form.academic_year || null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
        },
      });
      onCreated();
    } catch (err) {
      // สร้างคลาสไม่สำเร็จ -> ลบรายวิชาที่เพิ่งสร้างทิ้ง จะได้ไม่ค้างครึ่งๆ กลางๆ
      if (course) await api(`/courses/${course.id}`, { method: "DELETE" }).catch(() => {});
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const field = (key, label, props = {}) => (
    <div>
      <label className={labelCls}>{label}</label>
      <input value={form[key]} onChange={set(key)} className={inputCls} {...props} />
    </div>
  );

  return (
    <ModalShell
      title={t("courses.createCourse")}
      onClose={onClose}
      footer={
        <>
          <CancelButton onClick={onClose} />
          <PrimaryButton busy={busy} onClick={handleCreate}>
            {!busy && <BookOpen className="w-4 h-4" />}
            {t("courses.createCourse")}
          </PrimaryButton>
        </>
      }
    >
      <ErrorText>{error}</ErrorText>
      <div className="grid grid-cols-2 gap-4">
        {field("course_code", t("live.courseCode"), { placeholder: "CS-301" })}
        {field("credit", t("live.credit"), { type: "number", min: 0, max: 12 })}
      </div>
      {field("course_name", t("live.courseName"))}
      <div className="grid grid-cols-3 gap-4">
        {field("class_code", t("live.section"), { placeholder: "SEC1" })}
        {field("semester", t("live.semester"))}
        {field("academic_year", t("live.academicYear"))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {field("start_date", t("live.startDate"), { type: "date" })}
        {field("end_date", t("live.endDate"), { type: "date" })}
      </div>
    </ModalShell>
  );
}
