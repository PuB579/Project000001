import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Home,
  ScanFace,
  History,
  UserPlus,
  BookOpen,
  CalendarDays,
  Megaphone,
  User,
  Settings,
  LogOut,
  Menu,
  Search,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Pin,
  BookMarked,
  FileText,
  GraduationCap,
} from "lucide-react";
import logoImg from "../../assets/logo-cs.png";
import { getUser } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { initial, thaiDate } from "../../lib/format";

const READ_KEY = "faceattend_read_announcements";
const PAGE_SIZE = 5;
const COLORS = ["blue", "emerald", "amber", "purple"];

function loadRead() {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY)) || []);
  } catch {
    return new Set();
  }
}

const navItems = [
  { icon: Home, label: "หน้าหลัก", to: "/dashboard" },
  { icon: ScanFace, label: "เช็คชื่อ", to: "/checkin" },
  { icon: History, label: "ประวัติการเช็คชื่อ", to: "/history" },
  { icon: UserPlus, label: "ลงทะเบียนใบหน้า", to: "/face-registration" },
  { icon: BookOpen, label: "วิชาเรียนของฉัน", to: "/courses" },
  { icon: CalendarDays, label: "ตารางเรียน", to: "/schedule" },
  { icon: Megaphone, label: "ประกาศ", to: "/announcements", active: true },
  { icon: User, label: "โปรไฟล์", to: "/profile" },
  { icon: Settings, label: "ตั้งค่า", to: "/settings" },
];

