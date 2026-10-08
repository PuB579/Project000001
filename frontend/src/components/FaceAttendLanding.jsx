import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import logoImg from "../assets/logo-cs.png";
import bgHero from "../assets/bg-hero.jpg";
import {
  ScanFace,
  User,
  Clock,
  ShieldCheck,
  BarChart3,
  Check,
  Menu,
  X,
  UserPlus,
  Smartphone,
  ClipboardCheck,
  Mail,
  Phone,
  MapPin,
  Wrench,
  Award,
  Download,
  Bell,
} from "lucide-react";

const NAV_LINKS = [
  { label: "หน้าแรก", id: "hero" },
  { label: "เกี่ยวกับระบบ", id: "about" },
  { label: "คุณสมบัติ", id: "features" },
  { label: "วิธีการใช้งาน", id: "how-it-works" },
  { label: "ติดต่อเรา", id: "contact" },
];

export default function FaceAttendLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState("hero");

  function scrollToSection(id) {
    setMenuOpen(false);
    setActiveId(id);
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Scroll-spy: highlight the nav item for whichever section is centered
  // in the viewport as the person scrolls, not just on click.
  useEffect(() => {
    const sectionIds = NAV_LINKS.map((l) => l.id);
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen w-full bg-white font-sans overflow-x-hidden">
      <style>{`
        @keyframes floatPhone {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-14px) rotate(0.6deg); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.08); }
        }
        @keyframes ringPulse {
          0% { transform: scale(0.92); opacity: 0.9; }
          70% { transform: scale(1.18); opacity: 0; }
          100% { transform: scale(1.18); opacity: 0; }
        }
        @keyframes scanSweep {
          0% { top: 6%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 92%; opacity: 0; }
        }
        @keyframes badgeBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-6px) scale(1.05); }
        }
        @keyframes shimmerSweep {
          0% { transform: translateX(-120%) rotate(8deg); }
          100% { transform: translateX(220%) rotate(8deg); }
        }
        @keyframes dashRotate {
          to { stroke-dashoffset: -400; }
        }
        .animate-float { animation: floatPhone 6s ease-in-out infinite; }
        .animate-glow { animation: glowPulse 3.5s ease-in-out infinite; }
        .animate-ring { animation: ringPulse 2.4s ease-out infinite; }
        .animate-scan { animation: scanSweep 3.2s ease-in-out infinite; }
        .animate-badge { animation: badgeBounce 2.8s ease-in-out infinite; }
        .animate-shimmer { animation: shimmerSweep 3.5s ease-in-out infinite; }
        .animate-dash { animation: dashRotate 14s linear infinite; }
      `}</style>

      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src={logoImg}
              alt="Computer Science, Maejo University"
              className="h-12 md:h-14 w-auto object-contain shrink-0"
            />
            <div className="leading-tight hidden sm:block">
              <div className="text-lg font-bold text-slate-900">
                CS FaceAttend
              </div>
              <div className="text-[11px] text-slate-400 -mt-0.5">
                Computer Science AI Face Attendance System
              </div>
            </div>
          </div>

          {/* Nav (desktop) */}
          <nav className="hidden md:flex items-center gap-7 lg:gap-9 text-[15px] text-slate-600 font-medium">
            {NAV_LINKS.map((link) => {
              const isActive = link.id === activeId;
              return (
                <a
                  key={link.label}
                  href={`#${link.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(link.id);
                  }}
                  className={`relative transition-colors ${
                    isActive ? "text-blue-600" : "hover:text-blue-600"
                  }`}
                >
                  {link.label}
                  <span
                    className={`absolute -bottom-6 left-0 right-0 h-0.5 bg-blue-600 rounded-full transition-all duration-300 ${
                      isActive
                        ? "opacity-100 scale-x-100"
                        : "opacity-0 scale-x-0"
                    }`}
                  />
                </a>
              );
            })}
          </nav>

          {/* CTA (desktop) */}
          <Link
            to="/login"
            className="hidden md:flex group relative items-center gap-2 overflow-hidden bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-blue-200"
          >
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12" />
            <User className="w-4 h-4" />
            เข้าสู่ระบบ
          </Link>

          {/* Hamburger (mobile) */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="เปิดเมนู"
          >
            {menuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile menu panel */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-6 py-4 flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={`#${link.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(link.id);
                }}
                className={`text-[15px] font-medium ${
                  link.id === activeId ? "text-blue-600" : "text-slate-600"
                }`}
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-md shadow-blue-200"
            >
              <User className="w-4 h-4" />
              เข้าสู่ระบบ
            </Link>
          </div>
        )}
      </header>

      {/* ---------- Hero ---------- */}
      <section
        id="hero"
        className="relative overflow-hidden bg-gradient-to-b from-blue-50 via-blue-50 to-white"
      >
        {/* background artwork */}
        <img
          src={bgHero}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-90"
        />

        <div className="relative max-w-7xl mx-auto px-6 md:px-10 pt-16 pb-24 md:pt-20 md:pb-32 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left column */}
          <div>
            <span className="inline-block bg-blue-100 text-blue-600 text-xs font-semibold px-4 py-2 rounded-full mb-6">
              ระบบเช็คชื่ออัจฉริยะ
            </span>

            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-slate-900 mb-6">
              เช็คชื่อด้วยใบหน้า
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-sky-400 bg-clip-text text-transparent">
                สะดวก รวดเร็ว แม่นยำ
              </span>
            </h1>

            <p className="text-slate-500 text-base md:text-lg leading-relaxed mb-9 max-w-md">
              ระบบเช็คชื่อด้วยการยืนยันใบหน้าผ่านโทรศัพท์มือถือ ปลอดภัย
              เชื่อถือได้ ลดเวลาในการเช็คชื่อ
            </p>
          </div>

          {/* Right column: phone mockup */}
          <div className="relative flex justify-center lg:justify-end">
            {/* glow behind phone */}
            <div className="absolute w-72 h-72 md:w-80 md:h-80 rounded-full bg-blue-400/30 blur-3xl animate-glow" />

            {/* shield badge */}
            <div className="absolute -top-4 right-4 md:right-10 z-20 animate-badge">
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-300">
                <span className="absolute inset-0 rounded-full bg-blue-400 animate-ring" />
                <ShieldCheck
                  className="relative w-8 h-8 text-white"
                  strokeWidth={2}
                />
              </div>
            </div>

            {/* phone frame - iPhone style, extra rounded */}
            <div className="relative z-10 animate-float">
              <div className="relative w-[260px] md:w-[300px] rounded-[3.6rem] bg-gradient-to-br from-blue-100 via-blue-50 to-blue-200 p-[8px] shadow-2xl shadow-blue-300/50">
                {/* glossy highlight sweep */}
                <div className="absolute inset-0 rounded-[3.6rem] overflow-hidden pointer-events-none">
                  <div className="absolute -inset-y-10 -left-1/3 w-1/3 bg-gradient-to-r from-white/0 via-white/40 to-white/0 animate-shimmer" />
                </div>

                {/* side buttons */}
                <span className="absolute -left-[3px] top-24 w-[3px] h-8 bg-blue-300 rounded-r-sm" />
                <span className="absolute -left-[3px] top-36 w-[3px] h-12 bg-blue-300 rounded-r-sm" />
                <span className="absolute -left-[3px] top-52 w-[3px] h-12 bg-blue-300 rounded-r-sm" />
                <span className="absolute -right-[3px] top-32 w-[3px] h-16 bg-blue-300 rounded-l-sm" />

                {/* black bezel */}
                <div className="relative rounded-[3.2rem] bg-black p-[3px]">
                  <div className="relative rounded-[2.9rem] overflow-hidden bg-white">
                    {/* status bar */}
                    <div className="relative flex items-center justify-between px-6 pt-3.5 pb-1 text-[11px] font-semibold text-slate-800">
                      <span>9:41</span>
                      {/* Dynamic Island */}
                      <span className="absolute left-1/2 -translate-x-1/2 top-2 w-24 h-7 bg-black rounded-full" />
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-2 border border-slate-800 rounded-sm" />
                      </span>
                    </div>

                    {/* screen title */}
                    <div className="text-center text-[13px] font-medium text-slate-700 pt-2 pb-3">
                      สแกนใบหน้าเพื่อเช็คชื่อ
                    </div>

                    {/* face photo with scan ring + sweep */}
                    <div className="relative mx-5 mb-4 aspect-square rounded-2xl overflow-hidden bg-slate-100">
                      <img
                        src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop&crop=faces"
                        alt="ตัวอย่างรูปนักศึกษา (รูปชั่วคราว)"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-3 rounded-full border-2 border-blue-400/80" />
                      {/* scanning laser line */}
                      <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_8px_2px_rgba(96,165,250,0.8)] animate-scan" />
                      {/* facial landmark dots (decorative) */}
                      <svg
                        className="absolute inset-0 w-full h-full"
                        viewBox="0 0 200 200"
                      >
                        {[
                          [70, 80],
                          [130, 80],
                          [100, 110],
                          [80, 140],
                          [120, 140],
                          [60, 60],
                          [140, 60],
                          [100, 60],
                        ].map(([cx, cy], i) => (
                          <circle
                            key={i}
                            cx={cx}
                            cy={cy}
                            r="1.6"
                            fill="#60a5fa"
                          />
                        ))}
                      </svg>
                    </div>

                    {/* result banner */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-500 mx-0 px-5 py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                        <Check className="w-5 h-5 text-white" strokeWidth={3} />
                      </div>
                      <div className="text-white">
                        <div className="text-sm font-semibold leading-tight">
                          เช็คชื่อสำเร็จ
                        </div>
                        <div className="text-lg font-bold leading-tight">
                          08:55:23
                        </div>
                        <div className="text-[11px] text-blue-100 leading-tight">
                          10 สิงหาคม 2566
                        </div>
                      </div>
                    </div>

                    {/* home indicator */}
                    <div className="flex justify-center py-2">
                      <span className="w-24 h-1 rounded-full bg-slate-200" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- About ---------- */}
      <section
        id="about"
        className="relative bg-white pt-16 md:pt-20 pb-24 md:pb-28 px-6 md:px-10"
      >
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          <Reveal>
            <span className="inline-block bg-blue-100 text-blue-600 text-xs font-semibold px-4 py-2 rounded-full mb-5">
              เกี่ยวกับระบบ
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-5 leading-tight">
              ระบบเช็คชื่อสำหรับภาควิชา
              <br />
              วิทยาการคอมพิวเตอร์
            </h2>
            <p className="text-slate-500 leading-relaxed mb-6 max-w-lg">
              CS FaceAttend
              พัฒนาขึ้นเพื่อทดแทนการเซ็นชื่อด้วยกระดาษและบัตรคล้องคอ
              ด้วยการยืนยันตัวตนผ่านใบหน้าบนโทรศัพท์มือถือของนักศึกษาเอง
              ช่วยลดปัญหาการฝากเพื่อนเช็คชื่อ ประหยัดเวลาต้นชั่วโมงเรียน
              และให้อาจารย์เห็นข้อมูลการเข้าเรียนแบบเรียลไทม์
            </p>
            <ul className="space-y-3">
              {[
                "ยืนยันตัวตนด้วย AI จดจำใบหน้า ป้องกันการเช็คชื่อแทนกัน",
                "เชื่อมข้อมูลการเข้าเรียนเข้ากับรายงานและคะแนนเก็บอัตโนมัติ",
                "ข้อมูลใบหน้าและประวัติการเช็คชื่อถูกเข้ารหัสตลอดการใช้งาน",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-slate-600"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={150} className="grid grid-cols-2 gap-5">
            <StatBlock
              value="5"
              label="รายวิชาที่รองรับ"
              color="text-blue-600"
              bg="bg-blue-50"
            />
            <StatBlock
              value="140+"
              label="นักศึกษาที่ใช้งาน"
              color="text-emerald-600"
              bg="bg-emerald-50"
            />
            <StatBlock
              value="99%"
              label="ความแม่นยำในการจดจำ"
              color="text-purple-600"
              bg="bg-purple-50"
            />
            <StatBlock
              value="<3 วิ"
              label="เวลาเช็คชื่อเฉลี่ย"
              color="text-amber-600"
              bg="bg-amber-50"
            />
          </Reveal>
        </div>
      </section>

      {/* ---------- Feature strip ---------- */}
      <section
        id="features"
        className="relative z-20 px-6 md:px-10 py-16 md:py-24 overflow-hidden"
      >
        {/* decorative glow blobs behind the glass cards */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-0 left-[10%] w-80 h-80 rounded-full bg-blue-300/25 blur-3xl" />
          <div className="absolute bottom-0 right-[10%] w-80 h-80 rounded-full bg-purple-300/20 blur-3xl" />
          <div className="absolute top-1/3 right-1/3 w-64 h-64 rounded-full bg-sky-200/25 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center max-w-xl mx-auto mb-14">
            <span className="inline-block bg-blue-100 text-blue-600 text-xs font-semibold px-4 py-2 rounded-full mb-5">
              คุณสมบัติ
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
              ครบทุกฟังก์ชันที่ห้องเรียนต้องการ
            </h2>
            <p className="text-slate-500 leading-relaxed">
              ตั้งแต่การเช็คชื่อด้วยใบหน้าไปจนถึงการคำนวณคะแนนและออกรายงาน
              ระบบเดียวจบ
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: ScanFace,
                title: "ยืนยันตัวตนด้วยใบหน้า",
                desc: "ใช้เทคโนโลยี AI ในการจดจำใบหน้าเพื่อความปลอดภัยและแม่นยำ",
              },
              {
                icon: Clock,
                title: "ประหยัดเวลา",
                desc: "เช็คชื่อได้รวดเร็ว ลดเวลาต้นชั่วโมงเรียน",
              },
              {
                icon: ShieldCheck,
                title: "ปลอดภัย เชื่อถือได้",
                desc: "ข้อมูลถูกเข้ารหัสปลอดภัยตามมาตรฐาน",
              },
              {
                icon: BarChart3,
                title: "รายงานและสถิติ",
                desc: "ดูรายงานการเข้าเรียนและสถิติแบบเรียลไทม์",
              },
              {
                icon: Wrench,
                title: "จัดการรายวิชาได้อิสระ",
                desc: "ตั้งเวลาเปิด-ปิดรับเช็คชื่อและเกณฑ์มาสายแยกตามแต่ละรายวิชา",
              },
              {
                icon: Award,
                title: "คำนวณคะแนนอัตโนมัติ",
                desc: "คิดคะแนนเข้าเรียนตามเงื่อนไขที่อาจารย์กำหนดเอง ไม่ต้องนับมือ",
              },
              {
                icon: Download,
                title: "ส่งออกข้อมูลได้หลายรูปแบบ",
                desc: "ดาวน์โหลดข้อมูลการเข้าเรียนเป็น Excel, PDF หรือ CSV ได้ทันที",
              },
              {
                icon: Bell,
                title: "แจ้งเตือนอัตโนมัติ",
                desc: "แจ้งเตือนเมื่อขาดเรียนติดต่อกันหรือมีประกาศสำคัญจากอาจารย์",
              },
            ].map((f, i) => (
              <Reveal key={f.title} delay={(i % 4) * 100} className="h-full">
                <Feature
                  icon={<f.icon className="w-7 h-7 text-blue-600" />}
                  title={f.title}
                  desc={f.desc}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section
        id="how-it-works"
        className="relative bg-slate-50 mt-16 md:mt-20 py-16 md:py-20 px-6 md:px-10"
      >
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center max-w-xl mx-auto mb-14">
            <span className="inline-block bg-blue-100 text-blue-600 text-xs font-semibold px-4 py-2 rounded-full mb-5">
              วิธีการใช้งาน
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
              เริ่มใช้งานได้ใน 4 ขั้นตอน
            </h2>
            <p className="text-slate-500 leading-relaxed">
              ไม่ต้องติดตั้งอุปกรณ์เพิ่มเติม
              ใช้โทรศัพท์มือถือเครื่องเดียวก็เช็คชื่อได้
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Reveal delay={0}>
              <Step
                number="1"
                icon={<UserPlus className="w-6 h-6 text-blue-600" />}
                title="ลงทะเบียนใบหน้า"
                desc="นักศึกษาถ่ายภาพใบหน้าเพื่อลงทะเบียนกับระบบเพียงครั้งเดียว"
              />
            </Reveal>
            <Reveal delay={100}>
              <Step
                number="2"
                icon={<Smartphone className="w-6 h-6 text-blue-600" />}
                title="เปิดแอปในห้องเรียน"
                desc="เปิดระบบผ่านมือถือเมื่อถึงเวลาที่อาจารย์เปิดให้เช็คชื่อ"
              />
            </Reveal>
            <Reveal delay={200}>
              <Step
                number="3"
                icon={<ScanFace className="w-6 h-6 text-blue-600" />}
                title="สแกนใบหน้า"
                desc="ยืนยันตัวตนด้วยการสแกนใบหน้าผ่านกล้องมือถือ"
              />
            </Reveal>
            <Reveal delay={300}>
              <Step
                number="4"
                icon={<ClipboardCheck className="w-6 h-6 text-blue-600" />}
                title="บันทึกผลอัตโนมัติ"
                desc="ระบบบันทึกเวลาและสถานะการเข้าเรียนให้ทันที"
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Contact ---------- */}
      <section id="contact" className="relative py-16 md:py-20 px-6 md:px-10">
        <Reveal className="max-w-5xl mx-auto bg-white rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-100 px-8 md:px-14 py-12 grid md:grid-cols-[1.2fr_1fr] gap-10 items-center">
          <div>
            <span className="inline-block bg-blue-100 text-blue-600 text-xs font-semibold px-4 py-2 rounded-full mb-5">
              ติดต่อเรา
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              สอบถามการใช้งานระบบ
            </h2>
            <p className="text-slate-500 leading-relaxed mb-7 max-w-md">
              ภาควิชาวิทยาการคอมพิวเตอร์ คณะวิทยาศาสตร์ มหาวิทยาลัยแม่โจ้
              ยินดีให้คำแนะนำเรื่องบัญชีผู้ใช้และการใช้งานระบบเช็คชื่อ
            </p>
            <div className="space-y-4">
              <ContactRow
                icon={<Mail className="w-4 h-4" />}
                text="cs.faceattend@mju.ac.th"
              />
              <ContactRow
                icon={<Phone className="w-4 h-4" />}
                text="053-873-000 ต่อ 1234"
              />
              <ContactRow
                icon={<MapPin className="w-4 h-4" />}
                text="ภาควิชาวิทยาการคอมพิวเตอร์ มหาวิทยาลัยแม่โจ้ จ.เชียงใหม่"
              />
            </div>
          </div>

          <a
            href="mailto:cs.faceattend@mju.ac.th"
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white font-semibold px-6 py-4 rounded-xl shadow-md shadow-blue-200"
          >
            <Mail className="w-5 h-5" />
            ส่งอีเมลถึงผู้ดูแลระบบ
          </a>
        </Reveal>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="pb-10 pt-4 text-center text-sm text-slate-400">
        © 2026 Computer Science AI Face Attendance System. All rights reserved.
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className="group relative h-full overflow-hidden rounded-2xl border border-white/70 bg-white/70 backdrop-blur-md shadow-lg shadow-blue-100/40 p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-blue-200/50 hover:border-blue-200">
      {/* glow blob that blooms on hover */}
      <div className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full bg-blue-400/0 group-hover:bg-blue-400/25 blur-2xl transition-all duration-500" />

      <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-5 ring-1 ring-blue-100 group-hover:ring-blue-300 group-hover:scale-110 transition-all duration-300">
        {icon}
      </div>
      <div className="relative font-bold text-slate-900 mb-1.5">{title}</div>
      <div className="relative text-sm text-slate-500 leading-relaxed">
        {desc}
      </div>
    </div>
  );
}

function StatBlock({ value, label, color, bg }) {
  return (
    <div className={`rounded-2xl p-6 ${bg}`}>
      <div className={`text-2xl md:text-3xl font-extrabold ${color}`}>
        {value}
      </div>
      <div className="text-xs text-slate-500 mt-1 leading-relaxed">{label}</div>
    </div>
  );
}

function Step({ number, icon, title, desc }) {
  return (
    <div className="relative bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <span className="text-3xl font-extrabold text-slate-100">{number}</span>
      </div>
      <div className="font-bold text-slate-900 mb-1.5">{title}</div>
      <div className="text-sm text-slate-500 leading-relaxed">{desc}</div>
    </div>
  );
}

function ContactRow({ icon, text }) {
  return (
    <div className="flex items-center gap-3 text-slate-600 text-sm">
      <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
        {icon}
      </span>
      {text}
    </div>
  );
}

// Fades an element up into place the first time it scrolls into view.
function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out will-change-transform ${
        visible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-10 scale-95"
      } ${className}`}
    >
      {children}
    </div>
  );
}
