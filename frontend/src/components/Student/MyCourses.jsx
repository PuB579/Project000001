import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Home,
  ScanFace,
  History,
  UserPlus,
  BookOpen,
  CalendarDays,
  User,
  Settings,
  Megaphone,
  LogOut,
  Menu,
  Search,
  Bell,
  ChevronDown,
  ShieldCheck,
  CheckCircle2,
  BarChart3,
  Code2,
  Database,
  Cpu,
  Brain,
  MapPin,
  Info,
} from "lucide-react";
import logoImg from "../../assets/logo-cs.png";
import { getUser } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { classPhase, countStatus, groupBy, hhmm, initial, isoDate, termLabel, thaiDate } from "../../lib/format";

const COLORS = ["blue", "amber", "emerald", "purple", "sky", "rose"];
const ICONS = [Code2, Database, Cpu, Brain, BarChart3];

const navItems = [
  { icon: Home, label: "หน้าหลัก", to: "/dashboard" },
  { icon: ScanFace, label: "เช็คชื่อ", to: "/checkin" },
  { icon: History, label: "ประวัติการเช็คชื่อ", to: "/history" },
  { icon: UserPlus, label: "ลงทะเบียนใบหน้า", to: "/face-registration" },
  { icon: BookOpen, label: "วิชาเรียนของฉัน", to: "/courses", active: true },
  { icon: CalendarDays, label: "ตารางเรียน", to: "/schedule" },
  { icon: Megaphone, label: "ประกาศ", to: "/announcements" },
  { icon: User, label: "โปรไฟล์", to: "/profile" },
  { icon: Settings, label: "ตั้งค่า", to: "/settings" },
];

const colorMap = {
  blue: {
    border: "border-l-blue-500",
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
    codeText: "text-blue-600",
    btn: "bg-blue-50 text-blue-600 hover:bg-blue-100",
    bar: "bg-blue-500",
  },
  amber: {
    border: "border-l-amber-500",
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
    codeText: "text-amber-600",
    btn: "bg-amber-50 text-amber-600 hover:bg-amber-100",
    bar: "bg-amber-500",
  },
  emerald: {
    border: "border-l-emerald-500",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    codeText: "text-emerald-600",
    btn: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
    bar: "bg-emerald-500",
  },
  purple: {
    border: "border-l-purple-500",
    iconBg: "bg-purple-100",
    iconText: "text-purple-600",
    codeText: "text-purple-600",
    btn: "bg-purple-50 text-purple-600 hover:bg-purple-100",
    bar: "bg-purple-500",
  },
  sky: {
    border: "border-l-sky-500",
    iconBg: "bg-sky-100",
    iconText: "text-sky-600",
    codeText: "text-sky-600",
    btn: "bg-sky-50 text-sky-600 hover:bg-sky-100",
    bar: "bg-sky-500",
  },
  rose: {
    border: "border-l-rose-500",
    iconBg: "bg-rose-100",
    iconText: "text-rose-600",
    codeText: "text-rose-600",
    btn: "bg-rose-50 text-rose-600 hover:bg-rose-100",
    bar: "bg-rose-500",
  },
};

