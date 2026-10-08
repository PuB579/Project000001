import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ClipboardList,
  ChevronDown,
  Search,
  RotateCcw,
  FileSpreadsheet,
  FileText,
  UsersRound,
  Clock,
  XCircle,
  BarChart3,
  Trophy,
  CheckCircle2,
  User,
} from "lucide-react";
import {
  BarChart,
  Bar,
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
import TeacherLayout from "./TeacherLayout";
import LoadState from "../LoadState";
import { useAppearanceSettings } from "./useAppearanceSettings";
import { colorOf, useTeacherData } from "./useTeacherData";
import {
  addDays,
  countStatus,
  dailyTrend,
  downloadBlob,
  groupBy,
  isoDate,
  pct,
  printTable,
  termLabel,
  toExcel,
} from "../../lib/format";

const FINAL = new Set(["present", "late", "absent"]);
export default function TeacherAttendanceReport() {
  const { t } = useAppearanceSettings();
  const [searchParams] = useSearchParams();
  const [classId, setClassId] = useState(searchParams.get("class") || "");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(() => isoDate(addDays(new Date(), -29)));
  const [dateTo, setDateTo] = useState(() => isoDate());
  const [exportError, setExportError] = useState("");
  const { classes, records, loading, error, reload } = useTeacherData({ start: dateFrom, end: dateTo });

  const scoped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter(
      (r) =>
        FINAL.has(r.status) &&
        (!classId || r.class_id === Number(classId)) &&
        (!q || `${r.student_code} ${r.student_name}`.toLowerCase().includes(q))
    );
  }, [records, classId, search]);
  const counts = countStatus(scoped);
  const shownClasses = classes.filter((c) => !classId || c.id === Number(classId));
  const studentCount = shownClasses.reduce((sum, c) => sum + c.student_count, 0);

  const summaryStats = [
    { icon: <UsersRound className="w-6 h-6 text-blue-600 dark:text-blue-400" />, iconBg: "bg-blue-100 dark:bg-blue-950/40", label: t("report.stats.totalStudents"), value: studentCount.toLocaleString(), sub: t("common.units.people"), trend: `${shownClasses.length} ${t("live.classesUnit")}` },
    { icon: <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />, iconBg: "bg-emerald-100 dark:bg-emerald-950/40", label: t("report.stats.totalPresent"), value: counts.present.toLocaleString(), sub: t("common.units.times"), trend: `${pct(counts.present, counts.total).toFixed(1)}%`, trendColor: "text-emerald-600 dark:text-emerald-400" },
    { icon: <Clock className="w-6 h-6 text-amber-500 dark:text-amber-400" />, iconBg: "bg-amber-100 dark:bg-amber-950/40", label: t("report.stats.late"), value: counts.late.toLocaleString(), sub: t("common.units.times"), trend: `${pct(counts.late, counts.total).toFixed(1)}%`, trendColor: "text-amber-500 dark:text-amber-400" },
    { icon: <XCircle className="w-6 h-6 text-red-500 dark:text-red-400" />, iconBg: "bg-red-100 dark:bg-red-950/40", label: t("report.stats.absent"), value: counts.absent.toLocaleString(), sub: t("common.units.times"), trend: `${pct(counts.absent, counts.total).toFixed(1)}%`, trendColor: "text-red-500 dark:text-red-400" },
  ];

  const overallSummary = [
    { name: t("common.status.present"), value: counts.present, color: "#22c55e" },
    { name: t("common.status.late"), value: counts.late, color: "#f59e0b" },
    { name: t("common.status.absent"), value: counts.absent, color: "#ef4444" },
  ].map((s) => ({ ...s, pct: `${pct(s.value, counts.total).toFixed(1)}%` }));

  const byClass = groupBy(scoped, (r) => r.class_id);
  const courseSummaryTable = shownClasses.map((cls) => {
    const c = countStatus(byClass.get(cls.id) || []);
    const index = classes.indexOf(cls);
    return {
      id: cls.id,
      code: cls.course_code || "-",
      shortName: cls.class_code || cls.course_code,
      icon: colorOf(index).icon,
      name: cls.course_name,
      term: termLabel(cls),
      students: cls.student_count,
      present: c.present,
      late: c.late,
      absent: c.absent,
      rate: c.rate,
    };
  });
  const courseAttendance = courseSummaryTable;

  const trend = dailyTrend(scoped);
  const topAbsentees = [...groupBy(scoped.filter((r) => r.status === "absent"), (r) => r.student_id).values()]
    .map((rows) => ({ id: rows[0].student_code, name: rows[0].student_name, count: rows.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((s, i) => ({ ...s, rank: i + 1 }));
  const maxAbsentCount = Math.max(1, ...topAbsentees.map((s) => s.count));

  const reportHeaders = ["รหัสวิชา", "รายวิชา", "ภาคเรียน", "นักศึกษา", "เข้าเรียน", "มาสาย", "ขาดเรียน", "อัตราการเข้าเรียน (%)"];
  const reportRows = () =>
    courseSummaryTable.map((c) => [c.code, c.name, c.term, c.students, c.present, c.late, c.absent, c.rate.toFixed(1)]);
  const reportTitle = `รายงานการเข้าเรียน ${dateFrom} ถึง ${dateTo}`;
  const exportExcel = () => downloadBlob(`รายงานการเข้าเรียน_${dateFrom}_${dateTo}.xls`, toExcel(reportTitle, reportHeaders, reportRows()));
  const exportPdf = () => {
    try {
      setExportError("");
      printTable(reportTitle, reportHeaders, reportRows());
    } catch (err) {
      setExportError(err.message);
    }
  };
  const resetFilters = () => {
    setClassId("");
    setSearch("");
    setDateFrom(isoDate(addDays(new Date(), -29)));
    setDateTo(isoDate());
  };
  const dateInputCls =
    "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-sm text-slate-600 dark:text-slate-300";
  return (
    <TeacherLayout
      titleIcon={ClipboardList}
      titleKey="nav.report"
      subtitleKey="report.subtitle"
      headerExtra={
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <input type="date" value={dateFrom} max={dateTo} onChange={(e) => e.target.value && setDateFrom(e.target.value)} className={dateInputCls} />
          <span className="text-slate-400">-</span>
          <input type="date" value={dateTo} min={dateFrom} onChange={(e) => e.target.value && setDateTo(e.target.value)} className={dateInputCls} />
        </div>
      }
    >
      <LoadState loading={loading} error={error || exportError} onRetry={reload} />
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {summaryStats.map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${s.iconBg}`}>{s.icon}</div>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{s.label}</div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-tight">{s.value}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{s.sub}</span>
              </div>
              <div className={`text-xs mt-0.5 truncate ${s.trendColor || "text-slate-400 dark:text-slate-500"}`}>{s.trend}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("report.searchPlaceholder")}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
          />
        </div>

        <FilterSelect label={t("report.filters.course")} value={classId} onChange={setClassId}>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.course_code} {c.course_name}
            </option>
          ))}
        </FilterSelect>
        <button onClick={resetFilters} className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors px-3 py-2.5">
          <RotateCcw className="w-4 h-4" />
          {t("common.actions.reset")}
        </button>

        <button onClick={exportExcel} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 transition-colors text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm shadow-emerald-100 dark:shadow-emerald-950">
          <FileSpreadsheet className="w-4 h-4" />
          {t("common.actions.exportExcel")}
        </button>
        <button onClick={exportPdf} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 transition-colors text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm shadow-red-100 dark:shadow-red-950">
          <FileText className="w-4 h-4" />
          {t("common.actions.exportPdf")}
        </button>
      </div>

      {/* Course bar chart + overall donut */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100">{t("report.courseChartTitle")}</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseAttendance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="shortName" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                  labelFormatter={(label) => {
                    const c = courseAttendance.find((x) => x.shortName === label);
                    return c ? `${c.code} — ${c.name}` : label;
                  }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 12, color: "#64748b" }} />
                <Bar dataKey="present" name={t("common.status.present")} fill="#22c55e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="late" name={t("common.status.late")} fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="absent" name={t("common.status.absent")} fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100">{t("report.overallChartTitle")}</h3>
          </div>
          <div className="relative h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={overallSummary} dataKey="value" innerRadius={54} outerRadius={76} paddingAngle={3} stroke="none">
                  {overallSummary.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{counts.total.toLocaleString()}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500">{t("common.units.times")}</div>
            </div>
          </div>
          <div className="space-y-2.5 mt-4">
            {overallSummary.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-slate-600 dark:text-slate-300">{s.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 dark:text-slate-500">{s.pct}</span>
                  <span className="text-slate-800 dark:text-slate-100 font-medium w-14 text-right">{s.value.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Course summary table + daily trend chart */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100">{t("report.courseSummaryTitle")}</h3>
            </div>

          </div>
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <th className="py-2 pr-3 font-medium">{t("report.table.code")}</th>
                <th className="py-2 pr-3 font-medium">{t("report.table.courseName")}</th>
                <th className="py-2 pr-3 font-medium">{t("report.table.term")}</th>
                <th className="py-2 pr-3 font-medium text-center">{t("report.table.students")}</th>
                <th className="py-2 pr-3 font-medium text-center">{t("report.table.present")}</th>
                <th className="py-2 pr-3 font-medium text-center">{t("report.table.late")}</th>
                <th className="py-2 pr-3 font-medium text-center">{t("report.table.absent")}</th>
                <th className="py-2 pr-3 font-medium">{t("report.table.rate")}</th>
              </tr>
            </thead>
            <tbody>
              {courseSummaryTable.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 dark:border-slate-800/60 last:border-0">
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-[11px] ${c.icon}`}>
                      {c.code.split("-").pop()}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-slate-800 dark:text-slate-100 font-medium whitespace-nowrap">{c.name}</td>
                  <td className="py-3 pr-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{c.term}</td>
                  <td className="py-3 pr-3 text-slate-600 dark:text-slate-300 text-center">{c.students}</td>
                  <td className="py-3 pr-3 text-emerald-600 dark:text-emerald-400 font-medium text-center">{c.present}</td>
                  <td className="py-3 pr-3 text-amber-500 dark:text-amber-400 font-medium text-center">{c.late}</td>
                  <td className="py-3 pr-3 text-red-500 dark:text-red-400 font-medium text-center">{c.absent}</td>
                  <td className="py-3 pr-3 min-w-[130px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${c.rate >= 85 ? "bg-emerald-500" : c.rate >= 70 ? "bg-blue-500" : "bg-amber-500"}`}
                          style={{ width: `${c.rate}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 w-11 text-right">{c.rate.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">{t("report.dailyChartTitle")}</h3>

          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 12, color: "#64748b" }} />
                <Line type="monotone" dataKey="present" name={t("common.status.present")} stroke="#22c55e" strokeWidth={3} dot={{ r: 3, fill: "#22c55e" }} />
                <Line type="monotone" dataKey="late" name={t("common.status.late")} stroke="#f59e0b" strokeWidth={3} dot={{ r: 3, fill: "#f59e0b" }} />
                <Line type="monotone" dataKey="absent" name={t("common.status.absent")} stroke="#ef4444" strokeWidth={3} dot={{ r: 3, fill: "#ef4444" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top absentees */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{t("report.topAbsenteesTitle")}</h4>
              </div>

            </div>
            <div className="space-y-3">
              {topAbsentees.length === 0 && (
                <div className="text-sm text-slate-400 dark:text-slate-500">{t("live.noAbsentees")}</div>
              )}
              {topAbsentees.map((s) => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-4 text-center shrink-0">{s.rank}</span>
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{s.name}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">{s.id}</div>
                  </div>
                  <div className="w-24 shrink-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500 dark:text-slate-400">
                        {s.count} {t("common.units.times")}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-red-400" style={{ width: `${(s.count / maxAbsentCount) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}

function FilterSelect({ label, value, onChange, children }) {
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl pl-4 pr-9 py-2.5 text-sm text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <option value="">{label}</option>
        {children}
      </select>
      <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}