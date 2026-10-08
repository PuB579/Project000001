import { useState } from "react";
import {
  BellRing,
  Palette,
  Lock,
  Globe,
  Type,
  Sun,
  Moon,
  Laptop,
  Download,
  Save,
  CheckCircle2,
} from "lucide-react";
import { ToggleSwitch } from "./TeacherProfile";
import { api } from "../../lib/api";
import { useAppearanceSettings } from "./useAppearanceSettings";
import TeacherLayout from "./TeacherLayout";

const themeOptions = [
  { id: "light", icon: Sun, labelKey: "display.theme.light" },
  { id: "dark", icon: Moon, labelKey: "display.theme.dark" },
  { id: "system", icon: Laptop, labelKey: "display.theme.system" },
];

const fontSizeOptions = [
  { id: "small", labelKey: "display.fontSize.small" },
  { id: "normal", labelKey: "display.fontSize.normal" },
  { id: "large", labelKey: "display.fontSize.large" },
];

const NOTIF_KEY = "cs-faceattend-notifications";
const NOTIF_DEFAULTS = {
  email: true,
  absentStreak: true,
  dailySummary: false,
  newRegistration: true,
};

function loadNotif() {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    return raw ? { ...NOTIF_DEFAULTS, ...JSON.parse(raw) } : NOTIF_DEFAULTS;
  } catch {
    return NOTIF_DEFAULTS;
  }
}

export default function TeacherSettings() {
  const [saved, setSaved] = useState(false);
  const [notif, setNotif] = useState(loadNotif);
  const { theme, language, fontSize, setTheme, setLanguage, setFontSize, t } =
    useAppearanceSettings();

  function updateNotif(patch) {
    setNotif((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      return next;
    });
  }

  function handleSave() {
    // theme/fontSize/language และ notif ถูกบันทึกลง localStorage ทันทีที่กดอยู่แล้ว
    // จุดนี้คือที่เหมาะจะยิง API ไปเก็บที่ฝั่งเซิร์ฟเวอร์ในอนาคต
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function handleExport() {
    // ข้อมูลบัญชีและรายวิชาจาก backend (ถ้าโหลดไม่ได้ก็ยังส่งออกการตั้งค่าได้)
    const [profile, courses] = await Promise.all([
      api("/teachers/me").catch(() => null),
      api("/classes/mine").catch(() => []),
    ]);
    const data = {
      exportedAt: new Date().toISOString(),
      profile,
      courses,
      notifications: notif,
      display: { theme, language, fontSize },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "account-data.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <TeacherLayout titleKey="header.title" subtitleKey="header.subtitle">
      {saved && (
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 text-sm font-medium rounded-xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4" />
          {t("saved")}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ---- Notifications ---- */}
        <SectionCard icon={BellRing} title={t("notifications.title")} color="blue">
          <ToggleRow
            title={t("notifications.email.title")}
            desc={t("notifications.email.desc")}
            checked={notif.email}
            onChange={(v) => updateNotif({ email: v })}
          />
          <ToggleRow
            title={t("notifications.absentStreak.title")}
            desc={t("notifications.absentStreak.desc")}
            checked={notif.absentStreak}
            onChange={(v) => updateNotif({ absentStreak: v })}
          />
          <ToggleRow
            title={t("notifications.dailySummary.title")}
            desc={t("notifications.dailySummary.desc")}
            checked={notif.dailySummary}
            onChange={(v) => updateNotif({ dailySummary: v })}
          />
          <ToggleRow
            title={t("notifications.newRegistration.title")}
            desc={t("notifications.newRegistration.desc")}
            checked={notif.newRegistration}
            onChange={(v) => updateNotif({ newRegistration: v })}
            last
          />
        </SectionCard>

        {/* ---- Display & language ---- */}
        <SectionCard icon={Palette} title={t("display.title")} color="purple">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 block">
              {t("display.theme.label")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all ${
                    theme === opt.id
                      ? "border-transparent ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/40"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <opt.icon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    {t(opt.labelKey)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              {t("display.language.label")}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
            >
              {/* ชื่อภาษาในตัวเลือกนี้แสดงเป็นชื่อของภาษานั้น ๆ เอง ไม่แปลตามภาษาที่เลือกอยู่ */}
              <option value="th">ภาษาไทย</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              {t("display.fontSize.label")}
            </label>
            <div className="flex gap-2">
              {fontSizeOptions.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFontSize(f.id)}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    fontSize === f.id
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {t(f.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* ---- Privacy & data ---- */}
        <SectionCard icon={Lock} title={t("privacy.title")} color="rose">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {t("privacy.desc")}
          </p>
          <button
            onClick={handleExport}
            className="mt-4 w-full flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200 text-sm font-semibold px-4 py-2.5 rounded-xl"
          >
            <Download className="w-4 h-4" />
            {t("privacy.download")}
          </button>
        </SectionCard>
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-4 flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-lg shadow-blue-200 dark:shadow-blue-950"
        >
          <Save className="w-4 h-4" />
          {t("saveAll")}
        </button>
      </div>
    </TeacherLayout>
  );
}

function SectionCard({ icon: Icon, title, color, children }) {
  const colorMap = {
    blue: "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
    emerald:
      "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
    purple:
      "bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400",
    rose: "bg-rose-100 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400",
  };
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorMap[color]}`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ title, desc, checked, onChange, last }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-3 ${
        !last ? "border-b border-slate-100 dark:border-slate-800" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
          {desc}
        </div>
      </div>
      <ToggleSwitch defaultChecked={checked} onChange={onChange} />
    </div>
  );
}