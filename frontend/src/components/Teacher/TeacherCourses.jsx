import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  CalendarDays,
  UsersRound,
  CalendarCheck,
  BarChart3,
  UserX,
  Search,
  Plus,
  LayoutGrid,
  List,
  Database,
  Layers,
  Brain,
  Cpu,
  Wrench,
  ScanFace,
  Clock,
  BookOpen,
} from "lucide-react";
import TeacherLayout from "./TeacherLayout";
import LoadState from "../LoadState";
import { useAppearanceSettings } from "./useAppearanceSettings";
import { colorOf, useTeacherData } from "./useTeacherData";
import { CreateCourseModal, ManageCourseModal, SessionModal } from "./CourseModals";
import { classPhase, countStatus, groupBy, isoDate, pct, termLabel, thaiDate, timeRange } from "../../lib/format";

const filterTabs = [
  { key: "all", labelKey: "courses.filters.all" },
  { key: "teaching", labelKey: "courses.filters.teaching" },
  { key: "ended", labelKey: "courses.filters.ended" },
  { key: "notstarted", labelKey: "courses.filters.notStarted" },
];

const courseIcons = [Database, Layers, Database, Brain, Cpu];
const PAGE_SIZE = 9;

const statusCls = {
  teaching: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
  notstarted: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
  ended: "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500",
};

const statusLabelKey = {
  teaching: "common.status.teaching",
  notstarted: "common.status.notStarted",
  ended: "common.status.ended",
};

