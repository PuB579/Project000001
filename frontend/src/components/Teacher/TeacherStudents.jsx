import { useEffect, useState } from "react";
import {
  Users,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  RotateCcw,
  LayoutGrid,
  List,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Clock,
  Ban,
  UsersRound,
  Download,
  CheckCircle2,
  ScanFace,
  XCircle,
  X,
  Save,
  Loader2,
} from "lucide-react";
import TeacherLayout from "./TeacherLayout";
import LoadState from "../LoadState";
import { useAppearanceSettings } from "./useAppearanceSettings";
import { api, apiObjectUrl } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { downloadBlob, initial, isoDate, pct, thaiDate, toCsv } from "../../lib/format";

const PAGE_SIZE = 10;

const statusCls = {
  normal: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
  pending: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
  noface: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
  rejected: "bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400",
  suspended: "bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400",
};

const statusIcon = { normal: CheckCircle2, pending: Clock, noface: ScanFace, rejected: XCircle, suspended: Ban };

const statusLabelKey = {
  normal: "common.status.normal",
  pending: "common.status.pending",
  noface: "live.faceNone",
  rejected: "live.faceRejected",
  suspended: "common.status.suspended",
};

// สถานะที่แสดงในหน้านี้: ระงับบัญชี > สถานะใบหน้าล่าสุด
function studentStatus(s) {
  if (!s.is_active) return "suspended";
  if (s.face_status === "approved") return "normal";
  if (s.face_status === "pending") return "pending";
  if (s.face_status === "rejected") return "rejected";
  return "noface";
}

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900";

