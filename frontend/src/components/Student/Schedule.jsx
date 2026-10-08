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
  CalendarRange,
  List,
  Info,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import logoImg from "../../assets/logo-cs.png";
import { getUser } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { addDays, countStatus, hhmm, initial, isoDate, parseDate, thaiDate, timeRange } from "../../lib/format";

const COLORS = ["blue", "purple", "emerald", "amber", "rose"];
const STATUS_TEXT = { present: "เข้าเรียน", late: "มาสาย", absent: "ขาดเรียน", open: "รอเช็คชื่อ", upcoming: "ยังไม่ถึงเวลา" };

// วันจันทร์ของสัปดาห์ที่มีวันที่ d
function mondayOf(d) {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
  return out;
}

const toMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

// จัดคาบเรียนของสัปดาห์ลงตาราง (แถวละ 1 ชั่วโมง)
function buildGrid(sessions, weekStart) {
  const hours = sessions.filter((s) => s.start_time).map((s) => Number(s.start_time.slice(0, 2)));
  const endHours = sessions
    .filter((s) => s.end_time)
    .map((s) => Math.ceil(toMinutes(s.end_time) / 60));
  const firstHour = Math.min(8, ...hours);
  const lastHour = Math.max(17, ...endHours, ...hours.map((h) => h + 1));
  const timeSlots = [];
  for (let h = firstHour; h < lastHour; h++) {
    timeSlots.push(`${String(h).padStart(2, "0")}:00 - ${String(h + 1).padStart(2, "0")}:00`);
  }

  const occupied = {};
  const startAt = {};
  sessions.forEach((s) => {
    if (!s.start_time) return;
    const day = Math.round((parseDate(s.session_date) - weekStart) / 86400000);
    const row = Number(s.start_time.slice(0, 2)) - firstHour;
    const span = s.end_time
      ? Math.max(1, Math.ceil((toMinutes(s.end_time) - (firstHour + row) * 60) / 60))
      : 1;
    const key = `${day}-${row}`;
    if (occupied[key]) return; // ซ้อนกับคาบที่แสดงอยู่แล้ว
    if (startAt[key]) {
      startAt[key].items.push(s);
      return;
    }
    startAt[key] = { items: [s], span };
    for (let r = row + 1; r < row + span; r++) occupied[`${day}-${r}`] = true;
  });
  return { timeSlots, occupied, startAt };
}

const navItems = [
  { icon: Home, label: "หน้าหลัก", to: "/dashboard" },
  { icon: ScanFace, label: "เช็คชื่อ", to: "/checkin" },
  { icon: History, label: "ประวัติการเช็คชื่อ", to: "/history" },
  { icon: UserPlus, label: "ลงทะเบียนใบหน้า", to: "/face-registration" },
  { icon: BookOpen, label: "วิชาเรียนของฉัน", to: "/courses" },
  { icon: CalendarDays, label: "ตารางเรียน", to: "/schedule", active: true },
  { icon: Megaphone, label: "ประกาศ", to: "/announcements" },
  { icon: User, label: "โปรไฟล์", to: "/profile" },
  { icon: Settings, label: "ตั้งค่า", to: "/settings" },
];

const days = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
const colorMap = {
  blue: { dot: "bg-blue-500", bg: "bg-blue-50", border: "border-blue-400", text: "text-blue-700" },
  purple: { dot: "bg-purple-500", bg: "bg-purple-50", border: "border-purple-400", text: "text-purple-700" },
  emerald: { dot: "bg-emerald-500", bg: "bg-emerald-50", border: "border-emerald-400", text: "text-emerald-700" },
  amber: { dot: "bg-amber-500", bg: "bg-amber-50", border: "border-amber-400", text: "text-amber-700" },
  rose: { dot: "bg-rose-500", bg: "bg-rose-50", border: "border-rose-400", text: "text-rose-700" },
};

