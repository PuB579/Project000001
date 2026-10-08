import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { api, getUser } from "../../lib/api";
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
  ShieldCheck,
  Camera,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Menu,
  Search,
  Bell,
  ChevronDown,
  Info,
  Users,
  ArrowRight,
  Code2,
} from "lucide-react";
import logoImg from "../../assets/logo-cs.png";

const navItems = [
  { icon: Home, label: "หน้าหลัก", to: "/dashboard" },
  { icon: ScanFace, label: "เช็คชื่อ", to: "/checkin", active: true },
  { icon: History, label: "ประวัติการเช็คชื่อ", to: "/history" },
  { icon: UserPlus, label: "ลงทะเบียนใบหน้า", to: "/face-registration" },
  { icon: BookOpen, label: "วิชาเรียนของฉัน", to: "/courses" },
  { icon: CalendarDays, label: "ตารางเรียน", to: "/schedule" },
  { icon: Megaphone, label: "ประกาศ", to: "/announcements" },
  { icon: User, label: "โปรไฟล์", to: "/profile" },
  { icon: Settings, label: "ตั้งค่า", to: "/settings" },
];

const hhmm = (t) => (t ? t.slice(0, 5) : "--:--");
const dateHHMM = (iso) => (iso ? iso.slice(11, 16) : "--:--");

// สถานะของคาบเรียนวันนี้ (จาก /attendance/my-sessions) สำหรับแสดงในรายการ
function sessionBadge(s, now) {
  if (s.my_status === "present") return { status: "success", badge: "เข้าเรียน" };
  if (s.my_status === "late") return { status: "late", badge: "มาสาย" };
  if (s.my_status === "absent") return { status: "absent", badge: "ขาดเรียน" };
  if (s.open_at && now < new Date(s.open_at)) return { status: "absent", badge: "ยังไม่ถึงเวลา" };
  if (s.close_at && now > new Date(s.close_at)) return { status: "absent", badge: "หมดเวลา" };
  return { status: "late", badge: "รอเช็คชื่อ" };
}

