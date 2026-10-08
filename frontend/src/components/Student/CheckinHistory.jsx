import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Home,
  ScanFace,
  History,
  UserPlus,
  BookOpen,
  CalendarDays,
  CalendarClock,
  User,
  Settings,
  Megaphone,
  LogOut,
  Menu,
  Search,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Calendar,
} from "lucide-react";
import logoImg from "../../assets/logo-cs.png";
import { getUser } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { countStatus, downloadBlob, hhmm, initial, isoDate, thaiDate, toCsv } from "../../lib/format";

const navItems = [
  { icon: Home, label: "หน้าหลัก", to: "/dashboard" },
  { icon: ScanFace, label: "เช็คชื่อ", to: "/checkin" },
  { icon: History, label: "ประวัติการเช็คชื่อ", to: "/history", active: true },
  { icon: UserPlus, label: "ลงทะเบียนใบหน้า", to: "/face-registration" },
  { icon: BookOpen, label: "วิชาเรียนของฉัน", to: "/courses" },
  { icon: CalendarDays, label: "ตารางเรียน", to: "/schedule" },
  { icon: Megaphone, label: "ประกาศ", to: "/announcements" },
  { icon: User, label: "โปรไฟล์", to: "/profile" },
  { icon: Settings, label: "ตั้งค่า", to: "/settings" },
];

const PAGE_SIZE = 8;

const statusMeta = {
  present: { label: "เข้าเรียน", cls: "bg-emerald-100 text-emerald-600", icon: CheckCircle2 },
  late: { label: "สาย", cls: "bg-amber-100 text-amber-600", icon: Clock },
  absent: { label: "ขาดเรียน", cls: "bg-red-100 text-red-600", icon: XCircle },
};

