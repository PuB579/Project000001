import { useState, useEffect } from "react";
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
  LogOut,
  Menu,
  Search,
  Bell,
  ChevronDown,
  ClipboardCheck,
  CalendarCheck,
  Percent,
  Trophy,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Megaphone,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import logoImg from "../../assets/logo-cs.png";
import { getUser } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { countStatus, dailyTrend, hhmm, initial, isoDate, thaiDate } from "../../lib/format";

// สถานะที่นับเป็น "เช็คชื่อแล้ว"
const ATTENDED = new Set(["present", "late"]);

function greeting(hour) {
  if (hour < 12) return "สวัสดีตอนเช้า";
  if (hour < 17) return "สวัสดีตอนบ่าย";
  return "สวัสดีตอนเย็น";
}

const navItems = [
  { icon: Home, label: "หน้าหลัก", to: "/dashboard", active: true },
  { icon: ScanFace, label: "เช็คชื่อ", to: "/checkin" },
  { icon: History, label: "ประวัติการเช็คชื่อ", to: "/history" },
  { icon: UserPlus, label: "ลงทะเบียนใบหน้า", to: "/face-registration" },
  { icon: BookOpen, label: "วิชาเรียนของฉัน", to: "/courses" },
  { icon: CalendarDays, label: "ตารางเรียน", to: "/schedule" },
  { icon: Megaphone, label: "ประกาศ", to: "/announcements" },
  { icon: User, label: "โปรไฟล์", to: "/profile" },
  { icon: Settings, label: "ตั้งค่า", to: "/settings" },
];

