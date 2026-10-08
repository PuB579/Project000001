import { useState, useRef } from "react";
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
  Settings as SettingsIcon,
  LogOut,
  Menu,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Pencil,
  Lock,
  Sun,
  Moon,
  Monitor,
  Globe,
  HelpCircle,
  Info,
  RotateCcw,
  Trash2,
} from "lucide-react";
import logoImg from "../../assets/logo-cs.png";
import { api, getUser } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { initial } from "../../lib/format";

const PREFS_KEY = "faceattend_student_prefs";
const DEFAULT_PREFS = {
  colorMode: "light",
  fontSize: "normal",
  notif: { checkin: true, schedule: true, announce: false },
};

function loadPrefs() {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY)) };
  } catch {
    return DEFAULT_PREFS;
  }
}

const navItems = [
  { icon: Home, label: "หน้าหลัก", to: "/dashboard" },
  { icon: ScanFace, label: "เช็คชื่อ", to: "/checkin" },
  { icon: History, label: "ประวัติการเช็คชื่อ", to: "/history" },
  { icon: UserPlus, label: "ลงทะเบียนใบหน้า", to: "/face-registration" },
  { icon: BookOpen, label: "วิชาเรียนของฉัน", to: "/courses" },
  { icon: CalendarDays, label: "ตารางเรียน", to: "/schedule" },
  { icon: Megaphone, label: "ประกาศ", to: "/announcements" },
  { icon: User, label: "โปรไฟล์", to: "/profile" },
  { icon: SettingsIcon, label: "ตั้งค่า", to: "/settings", active: true },
];