export default function CheckinHistory() {
  const user = getUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [today] = useState(() => isoDate());
  const [course, setCourse] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // ประวัติทั้งหมดตั้งแต่ลงทะเบียน (เฉพาะคาบที่มีผลแล้ว)
  const { data, error, loading } = useApi(`/attendance/my-sessions?start=2000-01-01&end=${today}`, []);
  const all = (data || []).filter((s) => statusMeta[s.status]).reverse();
  const courseCodes = [...new Set(all.map((s) => s.course_code))];

  const records = all.filter(
    (s) =>
      (!course || s.course_code === course) &&
      (!status || s.status === status) &&
      (!dateFrom || s.session_date >= dateFrom) &&
      (!dateTo || s.session_date <= dateTo)
  );
  const counts = countStatus(records);
  const pctOf = (n) => `${counts.total ? ((n / counts.total) * 100).toFixed(2) : 0}%`;

  const totalRecords = records.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRecords = records.slice(start, start + PAGE_SIZE);

  const detailOf = (r) => {
    if (r.status === "absent") return "ไม่ได้เช็คชื่อในเวลาที่กำหนด";
    const parts = [];
    if (r.status === "late") parts.push(`สาย ${r.late_minutes ?? 0} นาที`);
    if (r.my_confidence) parts.push(`ความมั่นใจ ${Number(r.my_confidence).toFixed(1)}%`);
    return parts.join(" • ") || "-";
  };

  const exportCsv = () => {
    const headers = ["วันที่", "เวลาเช็คชื่อ", "รหัสวิชา", "รายวิชา", "กลุ่มเรียน", "สถานะ", "วิธีเช็คชื่อ", "รายละเอียด"];
    const rows = records.map((r) => [
      thaiDate(r.session_date),
      r.my_check_in_time ? hhmm(r.my_check_in_time) : "-",
      r.course_code,
      r.course_name,
      r.class_code || "-",
      statusMeta[r.status].label,
      r.my_method === "manual" ? "อาจารย์บันทึก" : r.my_method === "face" ? "สแกนใบหน้า" : "-",
      detailOf(r),
    ]);
    downloadBlob(`ประวัติการเช็คชื่อ_${today}.csv`, toCsv(headers, rows));
  };
  const resetPage = (fn) => (e) => {
    fn(e.target.value);
    setPage(1);
  };
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
          {/* Title + breadcrumb */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">ประวัติการเช็คชื่อ</h1>
            <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
              <Link to="/dashboard" className="hover:text-blue-600">
                หน้าหลัก
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-500">ประวัติการเช็คชื่อ</span>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            <StatCard
              icon={<Calendar className="w-6 h-6 text-blue-600" />}
              iconBg="bg-blue-100"
              label="เช็คชื่อทั้งหมด"
              value={counts.total}
              unit="ครั้ง"
            />
            <StatCard
              icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
              iconBg="bg-emerald-100"
              label="เข้าเรียน"
              value={counts.present}
              sub={pctOf(counts.present)}
              subColor="text-emerald-600"
            />
            <StatCard
              icon={<Clock className="w-6 h-6 text-amber-500" />}
              iconBg="bg-amber-100"
              label="สาย"
              value={counts.late}
              sub={pctOf(counts.late)}
              subColor="text-amber-500"
            />
            <StatCard
              icon={<XCircle className="w-6 h-6 text-red-500" />}
              iconBg="bg-red-100"
              label="ขาดเรียน"
              value={counts.absent}
              sub={pctOf(counts.absent)}
              subColor="text-red-500"
            />
            <StatCard
              icon={<CalendarClock className="w-6 h-6 text-purple-600" />}
              iconBg="bg-purple-100"
              label="เช็คชื่อวันนี้"
              value={all.filter((s) => s.session_date === today && s.status !== "absent").length}
              unit="ครั้ง"
            />
          </div>

          {/* Filters + table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center gap-3 p-5 border-b border-slate-100">
              <select value={course} onChange={resetPage(setCourse)} className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200">
                <option value="">ทุกรายวิชา</option>
                {courseCodes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 text-sm text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input type="date" value={dateFrom} max={dateTo || undefined} onChange={resetPage(setDateFrom)} className="focus:outline-none" />
                <span className="text-slate-400">-</span>
                <input type="date" value={dateTo} min={dateFrom || undefined} onChange={resetPage(setDateTo)} className="focus:outline-none" />
              </div>
              <select value={status} onChange={resetPage(setStatus)} className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200">
                <option value="">สถานะทั้งหมด</option>
                <option value="present">เข้าเรียน</option>
                <option value="late">สาย</option>
                <option value="absent">ขาดเรียน</option>
              </select>

              <div className="flex-1" />

              <button onClick={exportCsv} disabled={!records.length} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm shadow-blue-200">
                <Download className="w-4 h-4" />
                ส่งออกข้อมูล
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="py-3 px-5 font-medium">วันที่</th>
                    <th className="py-3 px-3 font-medium">เวลา</th>
                    <th className="py-3 px-3 font-medium">รายวิชา</th>
                    <th className="py-3 px-3 font-medium">กลุ่มเรียน</th>
                    <th className="py-3 px-3 font-medium">สถานะ</th>
                    <th className="py-3 px-3 font-medium">วิธีเช็คชื่อ</th>
                    <th className="py-3 px-5 font-medium">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody>
                  {(loading || error || pageRecords.length === 0) && (
                    <tr>
                      <td colSpan={7} className={`py-8 text-center text-sm ${error ? "text-red-500" : "text-slate-400"}`}>
                        {error || (loading ? "กำลังโหลด..." : "ไม่พบประวัติการเช็คชื่อ")}
                      </td>
                    </tr>
                  )}
                  {pageRecords.map((r) => {
                    const meta = statusMeta[r.status];
                    const StatusIcon = meta.icon;
                    return (
                      <tr key={r.session_id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                        <td className="py-4 px-5 text-slate-600 whitespace-nowrap">{thaiDate(r.session_date)}</td>
                        <td className="py-4 px-3 text-slate-600 whitespace-nowrap">
                          {r.my_check_in_time ? hhmm(r.my_check_in_time) : "-"}
                        </td>
                        <td className="py-4 px-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">{r.course_code}</div>
                          <div className="text-xs text-slate-400">{r.course_name}</div>
                        </td>
                        <td className="py-4 px-3 text-slate-600 whitespace-nowrap">{r.class_code || "-"}</td>
                        <td className="py-4 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${meta.cls}`}
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-4 px-3 whitespace-nowrap">
                          {r.my_method ? (
                            <span className="inline-flex items-center gap-1.5 text-slate-500 text-xs">
                              <ScanFace className="w-4 h-4 text-blue-500" />
                              {r.my_method === "face" ? "สแกนใบหน้า" : "อาจารย์บันทึก"}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-4 px-5 whitespace-nowrap text-xs text-slate-500">{detailOf(r)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4">
              <div className="text-xs text-slate-400">
                แสดง {totalRecords ? start + 1 : 0} - {Math.min(start + PAGE_SIZE, totalRecords)} จาก {totalRecords}{" "}
                รายการ
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      currentPage === i + 1
                        ? "bg-blue-600 text-white"
                        : "border border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ icon, iconBg, label, value, unit, sub, subColor }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500 font-medium truncate">{label}</div>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-2xl font-bold text-slate-900 leading-tight">{value}</span>
          {unit && <span className="text-xs text-slate-400">{unit}</span>}
        </div>
        {sub && <div className={`text-xs mt-0.5 font-medium ${subColor}`}>{sub}</div>}
      </div>
    </div>
  );
}