const colorMap = {
  rose: { bg: "bg-rose-100", text: "text-rose-600" },
  blue: { bg: "bg-blue-100", text: "text-blue-600" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-600" },
  amber: { bg: "bg-amber-100", text: "text-amber-600" },
  purple: { bg: "bg-purple-100", text: "text-purple-600" },
};

export default function Announcements() {
  const user = getUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [readIds, setReadIds] = useState(loadRead);
  const announcementsReq = useApi("/announcements", []);
  const classesReq = useApi("/classes/mine", []);
  const classById = new Map((classesReq.data || []).map((c, i) => [c.id, { ...c, color: COLORS[i % COLORS.length] }]));

  // สถานะ "อ่านแล้ว" เก็บไว้ในเบราว์เซอร์นี้
  const markRead = (id) => {
    setReadIds((prev) => {
      const next = new Set(prev).add(id);
      try {
        localStorage.setItem(READ_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const all = (announcementsReq.data || []).map((a) => {
    const cls = a.class_id ? classById.get(a.class_id) : null;
    const created = new Date(a.created_at);
    return {
      ...a,
      icon: a.pinned ? Megaphone : cls ? BookMarked : FileText,
      color: a.pinned ? "rose" : cls?.color || "purple",
      teacher: a.teacher_name || "-",
      subject: cls ? `${cls.course_name} (${cls.course_code})` : "ประกาศทั่วไป",
      date: thaiDate(a.created_at),
      time: `${created.toTimeString().slice(0, 5)} น.`,
      read: readIds.has(a.id),
    };
  });
  const q = search.trim().toLowerCase();
  const filtered = all.filter(
    (a) =>
      (!q || `${a.title} ${a.body}`.toLowerCase().includes(q)) &&
      (!readFilter || (readFilter === "read") === a.read) &&
      (!classFilter || String(a.class_id ?? "general") === classFilter)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const announcements = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pinnedList = all.filter((a) => a.pinned);
  const categories = [
    ...[...classById.values()].map((c) => ({
      key: String(c.id),
      icon: GraduationCap,
      label: `${c.course_code} ${c.course_name}`,
      count: all.filter((a) => a.class_id === c.id).length,
    })),
    { key: "general", icon: FileText, label: "ประกาศทั่วไป", count: all.filter((a) => !a.class_id).length },
  ];
  const resetPage = (fn) => (e) => {
    fn(e.target.value);
    setPage(1);
  };
  const toggleExpand = (a) => {
    setExpanded(expanded === a.id ? null : a.id);
    markRead(a.id);
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
          {/* Title */}
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              ประกาศ
              <Megaphone className="w-5 h-5 text-slate-400" />
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              ติดตามข่าวสารและข้อมูลจากอาจารย์ผู้สอน
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-5 items-start">
            {/* Left column */}
            <div className="space-y-5">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={resetPage(setSearch)}
                    placeholder="ค้นหาประกาศ..."
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <select value={readFilter} onChange={resetPage(setReadFilter)} className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                  <option value="">ทั้งหมด</option>
                  <option value="unread">ยังไม่อ่าน</option>
                  <option value="read">อ่านแล้ว</option>
                </select>
                <select value={classFilter} onChange={resetPage(setClassFilter)} className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                  <option value="">ทุกรายวิชา</option>
                  {categories.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Announcement list */}
              <div className="space-y-4">
                {(announcementsReq.loading || announcementsReq.error || announcements.length === 0) && (
                  <div className={`bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm ${announcementsReq.error ? "text-red-500" : "text-slate-400"}`}>
                    {announcementsReq.error || (announcementsReq.loading ? "กำลังโหลด..." : "ไม่มีประกาศ")}
                  </div>
                )}
                {announcements.map((a) => {
                  const cs = colorMap[a.color];
                  const Icon = a.icon;
                  return (
                    <div
                      key={a.id}
                      className={`rounded-2xl border shadow-sm p-5 ${
                        a.pinned
                          ? "bg-rose-50/60 border-rose-100"
                          : "bg-white border-slate-100"
                      }`}
                    >
                      {a.pinned && (
                        <div className="flex items-center gap-1.5 text-rose-500 text-xs font-semibold mb-2">
                          <Pin className="w-3.5 h-3.5" />
                          ประกาศสำคัญ
                        </div>
                      )}
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${cs.bg}`}
                        >
                          <Icon className={`w-5 h-5 ${cs.text}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <h3 className="font-bold text-slate-900 leading-snug">
                              {a.title}
                            </h3>
                            <span
                              className={`text-xs font-semibold shrink-0 ${
                                a.read ? "text-emerald-600" : "text-rose-500"
                              }`}
                            >
                              {a.read ? "อ่านแล้ว" : "ยังไม่อ่าน"}
                            </span>
                          </div>
                          <p className={`text-sm text-slate-500 leading-relaxed mt-1 whitespace-pre-line ${expanded === a.id ? "" : "line-clamp-2"}`}>
                            {a.body}
                          </p>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold flex items-center justify-center shrink-0">
                                {initial(a.teacher)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-slate-700 truncate">
                                  {a.teacher}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">
                                  {a.subject}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                                <CalendarDays className="w-3.5 h-3.5" />
                                {a.date} {a.time}
                              </span>
                              <button
                                onClick={() => toggleExpand(a)}
                                className={`text-xs font-semibold px-4 py-2 rounded-lg border transition-colors whitespace-nowrap ${
                                  a.pinned
                                    ? "border-rose-300 text-rose-600 hover:bg-rose-100"
                                    : "border-blue-200 text-blue-600 hover:bg-blue-50"
                                }`}
                              >
                                {expanded === a.id ? "ย่อ" : "อ่านเพิ่มเติม"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-center gap-1.5 pt-2">
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

            {/* Right column */}
            <div className="space-y-5">
              {/* Summary */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="font-bold text-slate-900 mb-4">สรุปประกาศ</h3>
                <div className="divide-y divide-slate-100">
                  <SummaryRow label="ทั้งหมด" value={all.length} />
                  <SummaryRow label="ยังไม่อ่าน" value={all.filter((a) => !a.read).length} valueColor="text-rose-500" />
                  <SummaryRow label="ประกาศสำคัญ" value={pinnedList.length} valueColor="text-rose-500" />
                  <SummaryRow label="ประกาศทั่วไป" value={all.length - pinnedList.length} />
                </div>
              </div>

              {/* Pinned */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Pin className="w-4 h-4 text-rose-500" />
                  <h3 className="font-bold text-slate-900">ประกาศปักหมุด</h3>
                </div>
                <div className="space-y-3">
                  {pinnedList.length === 0 && <div className="text-sm text-slate-400">ไม่มีประกาศปักหมุด</div>}
                  {pinnedList.map((p) => {
                    const Icon = p.icon;
                    return (
                      <div key={p.id} className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                        <div className="flex items-center gap-1.5 text-rose-500 text-xs font-semibold mb-1.5">
                          <Icon className="w-3.5 h-3.5" />
                          สำคัญ
                        </div>
                        <div className="text-sm font-bold text-slate-900 leading-snug">
                          {p.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {p.date} • {p.subject}
                        </div>
                        <button
                          onClick={() => {
                            setSearch(p.title);
                            setReadFilter("");
                            setClassFilter("");
                            setPage(1);
                            setExpanded(p.id);
                            markRead(p.id);
                          }}
                          className="text-xs font-semibold text-rose-600 hover:underline mt-2 flex items-center gap-1"
                        >
                          อ่านเพิ่มเติม
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Categories */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="font-bold text-slate-900 mb-4">ประกาศตามรายวิชา</h3>
                <div className="space-y-1">
                  {categories.map(({ key, icon: Icon, label, count }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setClassFilter(classFilter === key ? "" : key);
                        setPage(1);
                      }}
                      className={`w-full flex items-center gap-3 hover:bg-slate-50 rounded-xl px-2 py-2.5 transition-colors ${classFilter === key ? "bg-blue-50" : ""}`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-sm text-slate-700 flex-1 text-left">{label}</span>
                      <span className="text-sm font-semibold text-slate-800">{count}</span>
                    </button>
                  ))}
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

function SummaryRow({ label, value, valueColor }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`font-bold ${valueColor || "text-slate-900"}`}>{value}</span>
    </div>
  );
}