export default function StudentDashboard() {
  const user = getUser();
  const [now, setNow] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [monthStart] = useState(() => isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const today = isoDate(now);
  const sessionsReq = useApi(`/attendance/my-sessions?start=${monthStart}&end=${today}`, []);
  const meReq = useApi("/students/me");
  const announcementsReq = useApi("/announcements", []);
  const me = meReq.data;
  const sessions = sessionsReq.data || [];

  const todayClasses = sessions
    .filter((s) => s.session_date === today)
    .map((s) => ({
      id: s.session_id,
      time: hhmm(s.start_time),
      endTime: s.end_time ? hhmm(s.end_time) : "",
      subject: `${s.course_code} ${s.course_name}`,
      teacher: s.teacher_name || "-",
      status: ATTENDED.has(s.status) ? "checked" : s.status,
      checkedAt: s.my_check_in_time ? `${hhmm(s.my_check_in_time)} น.` : "",
    }));
  const checkedToday = todayClasses.filter((c) => c.status === "checked").length;

  const monthCount = countStatus(sessions);
  const attendanceTrend = dailyTrend(sessions);
  const attendanceSummary = [
    { name: "ตรงเวลา", value: monthCount.present, color: "#22c55e" },
    { name: "สาย", value: monthCount.late, color: "#f59e0b" },
    { name: "ขาด", value: monthCount.absent, color: "#ef4444" },
  ];

  const recentCheckins = sessions
    .filter((s) => ["present", "late", "absent"].includes(s.status))
    .slice()
    .reverse()
    .slice(0, 4)
    .map((s) => ({
      id: s.session_id,
      subject: `${s.course_code} ${s.course_name}`,
      date: thaiDate(s.session_date),
      time: s.my_check_in_time ? `${hhmm(s.my_check_in_time)} น.` : "-",
      status: s.status === "present" ? "ontime" : s.status,
      lateBy: s.status === "late" ? `สาย ${s.late_minutes ?? 0} นาที` : "ขาดเรียน",
    }));

  const announcements = (announcementsReq.data || []).slice(0, 2).map((a) => ({
    id: a.id,
    type: a.pinned ? "warning" : "info",
    title: a.title,
    body: a.body,
  }));
  const loadError = sessionsReq.error || meReq.error || announcementsReq.error;
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = now.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

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
              placeholder="ค้นหา..."
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
          {/* Greeting + date card */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {greeting(now.getHours())} <span className="inline-block">👋</span>
              </h1>
              <h2 className="text-2xl font-extrabold text-blue-600 mt-1">
                {user?.full_name || "-"}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {me ? `${me.faculty || me.major || "นักศึกษา"} • รหัสนักศึกษา ${me.student_code}` : " "}
              </p>
              {loadError && <p className="text-sm text-red-500 mt-2">{loadError}</p>}
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl px-6 py-4 text-white shadow-lg shadow-blue-200 shrink-0 w-full lg:w-72">
              <div className="flex items-center gap-2 text-blue-100 text-sm mb-1">
                <CalendarDays className="w-4 h-4" />
                <span>
                  วัน
                  {now.toLocaleDateString("th-TH", { weekday: "long" })}
                </span>
              </div>
              <div className="text-sm text-blue-100 mb-2">
                {now.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
              </div>
              <div className="text-2xl font-bold tracking-wide">{timeStr}</div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              icon={<ClipboardCheck className="w-6 h-6 text-emerald-600" />}
              iconBg="bg-emerald-100"
              label="เช็คชื่อวันนี้"
              value={checkedToday}
              unit={`/${todayClasses.length} คาบ`}
              sub={`${todayClasses.length ? ((checkedToday / todayClasses.length) * 100).toFixed(1) : 0}% ของวันนี้`}
              progress={todayClasses.length ? (checkedToday / todayClasses.length) * 100 : 0}
              barColor="bg-emerald-500"
            />
            <StatCard
              icon={<CalendarCheck className="w-6 h-6 text-blue-600" />}
              iconBg="bg-blue-100"
              label="เช็คชื่อทั้งหมด"
              value={monthCount.present + monthCount.late}
              unit="ครั้ง"
              sub="เดือนนี้"
              sparkline={attendanceTrend}
            />
            <StatCard
              icon={<Percent className="w-6 h-6 text-purple-600" />}
              iconBg="bg-purple-100"
              label="อัตราการเข้าเรียน"
              value={monthCount.rate.toFixed(1)}
              unit="%"
              sub="เดือนนี้"
              progress={monthCount.rate}
              barColor="bg-purple-500"
            />
            <StatCard
              icon={<Trophy className="w-6 h-6 text-amber-500" />}
              iconBg="bg-amber-100"
              label="ขาดเรียน"
              value={monthCount.absent}
              unit="ครั้ง"
              sub={`มาสาย ${monthCount.late} ครั้ง • เดือนนี้`}
              progress={monthCount.total ? (monthCount.absent / monthCount.total) * 100 : 0}
              barColor="bg-amber-500"
            />
          </div>

          {/* Today's classes + recent check-ins */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">วิชาเรียนวันนี้</h3>
                <Link to="/schedule" className="text-sm text-blue-600 font-medium hover:underline">
                  ดูทั้งหมด
                </Link>
              </div>

              <div className="space-y-3">
                {todayClasses.length === 0 && (
                  <div className="text-sm text-slate-400 py-4 text-center">
                    {sessionsReq.loading ? "กำลังโหลด..." : "วันนี้ไม่มีคาบเรียนที่เปิดเช็คชื่อ"}
                  </div>
                )}
                {todayClasses.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div className="shrink-0 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg px-3 py-2 text-center leading-tight">
                      <div>{c.time}</div>
                      <div className="text-blue-400">-</div>
                      <div>{c.endTime}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800 text-sm truncate">
                        {c.subject}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate">
                        {c.teacher}
                      </div>
                    </div>
                    {c.status === "checked" ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-semibold text-emerald-600">
                            เช็คชื่อแล้ว
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {c.checkedAt}
                          </div>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                      </div>
                    ) : c.status === "absent" ? (
                      <span className="text-xs font-semibold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg shrink-0">
                        ขาดเรียน
                      </span>
                    ) : (
                      <Link to="/checkin" className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
                          {c.status === "open" ? "รอเช็คชื่อ" : "ยังไม่ถึงเวลา"}
                        </span>
                        <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-blue-500" />
                        </div>
                      </Link>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-4 bg-blue-50 text-blue-600 text-xs rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                กรุณาเช็คชื่อภายในช่วงเวลาที่อาจารย์กำหนดของแต่ละคาบเรียน
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">การเช็คชื่อล่าสุด</h3>
                <Link to="/history" className="text-sm text-blue-600 font-medium hover:underline">
                  ดูทั้งหมด
                </Link>
              </div>

              <div className="space-y-4">
                {recentCheckins.length === 0 && (
                  <div className="text-sm text-slate-400 py-4 text-center">ยังไม่มีประวัติการเช็คชื่อเดือนนี้</div>
                )}
                {recentCheckins.map((r) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <ClipboardCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800 truncate">
                        {r.subject}
                      </div>
                      <div className="text-xs text-slate-400">
                        {r.date} • {r.time}
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg shrink-0 ${
                        r.status === "ontime"
                          ? "bg-emerald-100 text-emerald-600"
                          : r.status === "late"
                            ? "bg-amber-100 text-amber-600"
                            : "bg-red-100 text-red-600"
                      }`}
                    >
                      {r.status === "ontime" ? "ตรงเวลา" : r.lateBy}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Charts + announcements */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_1.1fr] gap-5">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">
                  สถิติการเข้าเรียน (เดือนนี้)
                </h3>

              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceTrend} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v) => [`${v}%`, "อัตราเข้าเรียน"]}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{ r: 3, fill: "#2563eb" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 mb-4">สรุปการเข้าเรียน</h3>
              <div className="relative h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendanceSummary}
                      dataKey="value"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {attendanceSummary.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-2xl font-bold text-slate-900">{monthCount.total}</div>
                  <div className="text-xs text-slate-400">ครั้ง</div>
                </div>
              </div>
              <div className="space-y-2 mt-4">
                {attendanceSummary.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-slate-600">{s.name}</span>
                    </div>
                    <span className="text-slate-800 font-medium">
                      {s.value} ({monthCount.total ? ((s.value / monthCount.total) * 100).toFixed(1) : "0.0"}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900">ประกาศจากอาจารย์</h3>
                <Link to="/announcements" className="text-sm text-blue-600 font-medium hover:underline">
                  ดูทั้งหมด
                </Link>
              </div>
              <div className="space-y-3">
                {announcements.length === 0 && <div className="text-sm text-slate-400">ยังไม่มีประกาศ</div>}
                {announcements.map((a) => (
                  <Link
                    to="/announcements"
                    key={a.id}
                    className={`w-full flex items-start gap-3 text-left rounded-xl p-4 transition-colors ${
                      a.type === "info"
                        ? "bg-blue-50 hover:bg-blue-100/70"
                        : "bg-amber-50 hover:bg-amber-100/70"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        a.type === "info" ? "bg-blue-600" : "bg-amber-500"
                      }`}
                    >
                      {a.type === "info" ? (
                        <Megaphone className="w-4 h-4 text-white" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-xs font-semibold mb-0.5 ${
                          a.type === "info" ? "text-blue-600" : "text-amber-600"
                        }`}
                      >
                        {a.title}
                      </div>
                      <div className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                        {a.body}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ icon, iconBg, label, value, unit, sub, progress, barColor, sparkline }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <div className="text-sm text-slate-500 font-medium">{label}</div>
      </div>
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-3xl font-bold text-slate-900">{value}</span>
        <span className="text-sm text-slate-400">{unit}</span>
      </div>
      <div className="text-xs text-slate-400 mb-3">{sub}</div>
      {typeof progress === "number" && (
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
      {sparkline && (
        <div className="h-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkline}>
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}