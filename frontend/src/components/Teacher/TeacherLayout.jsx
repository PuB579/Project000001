import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  History,
  ClipboardList,
  Users,
  Download,
  User,
  Settings as SettingsIcon,
  LogOut,
  Bell,
  ChevronDown,
  ShieldCheck,
  CheckCircle2,
  Award,
  Megaphone,
} from "lucide-react";
import logoImg from "../../assets/logo-cs.png";
import { useAppearanceSettings } from "./useAppearanceSettings";
import { getUser } from "../../lib/api";
import { initial } from "../../lib/format";

const navItems = [
  { icon: LayoutDashboard, labelKey: "nav.dashboard", to: "/teacher-dashboard" },
  { icon: BookOpen, labelKey: "nav.courses", to: "/teacher-courses" },
  { icon: History, labelKey: "nav.history", to: "/teacher-history" },
  { icon: ClipboardList, labelKey: "nav.report", to: "/teacher-report" },
  { icon: Award, labelKey: "nav.scores", to: "/teacher-scores" },
  { icon: Users, labelKey: "nav.students", to: "/teacher-students" },
  { icon: Megaphone, labelKey: "nav.announcements", to: "/teacher-announcements" },
  { icon: Download, labelKey: "nav.export", to: "/teacher-export" },
  { icon: User, labelKey: "nav.profile", to: "/teacher-profile" },
  { icon: SettingsIcon, labelKey: "nav.settings", to: "/teacher-settings" },
];

/**
 * ใช้ครอบเนื้อหาของทุกหน้าฝั่งอาจารย์ เช่น:
 *
 *   <TeacherLayout titleIcon={BookOpen} titleKey="nav.courses" subtitleKey="courses.subtitle">
 *     ...เนื้อหาเฉพาะของหน้านั้น...
 *   </TeacherLayout>
 *
 * Props:
 * - titleIcon: ไอคอน lucide-react ที่จะโชว์หน้าหัวข้อ (ไม่บังคับ)
 * - titleKey / subtitleKey: คีย์คำแปลสำหรับหัวข้อ/คำอธิบายแบบข้อความล้วน
 * - titleContent: ใส่แทน titleKey ได้ เมื่อหัวข้อต้องเป็น JSX ที่ซับซ้อนกว่าข้อความเดียว
 *   (เช่นหน้าแดชบอร์ดที่ทักทายชื่ออาจารย์ + อีโมจิ)
 * - headerExtra: ปุ่ม/องค์ประกอบเสริมในหัว วางไว้ก่อนไอคอนกระดิ่ง (เช่นปุ่มเลือกวันที่)
 *
 * เพราะ theme/language ถูกอ่าน+ผูกไว้ในนี้ที่เดียว ทุกหน้าที่ใช้ layout นี้
 * จะเปลี่ยนธีม/ภาษาตามกันโดยอัตโนมัติ ไม่ต้องไปเขียนซ้ำทุกไฟล์
 */
export default function TeacherLayout({
  titleIcon: TitleIcon,
  titleKey,
  titleContent,
  subtitleKey,
  headerExtra,
  children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { t } = useAppearanceSettings();
  const location = useLocation();
  const user = getUser();

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 font-sans flex">
      {/* ---------- Sidebar ---------- */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0 lg:w-64"
        } shrink-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col transition-all overflow-hidden`}
      >
        <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <img
            src={logoImg}
            alt="CS FaceAttend"
            className="h-10 w-auto object-contain"
          />
          <div className="leading-tight">
            <div className="text-base font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
              {t("app.name")}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
              {t("app.tagline")}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map(({ icon: Icon, labelKey, to }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {t(labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 pb-4">
          <Link
            to="/login"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors whitespace-nowrap"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {t("nav.logout")}
          </Link>
        </div>

        <div className="p-4">
          <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 p-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t("security.title")}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1.5">
              {t("security.desc")}
            </div>
            <div className="inline-flex items-center gap-1.5 mt-4 bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t("security.badge")}
            </div>
          </div>
        </div>
      </aside>

      {/* ---------- Main ---------- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4 px-6 shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 lg:hidden"
            aria-label={t("common.toggleMenu")}
          >
            <LayoutDashboard className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {TitleIcon && (
                <TitleIcon className="w-5 h-5 text-slate-700 dark:text-slate-300 shrink-0" />
              )}
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                {titleContent ?? t(titleKey)}
              </h1>
            </div>
            {subtitleKey && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                {t(subtitleKey)}
              </p>
            )}
          </div>

          <div className="flex-1" />

          {headerExtra}

          <button className="relative w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
            <Bell className="w-5 h-5" />
          </button>

          <Link to="/teacher-profile" className="flex items-center gap-2.5 pl-2 shrink-0">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
              {initial(user?.full_name)}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                {user?.full_name || "-"}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                {t("role.teacher")}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 hidden sm:block" />
          </Link>
        </header>

        {/* Body — เนื้อหาเฉพาะของแต่ละหน้า */}
        <main className="flex-1 overflow-y-auto p-6 space-y-5">{children}</main>

        <footer className="text-center text-xs text-slate-400 dark:text-slate-500 py-6">
          © 2026 Computer Science AI Face Attendance System. All rights
          reserved.
        </footer>
      </div>
    </div>
  );
}