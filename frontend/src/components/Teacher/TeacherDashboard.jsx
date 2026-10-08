import {
  BookOpen,
  Users,
  CheckCircle2,
  Loader2,
  Circle,
  UserCheck,
  UserX,
  CalendarCheck,
  CalendarDays,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Link } from "react-router-dom";
import TeacherLayout from "./TeacherLayout";
import LoadState from "../LoadState";
import { useAppearanceSettings } from "./useAppearanceSettings";
import { colorOf, useTeacherData } from "./useTeacherData";
import { getUser } from "../../lib/api";
import { addDays, countStatus, dailyTrend, groupBy, hhmm, isoDate, pct, thaiDate } from "../../lib/format";

export default function TeacherDashboard() {
  const { t } = useAppearanceSettings();
  const user = getUser();
  const today = isoDate();
  const { classes, records, loading, error, reload } = useTeacherData({
    start: isoDate(addDays(new Date(), -6)),
    end: today,
  });

  const todayRows = records.filter((r) => r.session_date === today);
  const todayCount = countStatus(todayRows);
  const todayPending = todayRows.filter((r) => r.status === "open" || r.status === "upcoming").length;
  const totalStudents = classes.reduce((sum, c) => sum + c.student_count, 0);

  // "เข้าเรียน" ในกราฟ = ตรงเวลา + สาย
  const attendanceTrend = dailyTrend(records).map((d) => ({ ...d, present: d.present + d.late }));

  const totalToday = todayRows.length;
  const todaySummary = [
    { name: t("common.status.present"), value: todayCount.present, color: "#22c55e" },
    { name: t("common.status.late"), value: todayCount.late, color: "#f59e0b" },
    { name: t("common.status.absent"), value: todayCount.absent, color: "#ef4444" },
    { name: t("live.waiting"), value: todayPending, color: "#94a3b8" },
  ].map((s) => ({ ...s, pct: `${pct(s.value, totalToday).toFixed(2)}%` }));

  // คาบเรียนวันนี้ (แถวละหนึ่งคาบ)
  const todaySessions = [...groupBy(todayRows, (r) => r.session_id).values()]
    .map((rows) => {
      const first = rows[0];
      const c = countStatus(rows);
      const open = rows.some((r) => r.status === "open");
      const upcoming = rows.every((r) => r.status === "upcoming");
      return {
        id: first.session_id,
        time: hhmm(first.start_time),
        subject: `${first.course_code} ${first.course_name}`,
        room: first.class_code || "-",
        attend: upcoming ? "-" : `${c.present + c.late}/${rows.length}`,
        status: upcoming ? "notstarted" : open ? "progress" : "done",
      };
    })
    .sort((a, b) => (a.time < b.time ? -1 : 1));

  const recordsByClass = groupBy(records, (r) => r.class_id);
  const myCourses = classes.map((cls) => {
    const rows = recordsByClass.get(cls.id) || [];
    const todayOfClass = rows.filter((r) => r.session_date === today);
    let status = t("common.status.notStarted");
    let statusColor = "text-slate-400 dark:text-slate-500";
    if (todayOfClass.some((r) => r.status === "open")) {
      status = t("common.status.inProgress");
      statusColor = "text-blue-600 dark:text-blue-400";
    } else if (todayOfClass.length) {
      status = `${t("live.checkedAt")} ${hhmm(todayOfClass[0].start_time)}`;
      statusColor = "text-emerald-600 dark:text-emerald-400";
    }
    return {
      id: cls.id,
      code: cls.course_code || "",
      name: cls.course_name,
      students: `${t("live.studentsPrefix")} ${cls.student_count} ${t("common.units.people")}`,
      status,
      statusColor,
      pct: Math.round(countStatus(rows).rate),
    };
  });

  return (
    <TeacherLayout
      titleContent={
        <>
          {t("dashboard.greeting")}, {user?.full_name} <span className="inline-block">👋</span>
        </>
      }
      subtitleKey="dashboard.subtitle"
      headerExtra={
        <button className="hidden sm:flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0">
          <CalendarDays className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          {thaiDate(today, { day: "numeric", month: "long", year: "numeric" })}
        </button>
      }
    >
      <LoadState loading={loading} error={error} onRetry={reload} />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <StatCard
          icon={<BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
          iconBg="bg-blue-100 dark:bg-blue-950/40"
          label={t("dashboard.stats.totalCourses")}
          value={classes.length}
          sub={t("dashboard.stats.totalCoursesSub")}
        />
        <StatCard
          icon={<Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
          iconBg="bg-emerald-100 dark:bg-emerald-950/40"
          label={t("dashboard.stats.totalStudents")}
          value={totalStudents}
          sub={t("dashboard.stats.totalStudentsSub")}
        />
        <StatCard
          icon={<CalendarCheck className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
          iconBg="bg-purple-100 dark:bg-purple-950/40"
          label={t("dashboard.stats.checkinToday")}
          value={todaySessions.length}
          sub={t("dashboard.stats.checkinTodaySub")}
        />
        <StatCard
          icon={<UserCheck className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
          iconBg="bg-amber-100 dark:bg-amber-950/40"
          label={t("dashboard.stats.present")}
          value={todayCount.present + todayCount.late}
          sub={`${pct(todayCount.present + todayCount.late, totalToday).toFixed(2)}%`}
          subColor="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          icon={<UserX className="w-6 h-6 text-red-600 dark:text-red-400" />}
          iconBg="bg-red-100 dark:bg-red-950/40"
          label={t("dashboard.stats.absent")}
          value={todayCount.absent}
          sub={`${pct(todayCount.absent, totalToday).toFixed(2)}%`}
          subColor="text-red-500 dark:text-red-400"
        />
      </div>

      {/* Trend chart + today summary */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">{t("dashboard.trendTitle")}</h3>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
              {t("dashboard.last7Days")}
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="presentFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="absentFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12, color: "#64748b" }} />
                <Line type="monotone" dataKey="present" name={t("common.status.present")} stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: "#2563eb" }} fill="url(#presentFill)" />
                <Line type="monotone" dataKey="absent" name={t("common.status.absent")} stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: "#ef4444" }} fill="url(#absentFill)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">{t("dashboard.todaySummaryTitle")}</h3>
          <div className="relative h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={todaySummary} dataKey="value" innerRadius={48} outerRadius={68} paddingAngle={3} stroke="none">
                  {todaySummary.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalToday}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500">{t("dashboard.totalStudentsLabel")}</div>
            </div>
          </div>
          <div className="space-y-2.5 mt-4">
            {todaySummary.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-slate-600 dark:text-slate-300">{s.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-800 dark:text-slate-100 font-medium">
                    {s.value} {t("common.units.people")}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 w-14 text-right">{s.pct}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-xl px-4 py-3 mt-4">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t("dashboard.attendanceRateToday")}
            </span>
            <span className="font-bold">{todayCount.rate.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {/* Recent check-ins table + courses */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">{t("dashboard.recentCheckins")}</h3>
            <Link to="/teacher-history" className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
              {t("common.actions.viewAll")}
            </Link>
          </div>
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="text-left text-xs text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <th className="py-2 pr-3 font-medium">{t("dashboard.table.time")}</th>
                <th className="py-2 pr-3 font-medium">{t("dashboard.table.subject")}</th>
                <th className="py-2 pr-3 font-medium">{t("dashboard.table.room")}</th>
                <th className="py-2 pr-3 font-medium">{t("dashboard.table.attend")}</th>
                <th className="py-2 pr-3 font-medium">{t("dashboard.table.status")}</th>
              </tr>
            </thead>
            <tbody>
              {todaySessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                    {t("live.noSessionToday")}
                  </td>
                </tr>
              )}
              {todaySessions.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                  <td className="py-3 pr-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{r.time}</td>
                  <td className="py-3 pr-3 text-slate-800 dark:text-slate-100 font-medium whitespace-nowrap">{r.subject}</td>
                  <td className="py-3 pr-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{r.room}</td>
                  <td className="py-3 pr-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{r.attend}</td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    {r.status === "done" && (
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t("common.status.done")}
                      </span>
                    )}
                    {r.status === "progress" && (
                      <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {t("common.status.inProgress")}
                      </span>
                    )}
                    {r.status === "notstarted" && (
                      <span className="inline-flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                        <Circle className="w-3.5 h-3.5" />
                        {t("common.status.notStarted")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">{t("dashboard.myCourses")}</h3>
            <Link to="/teacher-courses" className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
              {t("common.actions.viewAll")}
            </Link>
          </div>
          <div className="space-y-4">
            {myCourses.length === 0 && !loading && (
              <div className="text-sm text-slate-400 dark:text-slate-500">{t("live.noCourses")}</div>
            )}
            {myCourses.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${colorOf(i).icon}`}>
                  {c.code.split("-").pop()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{c.name}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 truncate">{c.students}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-xs font-medium ${c.statusColor}`}>{c.status}</div>
                </div>
                <RingBadge percent={c.pct} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}

function StatCard({ icon, iconBg, label, value, sub, subColor }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{label}</div>
        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight mt-0.5">{value}</div>
        <div className={`text-xs mt-0.5 truncate ${subColor || "text-slate-400 dark:text-slate-500"}`}>{sub}</div>
      </div>
    </div>
  );
}

function RingBadge({ percent }) {
  const radius = 16;
  const stroke = 3;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;
  const color =
    percent === 0 ? "#cbd5e1" : percent >= 85 ? "#22c55e" : percent >= 70 ? "#3b82f6" : "#f59e0b";

  return (
    <div className="relative w-9 h-9 shrink-0">
      <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
        <circle stroke="#e2e8f0" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset: offset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-700 dark:text-slate-300">
        {percent}%
      </span>
    </div>
  );
}