export default function TeacherStudents() {
  const { t } = useAppearanceSettings();
  const studentsReq = useApi("/students", []);
  const pendingReq = useApi("/face/pending", []);
  const [view, setView] = useState("list");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [major, setMajor] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [faceStudent, setFaceStudent] = useState(null);
  const [editing, setEditing] = useState(null); // null | "new" | student
  const [actionError, setActionError] = useState("");

  const reload = () => {
    studentsReq.reload();
    pendingReq.reload();
  };

  const all = (studentsReq.data || []).map((s) => ({ ...s, status: studentStatus(s) }));
  const approvalByProfile = new Map((pendingReq.data || []).map((a) => [a.face_profile_id, a]));
  const majors = [...new Set(all.map((s) => s.major).filter(Boolean))];

  const q = search.trim().toLowerCase();
  const filtered = all.filter(
    (s) =>
      (!major || s.major === major) &&
      (!statusFilter || s.status === statusFilter) &&
      (!q || `${s.student_code} ${s.full_name} ${s.email}`.toLowerCase().includes(q))
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const students = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const count = (st) => all.filter((s) => s.status === st).length;
  const summaryStats = [
    { icon: <UsersRound className="w-6 h-6 text-blue-600 dark:text-blue-400" />, iconBg: "bg-blue-100 dark:bg-blue-950/40", label: t("students.stats.total"), value: all.length, sub: t("common.units.people") },
    { icon: <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />, iconBg: "bg-emerald-100 dark:bg-emerald-950/40", label: t("students.stats.registered"), value: count("normal"), sub: t("common.units.people"), trend: `${pct(count("normal"), all.length).toFixed(1)}%`, trendColor: "text-emerald-600 dark:text-emerald-400" },
    { icon: <Clock className="w-6 h-6 text-amber-500 dark:text-amber-400" />, iconBg: "bg-amber-100 dark:bg-amber-950/40", label: t("students.stats.pending"), value: count("pending"), sub: t("common.units.people"), trend: `${pct(count("pending"), all.length).toFixed(1)}%`, trendColor: "text-amber-500 dark:text-amber-400" },
    { icon: <Ban className="w-6 h-6 text-red-500 dark:text-red-400" />, iconBg: "bg-red-100 dark:bg-red-950/40", label: t("students.stats.suspended"), value: count("suspended"), sub: t("common.units.people"), trend: `${pct(count("suspended"), all.length).toFixed(1)}%`, trendColor: "text-red-500 dark:text-red-400" },
  ];

  const resetFilters = () => {
    setSearch("");
    setMajor("");
    setStatusFilter("");
    setPage(1);
  };

  const exportCsv = () => {
    const headers = ["รหัสนักศึกษา", "ชื่อ-นามสกุล", "อีเมล", "คณะ", "สาขาวิชา", "เบอร์โทร", "สถานะ"];
    const rows = filtered.map((s) => [s.student_code, s.full_name, s.email, s.faculty, s.major, s.phone, t(statusLabelKey[s.status])]);
    downloadBlob(`รายชื่อนักศึกษา_${isoDate()}.csv`, toCsv(headers, rows));
  };

  const removeStudent = async (s) => {
    if (!window.confirm(`${t("live.confirmDeleteStudent")} ${s.full_name} (${s.student_code})?`)) return;
    setActionError("");
    try {
      await api(`/students/${s.id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const actionButtons = (s) => (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={() => setFaceStudent(s)}
        title={t("live.viewFace")}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <Eye className="w-4 h-4" />
        {s.status === "pending" && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />}
      </button>
      <button
        onClick={() => setEditing(s)}
        title={t("common.actions.edit")}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        onClick={() => removeStudent(s)}
        title={t("live.delete")}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  const addButton = (extra) => (
    <button
      onClick={() => setEditing("new")}
      className={`${extra} items-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm shadow-blue-200 dark:shadow-blue-950 shrink-0`}
    >
      <Plus className="w-4 h-4" />
      {t("students.addStudent")}
    </button>
  );

  return (
    <TeacherLayout titleIcon={Users} titleKey="nav.students" subtitleKey="students.subtitle" headerExtra={addButton("hidden md:flex")}>
      <LoadState
        loading={studentsReq.loading}
        error={studentsReq.error || pendingReq.error || actionError}
        onRetry={reload}
      />

      {/* Add button for small screens */}
      <div className="flex md:hidden justify-end">{addButton("flex")}</div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {summaryStats.map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${s.iconBg}`}>{s.icon}</div>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{s.label}</div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{s.value}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{s.sub}</span>
              </div>
              {s.trend && <div className={`text-xs mt-0.5 truncate ${s.trendColor}`}>{s.trend}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Filter toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("students.searchPlaceholder")}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
          />
        </div>
        <FilterSelect label={t("students.filters.faculty")} allLabel={t("students.filters.all")} value={major} onChange={(v) => { setMajor(v); setPage(1); }}>
          {majors.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label={t("students.filters.status")} allLabel={t("students.filters.all")} value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }}>
          {Object.keys(statusLabelKey).map((k) => (
            <option key={k} value={k}>
              {t(statusLabelKey[k])}
            </option>
          ))}
        </FilterSelect>
        <button onClick={resetFilters} className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors px-3 py-2.5 shrink-0">
          <RotateCcw className="w-4 h-4" />
          {t("students.filters.reset")}
        </button>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 shrink-0">
          <button
            onClick={() => setView("grid")}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
              view === "grid" ? "bg-blue-600 text-white" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
              view === "list" ? "bg-blue-600 text-white" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Student list card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">
            {t("students.listTitlePrefix")}{" "}
            <span className="text-slate-400 dark:text-slate-500 font-medium">
              ({filtered.length} {t("common.units.people")})
            </span>
          </h3>
          <button onClick={exportCsv} className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Download className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            {t("students.exportData")}
          </button>
        </div>

        {view === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="text-left text-xs text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2 pr-3 font-medium">{t("students.table.photo")}</th>
                  <th className="py-2 pr-3 font-medium">{t("students.table.studentId")}</th>
                  <th className="py-2 pr-3 font-medium">{t("students.table.name")}</th>
                  <th className="py-2 pr-3 font-medium">{t("live.email")}</th>
                  <th className="py-2 pr-3 font-medium">{t("students.table.major")}</th>
                  <th className="py-2 pr-3 font-medium">{t("students.table.status")}</th>
                  <th className="py-2 pr-3 font-medium">{t("students.table.registeredDate")}</th>
                  <th className="py-2 pr-3 font-medium text-right">{t("students.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const StatusIcon = statusIcon[s.status];
                  return (
                    <tr key={s.id} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                      <td className="py-3 pr-3">
                        <Avatar name={s.full_name} />
                      </td>
                      <td className="py-3 pr-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{s.student_code}</td>
                      <td className="py-3 pr-3 text-slate-800 dark:text-slate-100 font-medium whitespace-nowrap">{s.full_name}</td>
                      <td className="py-3 pr-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{s.email}</td>
                      <td className="py-3 pr-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{s.major || "-"}</td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusCls[s.status]}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {t(statusLabelKey[s.status])}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{thaiDate(s.created_at)}</td>
                      <td className="py-3 pr-3">{actionButtons(s)}</td>
                    </tr>
                  );
                })}
                {!studentsReq.loading && students.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                      {t("history.noData")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {students.map((s) => {
              const StatusIcon = statusIcon[s.status];
              return (
                <div key={s.id} className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
                  <Avatar name={s.full_name} large />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{s.full_name}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 truncate">
                      {s.student_code} • {s.major || "-"}
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1.5 ${statusCls[s.status]}`}>
                      <StatusIcon className="w-3 h-3" />
                      {t(statusLabelKey[s.status])}
                    </span>
                  </div>
                  {actionButtons(s)}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 mt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-400 dark:text-slate-500">
            {t("students.showingPrefix")} {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0} -{" "}
            {(currentPage - 1) * PAGE_SIZE + students.length} {t("students.showingFrom")} {filtered.length}{" "}
            {t("students.showingSuffix")}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                  currentPage === n ? "bg-blue-600 text-white" : "border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
              disabled={currentPage === pageCount}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {faceStudent && (
        <FaceModal
          student={faceStudent}
          approval={approvalByProfile.get(faceStudent.face_profile_id)}
          onClose={() => setFaceStudent(null)}
          onDecided={() => {
            setFaceStudent(null);
            reload();
          }}
        />
      )}
      {editing && (
        <StudentFormModal
          student={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </TeacherLayout>
  );
}

function Avatar({ name, large }) {
  return (
    <div
      className={`${large ? "w-12 h-12" : "w-9 h-9"} rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0`}
    >
      {initial(name)}
    </div>
  );
}

function FilterSelect({ label, allLabel, value, onChange, children }) {
  return (
    <label className="relative flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-xl pl-4 pr-9 py-2.5 text-sm text-slate-600 dark:text-slate-300 font-medium shrink-0">
      <span className="text-slate-400 dark:text-slate-500">{label}:</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="appearance-none bg-transparent focus:outline-none cursor-pointer">
        <option value="">{allLabel}</option>
        {children}
      </select>
      <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 pointer-events-none" />
    </label>
  );
}

function ModalShell({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800">{footer}</div>}
      </div>
    </div>
  );
}

// ดูรูปใบหน้าที่ลงทะเบียนไว้ และอนุมัติ/ปฏิเสธเมื่อรออนุมัติ
function FaceModal({ student, approval, onClose, onDecided }) {
  const { t } = useAppearanceSettings();
  const [image, setImage] = useState({ url: "", error: "" });
  const [remark, setRemark] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!student.face_profile_id) return undefined;
    let url = "";
    let cancelled = false;
    apiObjectUrl(`/face/${student.face_profile_id}/image`)
      .then((u) => {
        url = u;
        if (!cancelled) setImage({ url: u, error: "" });
      })
      .catch((err) => !cancelled && setImage({ url: "", error: err.message }));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [student.face_profile_id]);

  async function decide(status) {
    setBusy(true);
    setError("");
    try {
      await api(`/face/${approval.id}/decision`, { method: "POST", body: { status, remark: remark || null } });
      onDecided();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell
      title={`${t("live.faceOf")} ${student.full_name}`}
      onClose={onClose}
      footer={
        approval ? (
          <>
            <button
              onClick={() => decide("rejected")}
              disabled={busy}
              className="flex items-center gap-2 border border-red-200 dark:border-red-900 text-red-500 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-60"
            >
              <XCircle className="w-4 h-4" />
              {t("live.reject")}
            </button>
            <button
              onClick={() => decide("approved")}
              disabled={busy}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {t("live.approve")}
            </button>
          </>
        ) : null
      }
    >
      {error && <div className="text-sm text-red-500">{error}</div>}
      <div className="text-sm text-slate-500 dark:text-slate-400">
        {student.student_code} • {t(statusLabelKey[studentStatus(student)])}
      </div>
      {!student.face_profile_id ? (
        <div className="py-10 text-center text-sm text-slate-400">{t("live.noFaceYet")}</div>
      ) : image.error ? (
        <div className="py-10 text-center text-sm text-red-500">{image.error}</div>
      ) : image.url ? (
        <img src={image.url} alt={student.full_name} className="w-full max-h-96 object-contain rounded-xl bg-slate-50 dark:bg-slate-800" />
      ) : (
        <div className="py-10 text-center text-sm text-slate-400">{t("live.loading")}</div>
      )}
      {approval && (
        <input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder={t("live.remarkPlaceholder")} className={inputCls} />
      )}
    </ModalShell>
  );
}

// เพิ่ม/แก้ไขข้อมูลนักศึกษา
function StudentFormModal({ student, onClose, onSaved }) {
  const { t } = useAppearanceSettings();
  const isNew = !student;
  const [form, setForm] = useState({
    email: student?.email || "",
    password: "",
    student_code: student?.student_code || "",
    first_name: student?.first_name || "",
    last_name: student?.last_name || "",
    faculty: student?.faculty || "",
    major: student?.major || "",
    phone: student?.phone || "",
    is_active: student?.is_active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSave() {
    setBusy(true);
    setError("");
    const profile = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      faculty: form.faculty.trim() || null,
      major: form.major.trim() || null,
      phone: form.phone.trim() || null,
    };
    try {
      if (isNew) {
        await api("/students", {
          method: "POST",
          body: { ...profile, email: form.email.trim(), password: form.password, student_code: form.student_code.trim() },
        });
      } else {
        await api(`/students/${student.id}`, { method: "PUT", body: { ...profile, is_active: form.is_active } });
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const field = (key, label, props = {}) => (
    <div>
      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{label}</label>
      <input value={form[key]} onChange={set(key)} className={inputCls} {...props} />
    </div>
  );

  return (
    <ModalShell
      title={isNew ? t("students.addStudent") : `${t("common.actions.edit")} ${student.full_name}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
            {t("common.actions.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={busy}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t("common.actions.save")}
          </button>
        </>
      }
    >
      {error && <div className="text-sm text-red-500">{error}</div>}
      {isNew && (
        <div className="grid grid-cols-2 gap-4">
          {field("student_code", t("students.table.studentId"))}
          {field("email", t("live.email"), { type: "email" })}
        </div>
      )}
      {isNew && field("password", t("live.initialPassword"), { type: "text", placeholder: t("live.passwordHint") })}
      <div className="grid grid-cols-2 gap-4">
        {field("first_name", t("live.firstName"))}
        {field("last_name", t("live.lastName"))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {field("faculty", t("live.faculty"))}
        {field("major", t("students.table.major"))}
      </div>
      {field("phone", t("live.phone"))}
      {!isNew && (
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={!form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: !e.target.checked }))} />
          {t("live.suspendAccount")}
        </label>
      )}
    </ModalShell>
  );
}