export default function CheckIn() {
  const user = getUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  // idle | scanning | success | error
  const [phase, setPhase] = useState("idle");
  const [resultMessage, setResultMessage] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadSessions = async () => {
    try {
      setSessions(await api("/attendance/my-sessions"));
      setLoadError("");
    } catch (err) {
      setLoadError(err.message);
    }
  };

  // โหลดคาบเรียนวันนี้ แล้วเลือกคาบที่เปิดอยู่และยังไม่ได้เช็คชื่อเป็นค่าเริ่มต้น
  useEffect(() => {
    let cancelled = false;
    api("/attendance/my-sessions")
      .then((data) => {
        if (cancelled) return;
        setSessions(data);
        const best =
          data.find((s) => s.is_open && !s.my_status) || data.find((s) => s.is_open) || data[0];
        setSelectedId(best ? best.session_id : null);
      })
      .catch((err) => !cancelled && setLoadError(err.message))
      .finally(() => !cancelled && setSessionsLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // เปิดกล้องจริงของเครื่อง
  useEffect(() => {
    let cancelled = false;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        if (!cancelled) setCameraError(err.message || "ไม่สามารถเปิดกล้องได้");
      }
    }
    startCamera();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const selected = sessions.find((s) => s.session_id === selectedId) || null;
  const closeAt = selected?.close_at ? new Date(selected.close_at) : null;
  const isOpenNow =
    !!selected &&
    (!selected.open_at || currentTime >= new Date(selected.open_at)) &&
    (!closeAt || currentTime <= closeAt);
  const alreadyChecked = !!selected?.my_status;
  const canScan = isOpenNow && !alreadyChecked && !cameraError && phase !== "scanning";

  const getRemainingMinutes = () => {
    if (!closeAt) return "-";
    const diff = closeAt - currentTime;
    if (diff <= 0) return "0:00";
    return `${Math.floor(diff / 60000)}:${String(Math.floor((diff % 60000) / 1000)).padStart(
      2,
      "0"
    )}`;
  };

  // ถ่ายภาพจากวิดีโอ (ภาพจริง ไม่กลับด้านแบบที่แสดงบนจอ) เพื่อส่งให้ backend ตรวจใบหน้า
  const captureFrame = () =>
    new Promise((resolve, reject) => {
      const video = videoRef.current;
      if (!video || !video.videoWidth) {
        reject(new Error("กล้องยังไม่พร้อม กรุณารอสักครู่"));
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("ถ่ายภาพไม่สำเร็จ"))),
        "image/jpeg",
        0.92
      );
    });

  const handleScan = async () => {
    if (!selected) return;
    setPhase("scanning");
    setResultMessage("");
    try {
      const blob = await captureFrame();
      const form = new FormData();
      form.append("file", blob, "checkin.jpg");
      const res = await api(`/attendance/checkin?session_id=${selected.session_id}`, {
        method: "POST",
        body: form,
      });
      setPhase("success");
      setResultMessage(
        `${res.status === "late" ? "บันทึกว่ามาสาย" : "บันทึกการเข้าเรียนแล้ว"} (ความมั่นใจ ${Number(
          res.confidence
        ).toFixed(1)}%)`
      );
      loadSessions();
    } catch (err) {
      setPhase("error");
      setResultMessage(err.message);
    }
  };

  const getToastContent = () => {
    if (phase === "scanning")
      return { icon: "⟳", scanning: true, tone: "blue", title: "กำลังยืนยันตัวตน...", subtitle: "กรุณาอยู่นิ่งๆ" };
    if (phase === "success")
      return { icon: "✓", scanning: false, tone: "green", title: "เช็คชื่อสำเร็จ", subtitle: resultMessage };
    if (phase === "error")
      return { icon: "!", scanning: false, tone: "red", title: "เช็คชื่อไม่สำเร็จ", subtitle: resultMessage };
    if (alreadyChecked)
      return {
        icon: "✓",
        scanning: false,
        tone: "green",
        title: "เช็คชื่อคาบนี้แล้ว",
        subtitle: `เวลา ${hhmm(selected.my_check_in_time)}`,
      };
    return { icon: "◎", scanning: false, tone: "blue", title: "พร้อมสแกนใบหน้า", subtitle: "มองที่กล้องแล้วกดปุ่มสแกน" };
  };

  const toast = getToastContent();
  const borderColor =
    phase === "success" || alreadyChecked ? "#22c55e" : phase === "error" ? "#ef4444" : "#3b82f6";
  const toastBg = { blue: "bg-blue-600", green: "bg-emerald-600", red: "bg-red-600" }[toast.tone];
  const historyItems = sessions.map((s) => ({
    time: s.my_check_in_time ? s.my_check_in_time.slice(0, 8) : hhmm(s.start_time),
    code: s.course_code,
    name: s.course_name,
    ...sessionBadge(s, currentTime),
  }));

  const statusIcon = (s) => {
    if (s === "success") return <CheckCircle2 className="w-4 h-4" />;
    if (s === "late") return <Clock className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };
  const statusBg = (s) => {
    if (s === "success") return "bg-emerald-50 text-emerald-600";
    if (s === "late") return "bg-amber-50 text-amber-600";
    return "bg-slate-100 text-slate-400";
  };
  const badgeBg = (s) => {
    if (s === "success") return "bg-emerald-50 text-emerald-600";
    if (s === "late") return "bg-amber-50 text-amber-600";
    return "bg-slate-100 text-slate-400";
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
              {(user?.full_name || "?").charAt(0)}
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
          <div>
            <h1 className="text-2xl font-bold text-slate-900">เช็คชื่อเข้าเรียน</h1>
            <p className="text-sm text-slate-500 mt-1">
              สแกนใบหน้าของคุณเพื่อเช็คชื่อเข้าเรียน
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.95fr_1fr]">
            {/* ===== LEFT COLUMN ===== */}
            <div className="space-y-5">
              {/* Combined status + camera card */}
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                {/* Status bar */}
                <div className="bg-gradient-to-r from-blue-50/80 to-white px-6 py-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-400 shrink-0">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 shrink-0">
                      <div className="text-base font-bold text-slate-900">
                        {sessionsLoading
                          ? "กำลังโหลดคาบเรียน..."
                          : !selected
                          ? "วันนี้ไม่มีคาบเรียน"
                          : alreadyChecked
                          ? "เช็คชื่อคาบนี้แล้ว"
                          : isOpenNow
                          ? "พร้อมเช็คชื่อ"
                          : "ยังเช็คชื่อไม่ได้"}
                      </div>
                      <div className="text-xs text-slate-500 leading-snug">
                        {loadError ||
                          (selected
                            ? "กรุณาจัดตำแหน่งใบหน้าให้อยู่ในกรอบ"
                            : "เมื่ออาจารย์เปิดคาบเรียน รายวิชาจะแสดงที่นี่")}
                      </div>
                      {sessions.length > 1 && (
                        <select
                          value={selectedId ?? ""}
                          onChange={(e) => {
                            setSelectedId(Number(e.target.value));
                            setPhase("idle");
                          }}
                          className="mt-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                        >
                          {sessions.map((s) => (
                            <option key={s.session_id} value={s.session_id}>
                              {s.course_code} {s.course_name} ({hhmm(s.start_time)})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {selected && (
                      <div className="ml-auto shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="text-[10px] text-slate-500">เวลาเปิดเช็คชื่อ</div>
                          <div className="text-xl font-bold text-slate-900">{dateHHMM(selected.open_at)}</div>
                          <div className="text-sm text-slate-400">-</div>
                          <div className="text-xl font-bold text-slate-900">{dateHHMM(selected.close_at)}</div>
                          {isOpenNow ? (
                            <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              เปิดเช็คชื่ออยู่
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              ปิดเช็คชื่อ
                            </div>
                          )}
                        </div>
                        {isOpenNow && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="text-[10px] text-slate-500">เหลือเวลา</div>
                            <div className="text-sm font-bold text-blue-600">
                              {getRemainingMinutes()} นาที
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Camera section — live feed */}
                <div
                  className="relative flex items-center justify-center"
                  style={{ background: "linear-gradient(180deg, #0c1929, #162236)", minHeight: 420 }}
                >
                  {/* Camera status indicator */}
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        cameraError ? "bg-red-500" : "bg-emerald-500 animate-pulse"
                      }`}
                    />
                    <span className="text-sm text-slate-200 font-medium">
                      {cameraError ? "กล้องไม่พร้อม" : "กล้องกำลังทำงาน"}
                    </span>
                  </div>

                  {cameraError ? (
                    <div className="flex flex-col items-center justify-center gap-3 text-center px-6">
                      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                        <Camera className="w-8 h-8 text-red-400" />
                      </div>
                      <div className="text-sm font-semibold text-white">ไม่สามารถเปิดกล้องได้</div>
                      <div className="text-xs text-slate-400 max-w-xs">{cameraError}</div>
                      <div className="text-xs text-slate-500 max-w-xs">
                        กรุณาอนุญาตให้เว็บไซต์เข้าถึงกล้อง แล้วลองใหม่อีกครั้ง
                      </div>
                      <button
                        onClick={() => {
                          setCameraError(null);
                          window.location.reload();
                        }}
                        className="mt-2 px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                      >
                        ลองอีกครั้ง
                      </button>
                    </div>
                  ) : (
                    <div
                      className="relative w-full h-full flex items-center justify-center"
                      style={{ minHeight: 420 }}
                    >
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover absolute inset-0"
                        style={{ transform: "scaleX(-1)" }}
                      />
                      {/* Detection frame overlay */}
                      <div
                        className="absolute rounded-2xl transition-all duration-500"
                        style={{
                          top: "10%",
                          left: "25%",
                          right: "25%",
                          bottom: "10%",
                          border: `2.5px solid ${borderColor}`,
                          boxShadow: `0 0 25px ${borderColor}33`,
                        }}
                      >
                        {[
                          "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-lg",
                          "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-lg",
                          "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-lg",
                          "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-lg",
                        ].map((pos, i) => (
                          <div key={i} className={`absolute w-6 h-6 ${pos}`} style={{ borderColor }} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status toast */}
                  {!cameraError && (
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-black/65 backdrop-blur-xl px-5 py-3 rounded-full">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm shrink-0 ${
                          `${toastBg} ${toast.scanning ? "animate-spin" : ""}`
                        }`}
                        style={toast.scanning ? { animationDuration: "2s" } : undefined}
                      >
                        {toast.icon}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white leading-snug">
                          {toast.title}
                        </div>
                        <div className="text-xs text-slate-400">{toast.subtitle}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tip */}
                <div className="flex items-center gap-3 px-5 py-3 bg-sky-50 border-t border-sky-100">
                  <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0">
                    <Info className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-sky-700">
                    คำแนะนำ: กรุณาอยู่นิ่งๆ อยู่ในที่แสงเพียงพอ และมองตรงไปที่กล้อง
                  </span>
                </div>

                {/* Scan */}
                <div className="px-6 py-4 border-t border-slate-100">
                  <button
                    onClick={handleScan}
                    disabled={!canScan}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
                  >
                    <ScanFace className="w-5 h-5" />
                    {phase === "scanning"
                      ? "กำลังตรวจสอบใบหน้า..."
                      : alreadyChecked
                      ? "เช็คชื่อคาบนี้แล้ว"
                      : phase === "error"
                      ? "สแกนใหม่อีกครั้ง"
                      : "สแกนใบหน้าเพื่อเช็คชื่อ"}
                  </button>
                </div>
              </div>
            </div>

            {/* ===== RIGHT COLUMN ===== */}
            <div className="space-y-5">
              {/* Subject info */}
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold text-slate-900">ข้อมูลรายวิชา</div>
                </div>

                {selected ? (
                  <>
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 shrink-0">
                        <Code2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-lg font-extrabold text-slate-900">{selected.course_code}</div>
                        <div className="text-xs text-slate-500">{selected.course_name}</div>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm text-slate-600">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-slate-900 font-semibold">{selected.teacher_name || "-"}</div>
                          <div className="text-xs text-slate-500">อาจารย์ผู้สอน</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-slate-900 font-semibold">{selected.class_code || "-"}</div>
                          <div className="text-xs text-slate-500">กลุ่มเรียน</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-slate-900 font-semibold">
                            {hhmm(selected.start_time)}
                            {selected.end_time ? ` - ${hhmm(selected.end_time)}` : ""}
                          </div>
                          <div className="text-xs text-slate-500">เวลาเรียนวันนี้</div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-slate-400">ยังไม่มีคาบเรียนที่เปิดในวันนี้</div>
                )}
              </div>

              {/* Steps */}
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
                <div className="text-sm font-semibold text-slate-900 mb-4">ขั้นตอนการเช็คชื่อ</div>
                <ol className="space-y-4 text-sm text-slate-600">
                  {[
                    "เปิดกล้องและจัดตำแหน่งใบหน้าให้อยู่ในกรอบ",
                    "ระบบจะทำการตรวจจับและยืนยันตัวตน",
                    "เช็คชื่อสำเร็จ ระบบจะแสดงสถานะให้ทราบ",
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                        {i + 1}
                      </div>
                      <span>{text}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Today's history */}
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold text-slate-900">คาบเรียนวันนี้</div>
                </div>
                <div className="space-y-3">
                  {historyItems.length === 0 && (
                    <div className="text-xs text-slate-400">ยังไม่มีคาบเรียนวันนี้</div>
                  )}
                  {historyItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${statusBg(
                            item.status
                          )}`}
                        >
                          {statusIcon(item.status)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900">{item.time}</div>
                          <div className="text-xs text-slate-400 truncate">
                            {item.code} {item.name}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 ml-2 ${badgeBg(
                          item.status
                        )}`}
                      >
                        {item.badge}
                      </span>
                    </div>
                  ))}
                </div>

                <Link
                  to="/history"
                  className="flex items-center justify-center gap-1 mt-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-blue-500 hover:bg-blue-50/50 transition-colors"
                >
                  ดูประวัติการเช็คชื่อทั้งหมด <ArrowRight className="w-3 h-3" />
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