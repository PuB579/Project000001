import { useState } from "react";
import { Megaphone, Pin, PinOff, Pencil, Trash2, Save, X, Loader2 } from "lucide-react";
import TeacherLayout from "./TeacherLayout";
import LoadState from "../LoadState";
import { useAppearanceSettings } from "./useAppearanceSettings";
import { api } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { thaiDate } from "../../lib/format";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900";

const EMPTY = { title: "", body: "", class_id: "", pinned: false };

export default function TeacherAnnouncements() {
  const { t } = useAppearanceSettings();
  const listReq = useApi("/announcements", []);
  const classesReq = useApi("/classes/mine", []);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const classById = new Map((classesReq.data || []).map((c) => [c.id, c]));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function run(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
      listReq.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const submit = () =>
    run(async () => {
      if (!form.title.trim() || !form.body.trim()) throw new Error(t("live.announceRequired"));
      if (editingId) {
        await api(`/announcements/${editingId}`, {
          method: "PUT",
          body: { title: form.title.trim(), body: form.body.trim(), pinned: form.pinned },
        });
      } else {
        await api("/announcements", {
          method: "POST",
          body: {
            title: form.title.trim(),
            body: form.body.trim(),
            pinned: form.pinned,
            class_id: form.class_id ? Number(form.class_id) : null,
          },
        });
      }
      setForm(EMPTY);
      setEditingId(null);
    });

  const startEdit = (a) => {
    setEditingId(a.id);
    setForm({ title: a.title, body: a.body, class_id: a.class_id ? String(a.class_id) : "", pinned: a.pinned });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = (a) => {
    if (!window.confirm(`${t("live.confirmDeleteAnnouncement")} "${a.title}"?`)) return;
    run(() => api(`/announcements/${a.id}`, { method: "DELETE" }));
  };

  const togglePin = (a) => run(() => api(`/announcements/${a.id}`, { method: "PUT", body: { pinned: !a.pinned } }));

  return (
    <TeacherLayout titleIcon={Megaphone} titleKey="nav.announcements" subtitleKey="live.announcementsSubtitle">
      <LoadState loading={listReq.loading} error={listReq.error || error} onRetry={listReq.reload} />

      {/* Create / edit form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-slate-100">
          {editingId ? t("live.editAnnouncement") : t("live.newAnnouncement")}
        </h3>
        <input value={form.title} onChange={set("title")} placeholder={t("live.announceTitle")} className={inputCls} />
        <textarea value={form.body} onChange={set("body")} rows={4} placeholder={t("live.announceBody")} className={`${inputCls} resize-y`} />
        <div className="flex flex-wrap items-center gap-4">
          <select value={form.class_id} onChange={set("class_id")} disabled={!!editingId} className={`${inputCls} sm:w-80 disabled:opacity-60`}>
            <option value="">{t("live.allStudents")}</option>
            {(classesReq.data || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.course_code} {c.course_name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={form.pinned} onChange={set("pinned")} />
            {t("live.pinAnnouncement")}
          </label>
          <div className="flex-1" />
          {editingId && (
            <button
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
              {t("common.actions.cancel")}
            </button>
          )}
          <button
            onClick={submit}
            disabled={busy}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editingId ? t("common.actions.save") : t("live.publish")}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {!listReq.loading && (listReq.data || []).length === 0 && (
          <div className="text-sm text-slate-400 dark:text-slate-500">{t("live.noAnnouncements")}</div>
        )}
        {(listReq.data || []).map((a) => {
          const cls = a.class_id ? classById.get(a.class_id) : null;
          return (
            <div
              key={a.id}
              className={`rounded-2xl border shadow-sm p-5 ${
                a.pinned
                  ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900"
                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {a.pinned && (
                    <div className="flex items-center gap-1.5 text-rose-500 text-xs font-semibold mb-1">
                      <Pin className="w-3.5 h-3.5" />
                      {t("live.pinned")}
                    </div>
                  )}
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">{a.title}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 whitespace-pre-line">{a.body}</p>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                    {a.teacher_name || "-"} • {cls ? `${cls.course_code} ${cls.course_name}` : t("live.allStudents")} •{" "}
                    {thaiDate(a.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <IconButton onClick={() => togglePin(a)} title={a.pinned ? t("live.unpin") : t("live.pinAnnouncement")}>
                      {a.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </IconButton>
                    <IconButton onClick={() => startEdit(a)} title={t("common.actions.edit")}>
                      <Pencil className="w-4 h-4" />
                    </IconButton>
                    <IconButton onClick={() => remove(a)} title={t("live.delete")} danger>
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </TeacherLayout>
  );
}

function IconButton({ onClick, title, danger, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 transition-colors ${
        danger ? "hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" : "hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}