export default function TeacherCourses() {
  const { t } = useAppearanceSettings();
  const today = isoDate();
  const { classes, records, loading, error, reload } = useTeacherData();
  const [activeFilter, setActiveFilter] = useState("all");
  const [view, setView] = useState("grid");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [manageCls, setManageCls] = useState(null);
  const [sessionCls, setSessionCls] = useState(null);
  const [creating, setCreating] = useState(false);
  const [savedCode, setSavedCode] = useState(null);

  const recordsByClass = groupBy(records, (r) => r.class_id);
  const todayRows = records.filter((r) => r.session_date === today);
  const todayCount = countStatus(todayRows);
  const overall = countStatus(records);

  const courses = classes.map((cls, i) => {
    const rows = recordsByClass.get(cls.id) || [];
    const todayOfClass = rows.filter((r) => r.session_date === today);
    const latestToday = todayOfClass[0];
    const phase = classPhase(cls, today);
    const todayCountOfClass = countStatus(todayOfClass);
    return {
      cls,
      id: cls.id,
      code: cls.course_code || "-",
      name: cls.course_name,
      term: termLabel(cls),
      room: cls.class_code || "-",
      students: cls.student_count,
      pct: Math.round(pct(todayCountOfClass.present + todayCountOfClass.late, todayOfClass.length)),
      time: latestToday ? timeRange(latestToday.start_time, latestToday.end_time) : "-",
      status: phase,
      icon: courseIcons[i % courseIcons.length],
      iconBg: colorOf(i).solid,
      barColor: phase === "notstarted" ? "bg-slate-200 dark:bg-slate-700" : colorOf(i).solid,
    };
  });

  const q = search.trim().toLowerCase();
  const filtered = courses.filter(
    (c) =>
      (activeFilter === "all" || c.status === activeFilter) &&
      (!q || `${c.code} ${c.name} ${c.room}`.toLowerCase().includes(q))
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const todaySessions = new Set(todayRows.map((r) => r.session_id)).size;

  function handleSaved(cls) {
    setManageCls(null);
    setSavedCode(cls.course_code);
    reload();
    setTimeout(() => setSavedCode(null), 2500);
  }

  return (
    <TeacherLayout
      titleIcon={BookOpen}
      titleKey="nav.courses"
      subtitleKey="courses.subtitle"
      headerExtra={
        <span className="hidden sm:flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 font-medium shrink-0">
          <CalendarDays className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          {thaiDate(today, { day: "numeric", month: "long", year: "numeric" })}
        </span>
      }
    >
      <LoadState loading={loading} error={error} onRetry={reload} />
      {savedCode && (
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 text-sm font-medium rounded-xl px-4 py-3">
          <CheckCircle className="w-4 h-4" />
          {t("courses.savedPrefix")} {savedCode} {t("courses.savedSuffix")}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("courses.searchPlaceholder")}
            className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 w-56"
          />
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm shadow-blue-200 dark:shadow-blue-950"
        >
          <Plus className="w-4 h-4" />
          {t("courses.createCourse")}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        <StatCard
          icon={<BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
          iconBg="bg-blue-100 dark:bg-blue-950/40"
          label={t("courses.stats.totalCourses")}
          value={classes.length}
          sub={t("courses.stats.totalCoursesSub")}
        />
        <StatCard
          icon={<UsersRound className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
          iconBg="bg-emerald-100 dark:bg-emerald-950/40"
          label={t("courses.stats.totalStudents")}
          value={classes.reduce((sum, c) => sum + c.student_count, 0)}
          sub={t("courses.stats.totalStudentsSub")}
        />
        <StatCard
          icon={<CalendarCheck className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
          iconBg="bg-purple-100 dark:bg-purple-950/40"
          label={t("courses.stats.checkinToday")}
          value={todaySessions}
          sub={t("courses.stats.checkinTodaySub")}
        />
        <StatCard
          icon={<BarChart3 className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
          iconBg="bg-amber-100 dark:bg-amber-950/40"
          label={t("courses.stats.attendanceRate")}
          value={`${overall.rate.toFixed(2)}%`}
          sub={t("courses.stats.attendanceRateSub")}
        />
        <StatCard
          icon={<UserX className="w-6 h-6 text-red-500 dark:text-red-400" />}
          iconBg="bg-red-100 dark:bg-red-950/40"
          label={t("courses.stats.absentStudents")}
          value={todayCount.absent}
          sub={`${pct(todayCount.absent, todayCount.total).toFixed(2)}%`}
          subColor="text-red-500 dark:text-red-400"
        />
      </div>

      {/* Filter tabs + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveFilter(tab.key);
                setPage(1);
              }}
              className={`text-sm font-medium px-4 py-2 rounded-xl border transition-colors ${
                activeFilter === tab.key
                  ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          <button
            onClick={() => setView("grid")}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
              view === "grid" ? "bg-blue-600 text-white" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
              view === "list" ? "bg-blue-600 text-white" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Course cards */}
      <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" : "flex flex-col gap-4"}>
        {visible.map((c) => {
          const Icon = c.icon;
          const isEnded = c.status === "ended";
          return (
            <div key={c.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white ${c.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-blue-600 dark:text-blue-400 text-sm">{c.code}</div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">{c.name}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {t("live.termPrefix")} {c.term} • {t("live.sectionShort")} {c.room}
                    </div>
                  </div>
                </div>
              </div>

              <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full mb-3 ${statusCls[c.status]}`}>
                {t(statusLabelKey[c.status])}
              </span>

              <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                <div>
                  <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                    <UsersRound className="w-3.5 h-3.5" />
                    {t("courses.card.students")}
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {c.students} {t("common.units.people")}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                    <ScanFace className="w-3.5 h-3.5" />
                    {t("courses.card.checkinToday")}
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">{c.pct}%</div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    {t("courses.card.classTime")}
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">{c.time}</div>
                </div>
              </div>

              <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
                <div className={`h-full rounded-full ${c.barColor}`} style={{ width: `${c.pct}%` }} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setManageCls(c.cls)}
                  className="flex items-center justify-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 rounded-lg py-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  {t("courses.card.manage")}
                </button>
                <button
                  disabled={isEnded}
                  onClick={() => setSessionCls(c.cls)}
                  className={`flex items-center justify-center gap-1 text-[11px] font-semibold rounded-lg py-2 transition-colors ${
                    isEnded
                      ? "text-slate-300 dark:text-slate-600 border border-slate-100 dark:border-slate-800 cursor-not-allowed"
                      : "text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  }`}
                >
                  <ScanFace className="w-3.5 h-3.5" />
                  {t("courses.card.checkin")}
                </button>
                <Link
                  to={`/teacher-report?class=${c.id}`}
                  className="flex items-center justify-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900 rounded-lg py-2 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  {t("courses.card.stats")}
                </Link>
              </div>
            </div>
          );
        })}

        {/* Create new course card */}
        <button
          onClick={() => setCreating(true)}
          className="flex flex-col items-center justify-center gap-3 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-800 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors p-8 text-center min-h-[260px]"
        >
          <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
            <Plus className="w-7 h-7 text-blue-500 dark:text-blue-400" />
          </div>
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-100">{t("courses.createNewTitle")}</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t("courses.createNewDesc")}</div>
          </div>
          <span className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm shadow-blue-200 dark:shadow-blue-950">
            <Plus className="w-4 h-4" />
            {t("courses.createCourse")}
          </span>
        </button>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center gap-1.5 pt-2">
          <button
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                currentPage === n
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
            disabled={currentPage === pageCount}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {manageCls && (
        <ManageCourseModal
          cls={manageCls}
          onClose={() => {
            setManageCls(null);
            reload();
          }}
          onSaved={(close = true) => (close ? handleSaved(manageCls) : reload())}
        />
      )}
      {sessionCls && <SessionModal cls={sessionCls} onClose={() => setSessionCls(null)} onChanged={reload} />}
      {creating && (
        <CreateCourseModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            reload();
          }}
        />
      )}
    </TeacherLayout>
  );
}

function StatCard({ icon, iconBg, label, value, sub, subColor }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{label}</div>
        <div className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight mt-0.5">{value}</div>
        <div className={`text-xs mt-0.5 truncate ${subColor || "text-slate-400 dark:text-slate-500"}`}>{sub}</div>
      </div>
    </div>
  );
}