const settingsTabs = [
  { id: "personal", icon: User, label: "ข้อมูลส่วนตัว", sub: "แก้ไขข้อมูลส่วนตัวของคุณ" },
  { id: "security", icon: Lock, label: "ความปลอดภัย", sub: "เปลี่ยนรหัสผ่านและการยืนยันตัวตน" },
  { id: "notifications", icon: Bell, label: "การแจ้งเตือน", sub: "จัดการการแจ้งเตือนต่างๆ" },
  { id: "theme", icon: Moon, label: "ธีมและการแสดงผล", sub: "ตั้งค่าการแสดงผลและธีม" },
  { id: "language", icon: Globe, label: "ภาษา", sub: "ตั้งค่าภาษาในการใช้งาน" },
  { id: "help", icon: HelpCircle, label: "ช่วยเหลือ", sub: "ศูนย์ช่วยเหลือและคำถามที่พบบ่อย" },
  { id: "about", icon: Info, label: "เกี่ยวกับระบบ", sub: "ข้อมูลเกี่ยวกับระบบ" },
];

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
        checked ? "bg-blue-600" : "bg-slate-200"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function Settings() {
  const user = getUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("personal");
  const [prefs, setPrefs] = useState(loadPrefs);
  const { colorMode, fontSize, notif } = prefs;
  const meReq = useApi("/students/me");
  const me = meReq.data;
  const [showPwForm, setShowPwForm] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState({ tone: "", text: "" });
  const [pwBusy, setPwBusy] = useState(false);

  // การตั้งค่าส่วนตัวเก็บไว้ในเบราว์เซอร์นี้
  const updatePrefs = (patch) =>
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  const setColorMode = (v) => updatePrefs({ colorMode: v });
  const setFontSize = (v) => updatePrefs({ fontSize: v });
  const setNotif = (fn) => updatePrefs({ notif: fn(notif) });

  const changePassword = async () => {
    if (pw.next.length < 6) return setPwMsg({ tone: "error", text: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร" });
    if (pw.next !== pw.confirm) return setPwMsg({ tone: "error", text: "รหัสผ่านใหม่และการยืนยันไม่ตรงกัน" });
    setPwBusy(true);
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: { current_password: pw.current, new_password: pw.next },
      });
      setPw({ current: "", next: "", confirm: "" });
      setShowPwForm(false);
      setPwMsg({ tone: "success", text: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว" });
    } catch (err) {
      setPwMsg({ tone: "error", text: err.message });
    } finally {
      setPwBusy(false);
    }
  };
  const personalRef = useRef(null);
  const securityRef = useRef(null);
  const notificationsRef = useRef(null);
  const themeRef = useRef(null);

  const handleTabClick = (id) => {
    setActiveTab(id);
    const ref = { personal: personalRef, security: securityRef, notifications: notificationsRef, theme: themeRef }[id];
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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
            <h1 className="text-2xl font-bold text-slate-900">ตั้งค่า</h1>
            <p className="text-sm text-slate-500 mt-1">จัดการการตั้งค่าทั้งหมดของคุณ</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">
            {/* Settings nav */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 space-y-1 lg:sticky lg:top-6">
              {settingsTabs.map(({ id, icon: Icon, label, sub }) => (
                <button
                  key={id}
                  onClick={() => handleTabClick(id)}
                  className={`w-full flex items-start gap-3 text-left px-3.5 py-3 rounded-xl transition-colors ${
                    activeTab === id
                      ? "bg-blue-50 text-blue-600 border border-blue-100"
                      : "text-slate-500 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <Icon className="w-5 h-5 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div
                      className={`text-sm font-semibold ${
                        activeTab === id ? "text-blue-600" : "text-slate-700"
                      }`}
                    >
                      {label}
                    </div>
                    <div className="text-xs text-slate-400 leading-snug">{sub}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Right content */}
            <div className="space-y-5">
              {/* Personal info */}
              <div ref={personalRef} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-slate-900">ข้อมูลส่วนตัว</h3>
                  <Link to="/profile" className="flex items-center gap-1.5 border border-blue-200 text-blue-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                    แก้ไข
                  </Link>
                </div>

                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="shrink-0 self-center sm:self-start w-20 h-20 rounded-full bg-blue-600 text-white text-2xl font-bold flex items-center justify-center ring-4 ring-blue-50">
                    {initial(me?.full_name || user?.full_name)}
                  </div>

                  <div className="flex-1 divide-y divide-slate-100">
                    {[
                      ["ชื่อ-นามสกุล", me?.full_name],
                      ["รหัสนักศึกษา", me?.student_code],
                      ["Email", me?.email],
                      ["เบอร์โทรศัพท์", me?.phone],
                      ["สาขาวิชา", me?.major],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2.5"
                      >
                        <div className="text-sm text-slate-400 w-32 shrink-0">{label}</div>
                        <div className="text-sm text-slate-800 font-medium">{value || "-"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div className="space-y-5">
                  {/* Security */}
                  <div ref={securityRef} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 className="font-bold text-slate-900 mb-4">ความปลอดภัย</h3>
                    <div className="space-y-1">
                      <SettingRow
                        icon={<Lock className="w-5 h-5 text-blue-600" />}
                        iconBg="bg-blue-100"
                        title="เปลี่ยนรหัสผ่าน"
                        sub="อัปเดตรหัสผ่านเพื่อความปลอดภัยของบัญชี"
                        action={
                          <button
                            onClick={() => {
                              setShowPwForm((v) => !v);
                              setPwMsg({ tone: "", text: "" });
                            }}
                            className="flex items-center gap-1.5 text-blue-600 border border-blue-200 text-xs font-semibold px-3.5 py-2 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
                          >
                            {showPwForm ? "ยกเลิก" : "เปลี่ยนรหัสผ่าน"}
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        }
                      />
                      {pwMsg.text && (
                        <div className={`text-sm px-2 ${pwMsg.tone === "success" ? "text-emerald-600" : "text-red-500"}`}>
                          {pwMsg.text}
                        </div>
                      )}
                      {showPwForm && (
                        <div className="space-y-2.5 pt-2">
                          {[
                            ["current", "รหัสผ่านปัจจุบัน"],
                            ["next", "รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"],
                            ["confirm", "ยืนยันรหัสผ่านใหม่"],
                          ].map(([key, label]) => (
                            <input
                              key={key}
                              type="password"
                              placeholder={label}
                              value={pw[key]}
                              onChange={(e) => setPw((p) => ({ ...p, [key]: e.target.value }))}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                          ))}
                          <button
                            onClick={changePassword}
                            disabled={pwBusy || !pw.current || !pw.next}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl"
                          >
                            {pwBusy ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notifications */}
                  <div
                    ref={notificationsRef}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
                  >
                    <h3 className="font-bold text-slate-900 mb-4">การแจ้งเตือน</h3>
                    <div className="space-y-1">
                      <SettingRow
                        icon={<Bell className="w-5 h-5 text-blue-600" />}
                        iconBg="bg-blue-100"
                        title="แจ้งเตือนการเช็คชื่อ"
                        sub="รับการแจ้งเตือนเมื่อมีการเช็คชื่อในรายวิชา"
                        action={
                          <Toggle
                            checked={notif.checkin}
                            onChange={(v) => setNotif((n) => ({ ...n, checkin: v }))}
                          />
                        }
                      />
                      <SettingRow
                        icon={<CalendarDays className="w-5 h-5 text-emerald-600" />}
                        iconBg="bg-emerald-100"
                        title="แจ้งเตือนตารางเรียน"
                        sub="รับการแจ้งเตือนก่อนเวลาเรียน"
                        action={
                          <Toggle
                            checked={notif.schedule}
                            onChange={(v) => setNotif((n) => ({ ...n, schedule: v }))}
                          />
                        }
                      />
                      <SettingRow
                        icon={<Megaphone className="w-5 h-5 text-amber-600" />}
                        iconBg="bg-amber-100"
                        title="แจ้งเตือนประกาศ"
                        sub="รับการแจ้งเตือนเมื่อมีประกาศใหม่"
                        action={
                          <Toggle
                            checked={notif.announce}
                            onChange={(v) => setNotif((n) => ({ ...n, announce: v }))}
                          />
                        }
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-3">การตั้งค่านี้บันทึกไว้ในเบราว์เซอร์เครื่องนี้</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Theme & display */}
                  <div ref={themeRef} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 className="font-bold text-slate-900 mb-4">ธีมและการแสดงผล</h3>

                    <div className="mb-5">
                      <div className="text-xs text-slate-500 font-medium mb-2">โหมดสี</div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "light", icon: Sun, label: "สว่าง" },
                          { id: "dark", icon: Moon, label: "มืด" },
                          { id: "system", icon: Monitor, label: "ตามระบบ" },
                        ].map(({ id, icon: Icon, label }) => (
                          <button
                            key={id}
                            onClick={() => setColorMode(id)}
                            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-colors ${
                              colorMode === id
                                ? "border-blue-400 bg-blue-50 text-blue-600"
                                : "border-slate-200 text-slate-500 hover:bg-slate-50"
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-5">
                      <div className="text-xs text-slate-500 font-medium mb-2">ขนาดตัวอักษร</div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "small", label: "เล็ก" },
                          { id: "normal", label: "ปกติ" },
                          { id: "large", label: "ใหญ่" },
                        ].map(({ id, label }) => (
                          <button
                            key={id}
                            onClick={() => setFontSize(id)}
                            className={`py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                              fontSize === id
                                ? "border-blue-400 bg-blue-50 text-blue-600"
                                : "border-slate-200 text-slate-500 hover:bg-slate-50"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500 font-medium mb-2">ภาษาของระบบ</div>
                      <button className="w-full flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 font-medium hover:bg-slate-50 transition-colors">
                        <Globe className="w-4 h-4 text-slate-400" />
                        ภาษาไทย
                        <ChevronDown className="w-4 h-4 text-slate-400 ml-auto" />
                      </button>
                    </div>
                  </div>

                  {/* Other settings */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 className="font-bold text-slate-900 mb-4">ตั้งค่าอื่นๆ</h3>
                    <div className="space-y-1">
                      <button
                        onClick={() => updatePrefs(DEFAULT_PREFS)}
                        className="w-full flex items-center gap-3 hover:bg-slate-50 rounded-xl px-2 py-2.5 transition-colors"
                      >
                        <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                          <RotateCcw className="w-5 h-5 text-slate-500" />
                        </div>
                        <div className="text-left min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-800">ตั้งค่าเริ่มต้น</div>
                          <div className="text-xs text-slate-400">รีเซ็ตการตั้งค่าทั้งหมด</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                      </button>
                      <div className="w-full flex items-center gap-3 rounded-xl px-2 py-2.5">
                        <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                          <Trash2 className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="text-left min-w-0 flex-1">
                          <div className="text-sm font-semibold text-red-500">ลบบัญชี</div>
                          <div className="text-xs text-slate-400">
                            หากต้องการลบบัญชี กรุณาติดต่ออาจารย์ผู้ดูแลระบบ
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
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

function SettingRow({ icon, iconBg, title, sub, action }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <div className="text-xs text-slate-400 leading-snug">{sub}</div>
      </div>
      {action}
    </div>
  );
}