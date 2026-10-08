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
  ChevronRight,
  ShieldCheck,
  Pencil,
  Mail,
  Phone,
  Building2,
  GraduationCap,
  CheckCircle2,
  CalendarCheck,
  BarChart3,
  Lock,
} from "lucide-react";
import logoImg from "../../assets/logo-cs.png";
import { api, getUser } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { countStatus, initial, isoDate, thaiDate } from "../../lib/format";

const FACE_BADGE = {
  approved: { text: "ลงทะเบียนแล้ว", desc: "ใบหน้าของคุณได้รับการอนุมัติแล้ว", cls: "bg-emerald-100 text-emerald-600" },
  pending: { text: "รออนุมัติ", desc: "ส่งรูปใบหน้าแล้ว กำลังรออาจารย์อนุมัติ", cls: "bg-amber-100 text-amber-600" },
  rejected: { text: "ถูกปฏิเสธ", desc: "รูปใบหน้าถูกปฏิเสธ กรุณาลงทะเบียนใหม่", cls: "bg-red-100 text-red-600" },
  none: { text: "ยังไม่ลงทะเบียน", desc: "คุณยังไม่ได้ลงทะเบียนใบหน้า", cls: "bg-slate-100 text-slate-500" },
};

const navItems = [
  { icon: Home, label: "หน้าหลัก", to: "/dashboard" },
  { icon: ScanFace, label: "เช็คชื่อ", to: "/checkin" },
  { icon: History, label: "ประวัติการเช็คชื่อ", to: "/history" },
  { icon: UserPlus, label: "ลงทะเบียนใบหน้า", to: "/face-registration" },
  { icon: BookOpen, label: "วิชาเรียนของฉัน", to: "/courses" },
  { icon: CalendarDays, label: "ตารางเรียน", to: "/schedule" },
  { icon: Megaphone, label: "ประกาศ", to: "/announcements" },
  { icon: User, label: "โปรไฟล์", to: "/profile", active: true },
  { icon: Settings, label: "ตั้งค่า", to: "/settings" },
];