export default function Schedule() {
  const user = getUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [view, setView] = useState("week");
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [today] = useState(() => isoDate());
  const weekEnd = addDays(weekStart, 6);
  const weekReq = useApi(`/attendance/my-sessions?start=${isoDate(weekStart)}&end=${isoDate(weekEnd)}`, []);
  const todayReq = useApi(`/attendance/my-sessions?start=${today}&end=${today}`, []);
  const allReq = useApi(`/attendance/my-sessions?start=2000-01-01&end=${today}`, []);
  const classesReq = useApi("/classes/mine", []);

  // สีประจำวิชา ตามลำดับคลาสที่ลงทะเบียน
  const colorOfClass = new Map((classesReq.data || []).map((c, i) => [c.id, COLORS[i % COLORS.length]]));
  const colorOf = (classId) => colorOfClass.get(classId) || "blue";

  const weekSessions = weekReq.data || [];
  const { timeSlots, occupied, startAt } = buildGrid(weekSessions, weekStart);
  const legend = [...new Map(weekSessions.map((s) => [s.class_id, s])).values()];
  const stats = countStatus(allReq.data || []);
  const todaySchedule = todayReq.data || [];
  const loadError = weekReq.error || todayReq.error || allReq.error;
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
          {/* Title */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <CalendarDays className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">ตารางเรียน</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  คาบเรียนที่อาจารย์เปิดเช็คชื่อ สัปดาห์ {thaiDate(isoDate(weekStart))} - {thaiDate(isoDate(weekEnd))}
                </p>
                {loadError && <p className="text-sm text-red-500 mt-1">{loadError}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start lg:self-auto">
              <button
                onClick={() => setWeekStart(addDays(weekStart, -7))}
                className="border border-slate-200 bg-white rounded-xl px-3 py-2.5 text-sm text-slate-600 font-medium hover:bg-slate-50"
              >
                ← สัปดาห์ก่อน
              </button>
              <button
                onClick={() => setWeekStart(mondayOf(new Date()))}
                className="border border-slate-200 bg-white rounded-xl px-3 py-2.5 text-sm text-slate-600 font-medium hover:bg-slate-50"
              >
                สัปดาห์นี้
              </button>
              <button
                onClick={() => setWeekStart(addDays(weekStart, 7))}
                className="border border-slate-200 bg-white rounded-xl px-3 py-2.5 text-sm text-slate-600 font-medium hover:bg-slate-50"
              >
                สัปดาห์ถัดไป →
              </button>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("week")}
              className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors ${
                view === "week"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                  : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <CalendarRange className="w-4 h-4" />
              ตารางสัปดาห์
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors ${
                view === "list"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                  : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <List className="w-4 h-4" />
              รายการวิชา
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[2.2fr_1fr] gap-5 items-start">
            {/* Timetable */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 overflow-x-auto">
              {view === "week" ? (
                <>
                  <table className="w-full text-sm border-collapse min-w-[760px]">
                    <thead>
                      <tr>
                        <th className="w-24 text-xs font-semibold text-slate-500 pb-3 text-left">
                          เวลา
                        </th>
                        {days.map((d, i) => {
                          const date = isoDate(addDays(weekStart, i));
                          return (
                            <th
                              key={d}
                              className={`text-xs font-semibold pb-3 px-1 text-center ${date === today ? "text-blue-600" : "text-slate-500"}`}
                            >
                              {d}
                              <div className="font-normal text-[11px] text-slate-400">{thaiDate(date, { day: "numeric", month: "short" })}</div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((slot, row) => (
                        <tr key={slot} className="border-t border-slate-100">
                          <td className="py-2 pr-2 text-xs text-slate-400 align-top whitespace-nowrap">
                            {slot}
                          </td>
                          {days.map((_, day) => {
                            const key = `${day}-${row}`;
                            if (occupied[key]) return null; // covered by a rowSpan above
                            const cell = startAt[key];
                            if (cell) {
                              return (
                                <td key={key} rowSpan={cell.span} className="align-top p-1">
                                  <div className="space-y-1 h-full">
                                    {cell.items.map((s) => {
                                      const cs = colorMap[colorOf(s.class_id)];
                                      return (
                                        <div
                                          key={s.session_id}
                                          className={`h-full rounded-xl border-l-4 ${cs.border} ${cs.bg} px-3 py-2`}
                                        >
                                          <div className="flex items-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full ${cs.dot} shrink-0`} />
                                            <span className={`text-xs font-bold ${cs.text}`}>{s.course_code}</span>
                                          </div>
                                          <div className="text-xs text-slate-600 leading-snug mt-0.5">{s.course_name}</div>
                                          <div className="text-[11px] text-slate-400 mt-0.5">
                                            {timeRange(s.start_time, s.end_time)} • {STATUS_TEXT[s.status]}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>
                              );
                            }
                            return <td key={key} className="p-1 h-[52px]" />;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5 pt-4 border-t border-slate-100">
                    {legend.length === 0 && (
                      <span className="text-xs text-slate-400">
                        {weekReq.loading ? "กำลังโหลด..." : "สัปดาห์นี้ยังไม่มีคาบเรียนที่เปิดเช็คชื่อ"}
                      </span>
                    )}
                    {legend.map((s) => (
                      <span key={s.class_id} className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span className={`w-2.5 h-2.5 rounded-full ${colorMap[colorOf(s.class_id)].dot}`} />
                        {s.course_code} {s.course_name}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  {weekSessions.length === 0 && (
                    <div className="text-sm text-slate-400">สัปดาห์นี้ยังไม่มีคาบเรียนที่เปิดเช็คชื่อ</div>
                  )}
                  {weekSessions.map((s) => {
                    const cs = colorMap[colorOf(s.class_id)];
                    return (
                      <div
                        key={s.session_id}
                        className={`flex items-center gap-4 rounded-xl border-l-4 ${cs.border} ${cs.bg} px-4 py-3`}
                      >
                        <div className="text-xs font-semibold text-slate-500 w-24 shrink-0">
                          {thaiDate(s.session_date, { weekday: "short", day: "numeric", month: "short" })}
                        </div>
                        <div className="text-xs text-slate-500 w-28 shrink-0">{timeRange(s.start_time, s.end_time)}</div>
                        <div className="min-w-0 flex-1">
                          <span className={`text-sm font-bold ${cs.text}`}>{s.course_code}</span>{" "}
                          <span className="text-sm text-slate-600">{s.course_name}</span>
                        </div>
                        <div className="text-xs text-slate-400 shrink-0">{STATUS_TEXT[s.status]}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-5">
              {/* Attendance stats */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarDays className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-slate-900">สถิติการเรียน</h3>
                </div>
                <div className="flex items-center gap-5">
                  <div className="relative w-28 h-28 shrink-0">
                    <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                      <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 52}
                        strokeDashoffset={2 * Math.PI * 52 * (1 - stats.rate / 100)}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold text-slate-900">{Math.round(stats.rate)}%</span>
                      <span className="text-[10px] text-slate-400">อัตราเข้าเรียน</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-slate-600">เข้าเรียน</span>
                      <span className="font-semibold text-slate-800 ml-auto">{stats.present} ครั้ง</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span className="text-slate-600">ขาดเรียน</span>
                      <span className="font-semibold text-slate-800 ml-auto">{stats.absent} ครั้ง</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span className="text-slate-600">สาย</span>
                      <span className="font-semibold text-slate-800 ml-auto">{stats.late} ครั้ง</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Today's schedule */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarDays className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-slate-900">ตารางเรียนวันนี้</h3>
                </div>
                <div className="space-y-3">
                  {todaySchedule.length === 0 && <div className="text-sm text-slate-400">วันนี้ไม่มีคาบเรียน</div>}
                  {todaySchedule.map((s) => {
                    const cs = colorMap[colorOf(s.class_id)];
                    return (
                      <div key={s.session_id} className={`rounded-xl ${cs.bg} px-4 py-3`}>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${cs.dot}`} />
                          {timeRange(s.start_time, s.end_time)}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-bold ${cs.text}`}>{s.course_code}</span>
                          <span className="flex items-center gap-1 text-[11px] font-semibold bg-white text-slate-500 px-2 py-1 rounded-lg shrink-0">
                            <MapPin className="w-3 h-3" />
                            {STATUS_TEXT[s.status]}
                            {s.my_check_in_time ? ` ${hhmm(s.my_check_in_time)}` : ""}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{s.course_name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-slate-900">หมายเหตุ / คำแนะนำ</h3>
                </div>
                <div className="space-y-2.5 mb-4">
                  {[
                    "ตรวจสอบตารางเรียนเป็นประจำ",
                    "เข้าห้องเรียนตามเวลา",
                    "เตรียมอุปกรณ์การเรียนให้พร้อม",
                  ].map((t) => (
                    <div key={t} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      {t}
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 bg-blue-50 text-blue-600 text-xs rounded-xl px-4 py-3">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  หากพบว่าข้อมูลตารางเรียนไม่ถูกต้อง โปรดติดต่ออาจารย์ผู้สอน
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="text-center text-xs text-slate-400 py-6">
          © 2026 Computer Science AI Face Attendance System. All rights reserved.
        </footer>
      </div>
    </div>
  );
}