export default function MyCourses() {
  const user = getUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [today] = useState(() => isoDate());
  const [term, setTerm] = useState("");
  const [phase, setPhase] = useState("");
  const [openId, setOpenId] = useState(null);
  const classesReq = useApi("/classes/mine", []);
  const sessionsReq = useApi(`/attendance/my-sessions?start=2000-01-01&end=${today}`, []);
  const sessionsByClass = groupBy(sessionsReq.data || [], (s) => s.class_id);

  const allCourses = (classesReq.data || []).map((c, i) => {
    const sessions = sessionsByClass.get(c.id) || [];
    const cnt = countStatus(sessions);
    const last = sessions[sessions.length - 1];
    return {
      id: c.id,
      code: c.course_code,
      name: c.course_name,
      nameEn: c.class_name && c.class_name !== c.course_name ? c.class_name : `${c.credit ?? "-"} หน่วยกิต`,
      teacher: c.teacher_name || "-",
      schedule: last ? `ล่าสุด ${thaiDate(last.session_date)} ${hhmm(last.start_time)}` : "ยังไม่มีคาบเรียน",
      room: `กลุ่ม ${c.class_code || "-"}`,
      term: termLabel(c),
      phase: classPhase(c, today),
      counts: cnt,
      attended: cnt.present + cnt.late,
      total: cnt.total,
      icon: ICONS[i % ICONS.length],
      color: COLORS[i % COLORS.length],
    };
  });
  const terms = [...new Set(allCourses.map((c) => c.term))];
  const courses = allCourses.filter((c) => (!term || c.term === term) && (!phase || c.phase === phase));
  const overall = countStatus(courses.flatMap((c) => sessionsByClass.get(c.id) || []));
  const loadError = classesReq.error || sessionsReq.error;
  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans flex">
      {/* ---------- Sidebar ---------- */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0 lg:w-64"
        } shrink-0 bg-white border-r border-slate-100 flex flex-col transition-all overflow-hidden`}
      >
        <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-100 shrink-0">
          <img src={logoImg} alt="CS FaceAttend" className="h-10 w-auto object-contain" />
          <div className="leading-tight">
            <div className="text-base font-bold text-slate-900 whitespace-nowrap">
              CS FaceAttend
            </div>
            <div className="text-[10px] text-slate-400 whitespace-nowrap">
              Computer Science AI Face Attendance System
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map(({ icon: Icon, label, to, active }) => (
            <Link
              key={label}
              to={to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                active
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-4 pb-4">
          <Link
            to="/login"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            ออกจากระบบ
          </Link>
        </div>

        <div className="p-4">
          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800 whitespace-nowrap">
                  ระบบปลอดภัย
                </div>
                <div className="text-xs text-slate-500 leading-snug mt-0.5">
                  ข้อมูลของคุณได้รับการปกป้องอย่างปลอดภัย
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-600">ออนไลน์</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ---------- Main ---------- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center gap-4 px-6 shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="สลับเมนู"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหารายวิชา..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-100 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="flex-1" />

          <button className="relative w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors shrink-0">
            <Bell className="w-5 h-5" />
          </button>

          <button className="flex items-center gap-2.5 pl-2 shrink-0">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
              {initial(user?.full_name)}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-semibold text-slate-800 whitespace-nowrap">
                {user?.full_name || "-"}
              </div>
              <div className="text-xs text-slate-400 whitespace-nowrap">นักศึกษา</div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
          </button>
        </header>

        {/* Body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title + filters */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                วิชาเรียนของฉัน
                <BookOpen className="w-5 h-5 text-slate-400" />
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {term ? `ภาคเรียนที่ ${term}` : "ทุกภาคเรียน"}
              </p>
              {loadError && <p className="text-sm text-red-500 mt-1">{loadError}</p>}
            </div>

            <div className="flex items-center gap-3">
              <select value={term} onChange={(e) => setTerm(e.target.value)} className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                <option value="">ทุกภาคเรียน</option>
                {terms.map((tm) => (
                  <option key={tm} value={tm}>
                    ภาคเรียน {tm}
                  </option>
                ))}
              </select>
              <select value={phase} onChange={(e) => setPhase(e.target.value)} className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                <option value="">ทั้งหมด</option>
                <option value="teaching">กำลังเรียน</option>
                <option value="ended">เรียนจบแล้ว</option>
              </select>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              icon={<BookOpen className="w-6 h-6 text-blue-600" />}
              iconBg="bg-blue-100"
              label="รายวิชาทั้งหมด"
              value={courses.length}
              sub="วิชา"
            />
            <StatCard
              icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
              iconBg="bg-emerald-100"
              label="เช็คชื่อครบ (ไม่ขาด)"
              value={courses.filter((c) => c.total > 0 && c.counts.absent === 0).length}
              sub="วิชา"
            />
            <StatCard
              icon={<BarChart3 className="w-6 h-6 text-purple-600" />}
              iconBg="bg-purple-100"
              label="อัตราเข้าเรียนเฉลี่ย"
              value={`${overall.rate.toFixed(1)}%`}
              sub="ของทั้งหมด"
            />
          </div>

          {/* Course cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {!classesReq.loading && courses.length === 0 && (
              <div className="text-sm text-slate-400">ยังไม่มีรายวิชาที่ลงทะเบียน</div>
            )}
            {courses.map((c) => {
              const cs = colorMap[c.color];
              const pct = c.total ? Math.round((c.attended / c.total) * 100) : 0;
              const Icon = c.icon;
              return (
                <div
                  key={c.id}
                  className={`bg-white rounded-2xl border border-slate-100 border-l-4 ${cs.border} shadow-sm p-5 flex flex-col`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${cs.iconBg}`}
                    >
                      <Icon className={`w-5 h-5 ${cs.iconText}`} />
                    </div>
                    <div className="min-w-0">
                      <div className={`font-bold text-sm ${cs.codeText}`}>{c.code}</div>
                      <div className="text-sm font-semibold text-slate-800 leading-snug">
                        {c.name}
                      </div>
                      <div className="text-xs text-slate-400">{c.nameEn}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {c.teacher}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-4">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {c.schedule}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {c.room}
                    </span>
                  </div>

                  <div className="mt-auto">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500">
                        เข้าเรียน {c.attended} / {c.total} ครั้ง
                      </span>
                      <span className={`font-semibold ${cs.codeText}`}>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
                      <div
                        className={`h-full rounded-full ${cs.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {openId === c.id && <CourseDetail course={c} />}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setOpenId(openId === c.id ? null : c.id)}
                        className={`flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors ${cs.btn}`}
                      >
                        {openId === c.id ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2">
            <Info className="w-3.5 h-3.5" />
            คลิกที่ "ดูรายละเอียด" เพื่อดูข้อมูลเพิ่มเติมของรายวิชา
          </div>
        </main>

        <footer className="text-center text-xs text-slate-400 py-6">
          © 2026 Computer Science AI Face Attendance System. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

// รายละเอียดของวิชา: จำนวนแยกสถานะ + คะแนนเข้าเรียนที่อาจารย์บันทึกไว้
function CourseDetail({ course }) {
  const { data: score, loading } = useApi(`/scores/me/${course.id}`);
  return (
    <div className="mb-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-1.5">
      <div className="flex justify-between">
        <span>ภาคเรียน</span>
        <span className="font-semibold">{course.term}</span>
      </div>
      <div className="flex justify-between">
        <span>ตรงเวลา / สาย / ขาด</span>
        <span className="font-semibold">
          {course.counts.present} / {course.counts.late} / {course.counts.absent}
        </span>
      </div>
      <div className="flex justify-between">
        <span>คะแนนเข้าเรียน</span>
        <span className="font-semibold">
          {loading ? "..." : score ? Number(score.score).toFixed(2) : "ยังไม่ประกาศ"}
        </span>
      </div>
      <Link to="/history" className="block text-blue-600 font-semibold hover:underline pt-1">
        ดูประวัติการเช็คชื่อ →
      </Link>
    </div>
  );
}

function StatCard({ icon, iconBg, label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500 font-medium truncate">{label}</div>
        <div className="text-2xl font-bold text-slate-900 leading-tight mt-0.5">{value}</div>
        <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
      </div>
    </div>
  );
}