export default function Profile() {
  const user = getUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [today] = useState(() => isoDate());
  const meReq = useApi("/students/me");
  const sessionsReq = useApi(`/attendance/my-sessions?start=2000-01-01&end=${today}`, []);
  const me = meReq.data;
  const stats = countStatus(sessionsReq.data || []);
  const face = FACE_BADGE[me?.face_status || "none"];
  const [editingPhone, setEditingPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [saveMsg, setSaveMsg] = useState({ tone: "", text: "" });

  const startEdit = () => {
    setPhone(me?.phone || "");
    setSaveMsg({ tone: "", text: "" });
    setEditingPhone(true);
  };

  const savePhone = async () => {
    try {
      await api("/students/me", { method: "PUT", body: { phone: phone.trim() || null } });
      setEditingPhone(false);
      setSaveMsg({ tone: "success", text: "บันทึกเบอร์โทรศัพท์แล้ว" });
      meReq.reload();
    } catch (err) {
      setSaveMsg({ tone: "error", text: err.message });
    }
  };

  const personalInfo = [
    { label: "ชื่อ-นามสกุล", value: me?.full_name },
    { label: "รหัสนักศึกษา", value: me?.student_code },
    { label: "Email", value: me?.email },
    { label: "เบอร์โทรศัพท์", value: me?.phone, editable: true },
    { label: "คณะ", value: me?.faculty },
    { label: "สาขาวิชา", value: me?.major },
  ];
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
              โปรไฟล์ของฉัน
              <User className="w-5 h-5 text-slate-400" />
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              จัดการข้อมูลส่วนตัวและการตั้งค่าบัญชี
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.7fr] gap-5 items-start">
            {/* Left: avatar card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 w-28 h-28 rounded-full bg-blue-600 text-white text-4xl font-bold flex items-center justify-center ring-4 ring-blue-50">
                  {initial(me?.full_name || user?.full_name)}
                </div>
                <div className="text-lg font-bold text-slate-900">{me?.full_name || user?.full_name}</div>
                <div className="text-sm text-slate-400 mb-3">นักศึกษา</div>
                <span className="inline-block bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
                  รหัสนักศึกษา {me?.student_code || "-"}
                </span>
                {meReq.error && <p className="text-sm text-red-500 mb-3">{meReq.error}</p>}
              </div>

              <div className="space-y-3 text-sm border-t border-slate-100 pt-5">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-600 truncate">{me?.email || "-"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-600">{me?.phone || "-"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-600">{me?.faculty || "-"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-600">{me?.major || "-"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-600">
                    สร้างบัญชีเมื่อ {me ? thaiDate(me.created_at, { day: "numeric", month: "long", year: "numeric" }) : "-"}
                  </span>
                </div>
              </div>

              <button
                onClick={startEdit}
                className="w-full flex items-center justify-center gap-2 mt-6 border border-blue-200 text-blue-600 text-sm font-semibold py-3 rounded-xl hover:bg-blue-50 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                แก้ไขข้อมูลโปรไฟล์
              </button>
              <p className="text-[11px] text-slate-400 mt-2 text-center">
                แก้ไขได้เฉพาะเบอร์โทรศัพท์ ข้อมูลอื่นกรุณาติดต่ออาจารย์
              </p>
            </div>

            {/* Right: personal info */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-slate-900">ข้อมูลส่วนตัว</h3>
                <button onClick={startEdit} className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:underline">
                  <Pencil className="w-3.5 h-3.5" />
                  แก้ไข
                </button>
              </div>

              {saveMsg.text && (
                <div className={`text-sm mb-3 ${saveMsg.tone === "success" ? "text-emerald-600" : "text-red-500"}`}>
                  {saveMsg.text}
                </div>
              )}
              <div className="divide-y divide-slate-100">
                {personalInfo.map((f) => (
                  <div
                    key={f.label}
                    className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-3"
                  >
                    <div className="text-sm text-slate-400 w-36 shrink-0">{f.label}</div>
                    {f.editable && editingPhone ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                        <button onClick={savePhone} className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg">
                          บันทึก
                        </button>
                        <button onClick={() => setEditingPhone(false)} className="text-sm text-slate-500 px-2 py-1.5">
                          ยกเลิก
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-800 font-medium">{f.value || "-"}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Attendance info */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 mb-4">ข้อมูลการเข้าเรียน</h3>
              <div className="space-y-2">
                <InfoRow
                  icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  iconBg="bg-emerald-100"
                  label="อัตราการเข้าเรียนเฉลี่ย"
                  value={`${stats.rate.toFixed(1)}%`}
                />
                <InfoRow
                  icon={<CalendarCheck className="w-5 h-5 text-blue-600" />}
                  iconBg="bg-blue-100"
                  label="เช็คชื่อทั้งหมด"
                  value={`${stats.present + stats.late} ครั้ง`}
                />
                <InfoRow
                  icon={<BarChart3 className="w-5 h-5 text-amber-600" />}
                  iconBg="bg-amber-100"
                  label="ขาดเรียน"
                  value={`${stats.absent} ครั้ง`}
                />
              </div>
            </div>

            {/* Right column stacked */}
            <div className="space-y-5">
              {/* Face registration */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900">การลงทะเบียนใบหน้า</h3>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${face.cls}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {face.text}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <ScanFace className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">
                      สถานะการลงทะเบียน
                    </div>
                    <div className="text-xs text-slate-500">{face.desc}</div>
                  </div>
                </div>

                <Link
                  to="/face-registration"
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-semibold py-3 rounded-xl"
                >
                  <UserPlus className="w-4 h-4" />
                  {me?.face_status === "none" ? "ลงทะเบียนใบหน้า" : "อัปเดตข้อมูลใบหน้า"}
                </Link>
              </div>

              {/* Security */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="font-bold text-slate-900 mb-4">ความปลอดภัย</h3>
                <Link to="/settings" className="w-full flex items-center gap-3 hover:bg-slate-50 rounded-xl px-2 py-2 transition-colors">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-800">เปลี่ยนรหัสผ่าน</div>
                    <div className="text-xs text-slate-400">
                      อัปเดตรหัสผ่านเพื่อความปลอดภัยของบัญชี
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </Link>
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

function InfoRow({ icon, iconBg, label, value }) {
  return (
    <Link to="/history" className="w-full flex items-center gap-3 hover:bg-slate-50 rounded-xl px-2 py-2.5 transition-colors">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="text-left min-w-0 flex-1">
        <div className="text-xs text-slate-400">{label}</div>
        <div className="text-base font-bold text-slate-900">{value}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
    </Link>
  );
}
