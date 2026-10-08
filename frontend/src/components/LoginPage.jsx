import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearSession, saveSession } from "../lib/api";
import logoImg from "../assets/logo-cs.png";
import bgHero from "../assets/bg-hero.jpg";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ScanFace,
  Clock,
  BarChart3,
  Info,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
} from "lucide-react";

const ROLE_HOME = {
  student: "/dashboard",
  teacher: "/teacher-dashboard",
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [touched, setTouched] = useState({ username: false, password: false });
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // ทุกปุ่ม "ออกจากระบบ" ลิงก์มาที่หน้านี้ จึงล้าง session ทุกครั้งที่เข้าหน้า login
  useEffect(() => {
    clearSession();
  }, []);

  const navLinks = [
    { label: "หน้าแรก", active: true },
    { label: "เกี่ยวกับระบบ" },
    { label: "คุณสมบัติ" },
    { label: "วิธีการใช้งาน" },
    { label: "ติดต่อเรา" },
  ];

  // ----- field-level validation -----
  const usernameError =
    touched.username && username.trim() === ""
      ? "กรุณากรอกชื่อผู้ใช้ / รหัสนักศึกษา / รหัสอาจารย์"
      : "";

  const passwordError =
    touched.password && password === ""
      ? "กรุณากรอกรหัสผ่าน"
      : touched.password && password.length > 0 && password.length < 6
      ? "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"
      : "";

  const usernameValid = touched.username && username.trim() !== "" && !usernameError;
  const passwordValid =
    touched.password && password.length >= 6 && !passwordError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ username: true, password: true });
    setSuccess(false);

    if (username.trim() === "" || password === "") {
      setSubmitError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    if (password.length < 6) {
      setSubmitError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setLoading(true);
    setSubmitError("");

    try {
      const data = await api("/auth/login", {
        method: "POST",
        auth: false,
        body: { username: username.trim(), password },
      });
      saveSession(data.access_token, data.user, rememberMe);
      setSuccess(true);
      setTimeout(() => navigate(ROLE_HOME[data.user.role] || "/dashboard"), 900);
    } catch (err) {
      setSuccess(false);
      setSubmitError(
        err.status === 401
          ? "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง"
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white font-sans overflow-x-hidden">
      <style>{`
        @keyframes floatFace {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes shakeX {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.08); }
        }
        @keyframes ringPulse {
          0% { transform: scale(0.9); opacity: 0.8; }
          70% { transform: scale(1.25); opacity: 0; }
          100% { transform: scale(1.25); opacity: 0; }
        }
        @keyframes scanSweep {
          0% { top: 8%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 88%; opacity: 0; }
        }
        @keyframes dashRotate {
          to { stroke-dashoffset: -400; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-floatFace { animation: floatFace 5s ease-in-out infinite; }
        .animate-shake { animation: shakeX 0.5s; }
        .animate-glow { animation: glowPulse 3.5s ease-in-out infinite; }
        .animate-ring { animation: ringPulse 2.2s ease-out infinite; }
        .animate-scan { animation: scanSweep 3s ease-in-out infinite; }
        .animate-dash { animation: dashRotate 14s linear infinite; }
        .animate-fadeUp { animation: fadeUp 0.6s ease-out both; }
      `}</style>

      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logoImg}
              alt="Computer Science, Maejo University"
              className="h-12 md:h-14 w-auto object-contain shrink-0"
            />
            <div className="leading-tight hidden sm:block">
              <div className="text-lg font-bold text-slate-900">CS FaceAttend</div>
              <div className="text-[11px] text-slate-400 -mt-0.5">
                Computer Science AI Face Attendance System
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 lg:gap-9 text-[15px] text-slate-600 font-medium">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href="#"
                className={`relative transition-colors ${
                  link.active ? "text-blue-600" : "hover:text-blue-600"
                }`}
              >
                {link.label}
                {link.active && (
                  <span className="absolute -bottom-6 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </a>
            ))}
          </nav>

          <button className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-blue-200">
            <User className="w-4 h-4" />
            เข้าสู่ระบบ
          </button>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="เปิดเมนู"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-6 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href="#"
                className={`text-[15px] font-medium ${
                  link.active ? "text-blue-600" : "text-slate-600"
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </header>

      {/* ---------- Body ---------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-blue-50 to-white min-h-[calc(100vh-80px)]">
        {/* background artwork */}
        <img
          src={bgHero}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-90"
        />

        <div className="relative max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-20 grid lg:grid-cols-[5fr_4fr] gap-12 lg:gap-20 items-start">
          {/* Left: marketing content matching the design */}
          <div className="hidden lg:block">
            <span className="inline-block bg-blue-100 text-blue-600 text-xs font-semibold px-4 py-2 rounded-full mb-6">
              ระบบเช็คชื่ออัจฉริยะ
            </span>

            <div className="flex items-start gap-6">
              <div className="flex-1 min-w-0">
                <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-slate-900 mb-6">
                  เช็คชื่อด้วยใบหน้า
                  <br />
                  <span className="text-blue-600">สะดวก รวดเร็ว แม่นยำ</span>
                </h1>

                <p className="text-slate-500 text-base leading-relaxed max-w-sm">
                  ระบบเช็คชื่อด้วยการยืนยันใบหน้าผ่านโทรศัพท์มือถือ
                  ปลอดภัย เชื่อถือได้ ลดเวลาในการเช็คชื่อ
                </p>
              </div>
            </div>

            {/* feature strip card, matching landing page */}
            <div className="mt-10 bg-white rounded-3xl shadow-lg shadow-blue-100/70 border border-slate-100 px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
              <Feature
                icon={<ScanFace className="w-7 h-7 text-blue-600" />}
                title="ยืนยันตัวตนด้วยใบหน้า"
                desc="ใช้เทคโนโลยี AI ในการจดจำใบหน้า"
              />
              <Feature
                icon={<Clock className="w-7 h-7 text-blue-600" />}
                title="ประหยัดเวลา"
                desc="เช็คชื่อได้รวดเร็ว"
              />
              <Feature
                icon={<ShieldCheck className="w-7 h-7 text-blue-600" />}
                title="ปลอดภัย เชื่อถือได้"
                desc="ข้อมูลถูกเข้ารหัสปลอดภัย"
              />
              <Feature
                icon={<BarChart3 className="w-7 h-7 text-blue-600" />}
                title="รายงานและสถิติ"
                desc="ดูรายงานการเข้าเรียน"
              />
            </div>
          </div>

          {/* Left content, simplified, for smaller screens */}
          <div className="lg:hidden text-center mb-2">
            <span className="inline-block bg-blue-100 text-blue-600 text-xs font-semibold px-4 py-2 rounded-full mb-4">
              ระบบเช็คชื่ออัจฉริยะ
            </span>
            <h1 className="text-2xl font-extrabold leading-tight text-slate-900">
              เช็คชื่อด้วยใบหน้า{" "}
              <span className="text-blue-600">สะดวก รวดเร็ว แม่นยำ</span>
            </h1>
          </div>

          {/* Right: login card */}
          <div className="relative lg:-mt-16">
            <form
              onSubmit={handleSubmit}
              noValidate
              className="relative bg-white rounded-3xl shadow-2xl shadow-blue-100 border border-slate-100 px-8 py-10 md:px-10 w-full"
            >
              {/* icon */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">เข้าสู่ระบบ</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Computer Science AI Face Attendance System
                </p>
              </div>

              {/* username */}
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                ชื่อผู้ใช้ / รหัสนักศึกษา / รหัสอาจารย์
              </label>
              <div className="relative mb-1">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, username: true }))}
                  placeholder="อีเมล รหัสนักศึกษา หรือรหัสอาจารย์"
                  className={`w-full pl-11 pr-11 py-3.5 rounded-xl border bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                    usernameError
                      ? "border-red-300 focus:ring-red-200"
                      : usernameValid
                      ? "border-emerald-300 focus:ring-emerald-200"
                      : "border-slate-200 focus:ring-blue-200"
                  }`}
                />
                {usernameError && (
                  <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />
                )}
                {usernameValid && (
                  <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
                )}
              </div>
              <div className="h-5 mb-2">
                {usernameError && (
                  <p className="text-xs text-red-500">{usernameError}</p>
                )}
              </div>

              {/* password */}
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                รหัสผ่าน
              </label>
              <div className="relative mb-1">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  placeholder="กรอกรหัสผ่าน"
                  className={`w-full pl-11 pr-11 py-3.5 rounded-xl border bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                    passwordError
                      ? "border-red-300 focus:ring-red-200"
                      : passwordValid
                      ? "border-emerald-300 focus:ring-emerald-200"
                      : "border-slate-200 focus:ring-blue-200"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <div className="h-5 mb-1">
                {passwordError && (
                  <p className="text-xs text-red-500">{passwordError}</p>
                )}
              </div>

              {/* remember / forgot */}
              <div className="flex items-center justify-between mb-5 mt-2">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  จดจำฉัน
                </label>
                <a href="#" className="text-sm text-blue-600 hover:underline">
                  ลืมรหัสผ่าน?
                </a>
              </div>

              {/* submit-level feedback */}
              {submitError && (
                <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 animate-shake">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}
              {success && (
                <div className="mb-4 flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm rounded-xl px-4 py-3">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>เข้าสู่ระบบสำเร็จ! กำลังนำท่านเข้าสู่หน้าหลัก...</span>
                </div>
              )}

              {/* submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 transition-colors text-white font-semibold py-3.5 rounded-xl shadow-md shadow-blue-200"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    กำลังตรวจสอบ...
                  </>
                ) : (
                  <>
                    <ScanFace className="w-5 h-5" />
                    เข้าสู่ระบบ
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 my-5">
                <span className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400">หรือ</span>
                <span className="flex-1 h-px bg-slate-200" />
              </div>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 transition-colors text-slate-600 font-medium py-3.5 rounded-xl border border-slate-200"
              >
                <Info className="w-4 h-4 text-blue-500" />
                ติดต่อผู้ดูแลระบบ
              </button>

              <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-5">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                บัญชีผู้ใช้งานออกให้โดยผู้ดูแลระบบเท่านั้น
              </p>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="font-semibold text-slate-900 text-sm mb-0.5">{title}</div>
        <div className="text-xs text-slate-500 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}