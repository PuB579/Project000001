import { useState } from "react";
import {
  User,
  Mail,
  Phone,
  Building2,
  CalendarDays,
  GraduationCap,
  Lock,
  Eye,
  EyeOff,
  Save,
  Pencil,
  X,
  CalendarCheck,
  UsersRound,
  BookMarked,
  CheckCircle2,
  Users,
} from "lucide-react";
import TeacherLayout from "./TeacherLayout";
import LoadState from "../LoadState";
import { useAppearanceSettings } from "./useAppearanceSettings";
import { colorOf, useTeacherData } from "./useTeacherData";
import { api, updateStoredUser } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { initial, termLabel, thaiDate } from "../../lib/format";
export default function TeacherProfile() {
  const { t } = useAppearanceSettings();
  const [activeTab, setActiveTab] = useState("info");
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState("");
  const meReq = useApi("/teachers/me");
  const me = meReq.data;
  const { classes, records } = useTeacherData();
  const [draft, setDraft] = useState(null); // ข้อมูลที่กำลังแก้ (null = ไม่ได้แก้)
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  const form = draft || {
    firstName: me?.first_name || "",
    lastName: me?.last_name || "",
    title: me?.position || "",
    department: me?.department_name || "-",
    email: me?.email || "",
    phone: me?.phone || "",
  };
  const fullName = `${form.firstName} ${form.lastName}`.trim();
  const teachingCourses = classes.map((c, i) => ({
    id: c.id,
    code: c.course_code || "-",
    name: c.course_name,
    term: termLabel(c),
    students: c.student_count,
    color: colorOf(i).icon,
  }));
  const sessionCount = new Set(records.map((r) => r.session_id)).size;

  const flash = (message) => {
    setSaved(message);
    setTimeout(() => setSaved(""), 2500);
  };
  const tabs = [
    { id: "info", label: t("profile.tabs.info") },
    { id: "security", label: t("profile.tabs.security") },
    { id: "courses", label: t("profile.tabs.courses") },
  ];

  const stats = [
    { icon: BookMarked, label: t("profile.stats.coursesTeaching"), value: classes.length, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-950/40" },
    { icon: UsersRound, label: t("profile.stats.totalStudents"), value: classes.reduce((s, c) => s + c.student_count, 0), color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950/40" },
    { icon: CalendarCheck, label: t("live.sessionsHeld"), value: sessionCount, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-950/40" },
  ];

  function updateField(key, value) {
    setDraft((prev) => ({ ...(prev || form), [key]: value }));
  }

  function startEdit() {
    setDraft(form);
    setFormError("");
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(null);
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    setFormError("");
    try {
      const updated = await api("/teachers/me", {
        method: "PUT",
        body: {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          position: form.title.trim() || null,
          phone: form.phone.trim() || null,
        },
      });
      updateStoredUser({ full_name: updated.full_name });
      meReq.reload();
      setDraft(null);
      setEditing(false);
      flash(t("profile.savedMessage"));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    setFormError("");
    if (pw.next.length < 6) return setFormError(t("live.passwordTooShort"));
    if (pw.next !== pw.confirm) return setFormError(t("live.passwordMismatch"));
    setSaving(true);
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: { current_password: pw.current, new_password: pw.next },
      });
      setPw({ current: "", next: "", confirm: "" });
      flash(t("live.passwordChanged"));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <TeacherLayout titleIcon={User} titleKey="nav.profile" subtitleKey="profile.subtitle">
      <LoadState loading={meReq.loading} error={meReq.error || formError} onRetry={meReq.reload} />
      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6 items-start">
        {/* ---------- Left: profile card ---------- */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 text-center xl:sticky xl:top-6">
          <div className="w-28 h-28 mx-auto rounded-full bg-blue-600 text-white text-4xl font-bold flex items-center justify-center ring-4 ring-blue-50 dark:ring-blue-950/40">
            {initial(fullName)}
          </div>

          <div className="mt-4">
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {fullName || "-"}
            </div>
            <div className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{form.title || t("role.teacher")}</div>
          </div>

          <div className="mt-5 space-y-2.5 text-left">
            <InfoLine icon={Mail} value={form.email} />
            <InfoLine icon={Phone} value={form.phone || "-"} />
            <InfoLine icon={Building2} value={form.department} />
            <InfoLine icon={CalendarDays} value={`${t("live.joinedPrefix")} ${thaiDate(me?.created_at)}`} />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-1.5 ${s.bg}`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">{s.value}</div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ---------- Right: tabs content ---------- */}
        <div className="min-w-0 space-y-5">
          {/* Tabs */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-2 flex flex-wrap gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {saved && (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 text-sm font-medium rounded-xl px-4 py-3">
              <CheckCircle2 className="w-4 h-4" />
              {saved}
            </div>
          )}

          {/* ---- Tab: ข้อมูลส่วนตัว ---- */}
          {activeTab === "info" && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">{t("profile.infoTitle")}</h3>
                {!editing ? (
                  <button
                    onClick={startEdit}
                    className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {t("common.actions.edit")}
                  </button>
                ) : (
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <X className="w-3.5 h-3.5" />
                    {t("common.actions.cancel")}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={t("profile.fields.firstName")} value={form.firstName} editing={editing} onChange={(v) => updateField("firstName", v)} />
                <Field label={t("profile.fields.lastName")} value={form.lastName} editing={editing} onChange={(v) => updateField("lastName", v)} />
                <Field label={t("profile.fields.title")} value={form.title} editing={editing} onChange={(v) => updateField("title", v)} full />
                <Field label={t("profile.fields.department")} value={form.department} editing={false} full icon={Building2} />
                <Field label={t("profile.fields.email")} value={form.email} editing={false} icon={Mail} />
                <Field label={t("profile.fields.phone")} value={form.phone} editing={editing} onChange={(v) => updateField("phone", v)} icon={Phone} />
              </div>

              {editing && (
                <button
                  onClick={handleSave}
                  className="mt-6 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm shadow-blue-100 dark:shadow-blue-950"
                >
                  <Save className="w-4 h-4" />
                  {saving ? t("live.saving") : t("profile.saveChanges")}
                </button>
              )}
            </div>
          )}

          {/* ---- Tab: ความปลอดภัย ---- */}
          {activeTab === "security" && (
            <div className="space-y-5">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Lock className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">{t("profile.changePasswordTitle")}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{t("profile.fields2.currentPassword")}</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={pw.current}
                        onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
                      />
                      <button
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                        type="button"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{t("profile.fields2.newPassword")}</label>
                    <input
                      type="password"
                      value={pw.next}
                      onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{t("profile.fields2.confirmPassword")}</label>
                    <input
                      type="password"
                      value={pw.confirm}
                      onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
                    />
                  </div>
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={saving || !pw.current || !pw.next}
                  className="mt-6 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-colors text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm shadow-blue-100 dark:shadow-blue-950"
                >
                  <Save className="w-4 h-4" />
                  {t("profile.updatePassword")}
                </button>
              </div>

            </div>
          )}

          {/* ---- Tab: รายวิชาที่สอน ---- */}
          {activeTab === "courses" && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <GraduationCap className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100">{t("profile.coursesTabTitle")}</h3>
              </div>
              <div className="space-y-3">
                {teachingCourses.length === 0 && (
                  <div className="text-sm text-slate-400 dark:text-slate-500">{t("live.noCourses")}</div>
                )}
                {teachingCourses.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <span className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${c.color}`}>
                      {c.code.split("-").pop()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{c.name}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">
                        {c.code} · {t("profile.termPrefix")} {c.term}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 shrink-0">
                      <Users className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      {c.students} {t("common.units.people")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}

function InfoLine({ icon: Icon, value }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
      <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
      <span className="truncate">{value}</span>
    </div>
  );
}

function Field({ label, value, editing, onChange, icon: Icon, full }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">{label}</label>
      {editing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
        />
      ) : (
        <div className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-100 font-medium px-0.5 py-2.5">
          {Icon && <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />}
          <span className="truncate">{value || "-"}</span>
        </div>
      )}
    </div>
  );
}

export function ToggleSwitch({ defaultChecked = false, onChange }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <button
      type="button"
      onClick={() => {
        setChecked((v) => {
          const next = !v;
          onChange && onChange(next);
          return next;
        });
      }}
      className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ${checked ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"}`}
      aria-pressed={checked}
    >
      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? "left-6" : "left-1"}`} />
    </button>
  );
}