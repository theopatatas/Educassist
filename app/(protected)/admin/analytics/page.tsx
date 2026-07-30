"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, BookOpenText, BrainCircuit, CalendarClock, ClipboardCheck, Download, FileSpreadsheet, GraduationCap, Layers3, Percent, RefreshCw, School, ShieldCheck, TrendingUp, UserCheck, Users, UsersRound } from "lucide-react";
import { AdminMetricCard, AdminPanel, InsightState } from "../_components/AdminInsightsUI";
import {
  exportAdminAnalytics, getAdminAnalytics, getDashboardCore, getTeacherSubjects, type AdminAnalytics, type AdminStudent,
  type AdminTeacher, type AnalyticsFilters,
} from "../_lib/admin-insights";
import { AnalyticsChart } from "./AnalyticsChart";

type TeacherLoad = { id: number; name: string; subjects: number; sections: number; students: number; averageGrade?: number | null };
const initialFilters: AnalyticsFilters = { schoolYear: "", term: "", gradeLevel: "", section: "", subject: "", teacher: "", student: "", dateFrom: "", dateTo: "" };

export default function AdminAnalyticsPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>(initialFilters);
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacher[]>([]);
  const [teacherLoads, setTeacherLoads] = useState<TeacherLoad[]>([]);
  const [subjectCount, setSubjectCount] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [coreError, setCoreError] = useState(false);
  const [analyticsUnavailable, setAnalyticsUnavailable] = useState(false);
  const [sectionSort, setSectionSort] = useState<"name" | "students" | "grade" | "attendance">("name");

  const refresh = useCallback(async (active: { value: boolean }) => {
    setLoading(true);
    setCoreError(false);
    setAnalyticsUnavailable(false);
    const [coreResult, analyticsResult] = await Promise.allSettled([getDashboardCore(), getAdminAnalytics(filters)]);
    if (!active.value) return;
    if (coreResult.status === "fulfilled") {
      setStudents(coreResult.value.students);
      setTeachers(coreResult.value.teachers);
      const subjectResults = await Promise.allSettled(coreResult.value.teachers.map((teacher) => getTeacherSubjects(teacher.id)));
      if (!active.value) return;
      const subjectIds = new Set<number>();
      subjectResults.forEach((result) => result.status === "fulfilled" && result.value.forEach((subject) => subjectIds.add(subject.id)));
      if (subjectResults.some((result) => result.status === "fulfilled")) setSubjectCount(subjectIds.size);
      setTeacherLoads(coreResult.value.teachers.map((teacher, index) => {
        const subjects = subjectResults[index]?.status === "fulfilled" ? subjectResults[index].value.length : 0;
        const handledStudents = teacher.sectionId ? coreResult.value.students.filter((student) => student.sectionId === teacher.sectionId).length : 0;
        return { id: teacher.id, name: `${teacher.firstName} ${teacher.lastName}`.trim(), subjects, sections: teacher.sectionId ? 1 : 0, students: handledStudents };
      }));
    } else setCoreError(true);
    if (analyticsResult.status === "fulfilled" && analyticsResult.value) {
      setAnalytics(analyticsResult.value);
      setTeacherLoads(analyticsResult.value.teacherWorkload ?? []);
      setSubjectCount(analyticsResult.value.kpis?.totalSubjects ?? null);
    }
    else { setAnalytics(null); setAnalyticsUnavailable(true); }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    const active = { value: true };
    const timer = window.setTimeout(() => { void refresh(active); }, 250);
    return () => { active.value = false; window.clearTimeout(timer); };
  }, [refresh]);

  const gradeOptions = useMemo(() => Array.from(new Set(students.map((student) => student.yearLevel).filter((value): value is string => Boolean(value)))).sort(), [students]);
  const sectionOptions = useMemo(() => Array.from(new Set(students.map((student) => student.sectionName).filter((value): value is string => Boolean(value)))).sort(), [students]);
  const filteredStudents = useMemo(() => students.filter((student) => (!filters.gradeLevel || student.yearLevel === filters.gradeLevel) && (!filters.section || student.sectionName === filters.section)), [filters.gradeLevel, filters.section, students]);
  const gradeDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    filteredStudents.forEach((student) => { const label = student.yearLevel?.trim() || "Unassigned"; counts.set(label, (counts.get(label) ?? 0) + 1); });
    return Array.from(counts, ([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  }, [filteredStudents]);
  const workloadStats = useMemo(() => {
    if (!teacherLoads.length) return null;
    const counts = teacherLoads.map((teacher) => teacher.students);
    return { highest: Math.max(...counts), lowest: Math.min(...counts), average: Math.round(counts.reduce((sum, value) => sum + value, 0) / counts.length) };
  }, [teacherLoads]);
  const attendance = analytics?.attendance;
  const sortedSections = useMemo(() => [...(analytics?.sections ?? [])].sort((a, b) => {
    if (sectionSort === "students") return b.studentCount - a.studentCount;
    if (sectionSort === "grade") return (b.averageGrade ?? -1) - (a.averageGrade ?? -1);
    if (sectionSort === "attendance") return (b.attendanceRate ?? -1) - (a.attendanceRate ?? -1);
    return a.name.localeCompare(b.name);
  }), [analytics?.sections, sectionSort]);
  const sectionCount = useMemo(() => new Set(students.map((student) => student.sectionId).filter(Boolean)).size, [students]);
  const filterSummary = [
    ["School Year", filters.schoolYear || "All"], ["Term", filters.term || "All"],
    ["Grade Level", filters.gradeLevel || "All"],
    ["Section", filters.section || "All"], ["Subject", filters.subject || "All"],
    ["Teacher", filters.teacher || "All"], ["Student", filters.student || "All"],
    ["Date Range", filters.dateFrom || filters.dateTo ? `${filters.dateFrom || "Start"} – ${filters.dateTo || "End"}` : "All dates"],
  ];
  const exportAnalytics = async (format: "pdf" | "excel" | "csv") => {
    const blob = await exportAdminAnalytics(format, filters);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `analytics.${format === "excel" ? "xls" : format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const updateFilter = (key: keyof AnalyticsFilters, value: string) => setFilters((current) => ({ ...current, [key]: value }));

  return <div className="mx-auto max-w-[1500px] space-y-5 pb-8 [&_.text-xs]:!text-sm [&_.text-sm]:!text-base [&_button:not(:disabled)]:cursor-pointer [&_button]:transition-all [&_a]:transition-all">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-slate-600">Detailed enrollment, teacher, performance, and attendance insights using available LMS data.</p>{coreError ? <p role="alert" className="mt-1 text-sm text-rose-600">Core analytics data could not be loaded.</p> : null}</div><div className="flex flex-wrap items-center gap-2"><button type="button" disabled={loading} onClick={() => void refresh({ value: true })} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{analyticsUnavailable ? "Retry" : "Refresh"}</button>{analytics?.updatedAt ? <p className="inline-flex items-center gap-2 text-xs text-slate-500"><CalendarClock className="h-4 w-4" />Last updated {new Date(analytics.updatedAt).toLocaleString()}</p> : null}</div></div>

    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="mb-4"><h2 className="font-semibold text-slate-900">KPI Overview</h2><p className="mt-1 text-xs text-slate-500">Key measures from connected LMS data sources.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <AdminMetricCard label="Total Students" value={analytics?.kpis?.totalStudents ?? students.length} description="Students matching current filters" icon={Users} href="/admin/students" loading={loading} tone="blue" />
      <AdminMetricCard label="Total Teachers" value={analytics?.kpis?.totalTeachers ?? teachers.length} description="Teachers matching current filters" icon={UserCheck} href="/admin/teachers" loading={loading} tone="amber" />
      <AdminMetricCard label="Total Subjects" value={analytics?.kpis?.totalSubjects ?? subjectCount} description="Subjects matching current filters" icon={BookOpenText} href="/admin/subjects" loading={loading} tone="violet" />
      <AdminMetricCard label="Total Sections" value={analytics?.kpis?.totalSections ?? (sectionCount || null)} description="Sections matching current filters" icon={Layers3} href="/admin/subjects" loading={loading} tone="cyan" />
      <AdminMetricCard label="Average Attendance" value={attendance ? `${attendance.rate}%` : null} description="Selected filter scope" icon={Activity} href="/admin/analytics" loading={loading} tone="emerald" />
      <AdminMetricCard label="Average Performance" value={analytics?.performance ? analytics.performance.overallAverage : null} description="Selected filter scope" icon={School} href="/admin/analytics" loading={loading} tone="violet" />
      <AdminMetricCard label="Enrollment Growth" value={analytics?.kpis?.enrollmentGrowth != null ? `${analytics.kpis.enrollmentGrowth}%` : null} description="Selected period" icon={TrendingUp} href="/admin/analytics" loading={loading} tone="blue" />
      <AdminMetricCard label="Overall Passing Rate" value={analytics?.performance ? `${analytics.performance.passingRate}%` : null} description="Selected filter scope" icon={Percent} href="/admin/analytics" loading={loading} tone="emerald" />
    </div></section>

    <AdminPanel title="Global Analytics Filters" description="Every change refreshes all connected analytics sources."><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <label className="text-xs font-medium text-slate-600">School Year<select value={filters.schoolYear} onChange={(event) => updateFilter("schoolYear", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">All school years</option>{analytics?.filterOptions?.schoolYears.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
      <label className="text-xs font-medium text-slate-600">Term<select value={filters.term} onChange={(event) => updateFilter("term", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">All terms</option>{[1, 2, 3].map((term) => <option key={term} value={term}>Term {term}</option>)}</select></label>
      <label className="text-xs font-medium text-slate-600">Grade Level<select value={filters.gradeLevel} onChange={(event) => updateFilter("gradeLevel", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">All grades</option>{(analytics?.filterOptions?.gradeLevels ?? gradeOptions).map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select></label>
      <label className="text-xs font-medium text-slate-600">Section<select value={filters.section} onChange={(event) => updateFilter("section", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">All sections</option>{analytics?.filterOptions?.sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>) ?? sectionOptions.map((section) => <option key={section} value={section}>{section}</option>)}</select></label>
      <label className="text-xs font-medium text-slate-600">Subject<select value={filters.subject} onChange={(event) => updateFilter("subject", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">All subjects</option>{analytics?.filterOptions?.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
      <label className="text-xs font-medium text-slate-600">Teacher<select value={filters.teacher} onChange={(event) => updateFilter("teacher", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">All teachers</option>{analytics?.filterOptions?.teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>
      <label className="text-xs font-medium text-slate-600">Student<select value={filters.student} onChange={(event) => updateFilter("student", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">All students</option>{analytics?.filterOptions?.students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label>
      <label className="text-xs font-medium text-slate-600">Date From<input type="date" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
      <label className="text-xs font-medium text-slate-600">Date To<input type="date" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
    </div></AdminPanel>

    <AdminPanel title="Applied Filters" description="This summary updates automatically with the global controls."><div className="flex flex-wrap gap-2">{filterSummary.map(([label, value]) => <span key={label} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600"><b className="font-semibold text-slate-700">{label}:</b> {value}</span>)}</div></AdminPanel>

    <AdminPanel title="Enrollment Analytics" description="Live enrollment distribution, monthly trends, and student status totals."><div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
      <div><h3 className="text-sm font-semibold text-slate-700">Enrollment by Grade Level</h3>{loading ? <InsightState loading /> : gradeDistribution.length ? <div className="mt-3 space-y-2">{gradeDistribution.map((item) => <div key={item.label} className="rounded-xl border border-slate-100 p-3"><div className="flex justify-between text-sm"><span>{item.label}</span><b>{item.count}</b></div><div className="mt-2 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-slate-500" style={{ width: `${filteredStudents.length ? (item.count / filteredStudents.length) * 100 : 0}%` }} /></div></div>)}</div> : <InsightState emptyLabel="No enrollment records match the selected filters." />}</div>
      <div><h3 className="mb-3 text-sm font-semibold text-slate-700">Monthly Enrollment Trend</h3><AnalyticsChart data={analytics?.enrollmentTrend} xKey="label" series={[{ key: "value", label: "Enrollment", color: "#475569" }]} type="line" loading={loading} error={analyticsUnavailable} /></div>
    </div><div className="mt-5 grid gap-3 sm:grid-cols-3">{[{ label: "New Students", value: analytics?.enrollmentStatus?.newStudents }, { label: "Graduated Students", value: analytics?.enrollmentStatus?.graduated }, { label: "Inactive Students", value: analytics?.enrollmentStatus?.inactive }].map((item) => <AdminMetricCard key={item.label} label={item.label} value={item.value ?? null} description="Live student records" icon={GraduationCap} href="/admin/students" loading={loading} />)}</div></AdminPanel>

    <AdminPanel title="Teacher Analytics" description="Workload and published class performance derived from live teacher assignments."><div className="grid gap-3 sm:grid-cols-3">{[{ label: "Highest Workload", value: analytics?.teacherWorkloadSummary?.highest ?? workloadStats?.highest ?? null }, { label: "Lowest Workload", value: analytics?.teacherWorkloadSummary?.lowest ?? workloadStats?.lowest ?? null }, { label: "Average Workload", value: analytics?.teacherWorkloadSummary?.average ?? workloadStats?.average ?? null }].map((item) => <AdminMetricCard key={item.label} label={item.label} value={item.value} description="Students handled" icon={UserCheck} href="/admin/teachers" loading={loading} />)}</div><div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">{loading ? <InsightState loading /> : teacherLoads.length ? <table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">Teacher</th><th>Assigned Subjects</th><th>Assigned Sections</th><th>Total Students</th><th>Published Grade Average</th></tr></thead><tbody>{teacherLoads.map((teacher) => <tr key={teacher.id} className="border-t border-slate-100"><td className="p-3 font-medium">{teacher.name}</td><td>{teacher.subjects}</td><td>{teacher.sections}</td><td>{teacher.students}</td><td>{teacher.averageGrade ?? "—"}</td></tr>)}</tbody></table> : <InsightState emptyLabel="No teacher workload records are available." />}</div></AdminPanel>

    <div className="grid gap-5 xl:grid-cols-2">
      <AdminPanel title="Student Performance Analytics" description="Overall average, passing rate, honors, risk, and grade-level performance.">{analyticsUnavailable ? <InsightState error /> : analytics?.performance ? <div className="grid grid-cols-2 gap-3">{[{ label: "Overall Average", value: analytics.performance.overallAverage }, { label: "Passing Rate", value: analytics.performance.passingRate }, { label: "Honor Students", value: analytics.performance.honorStudents }, { label: "Students at Risk", value: analytics.performance.atRisk }, { label: "Highest Grade Level", value: analytics.performance.highestGradeLevel }, { label: "Lowest Grade Level", value: analytics.performance.lowestGradeLevel }].map((item) => <div key={item.label} className="rounded-xl bg-slate-50 p-3"><b>{item.value}</b><p className="text-xs text-slate-500">{item.label}</p></div>)}</div> : <InsightState />}</AdminPanel>
      <AdminPanel title="Attendance Analytics" description="Present, late, absent, and daily, weekly, and monthly attendance rates.">{analyticsUnavailable ? <InsightState error /> : attendance ? <><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[{ label: "Present", value: attendance.present }, { label: "Late", value: attendance.late }, { label: "Absent", value: attendance.absent }, { label: "Rate", value: `${attendance.rate}%` }].map((item) => <div key={item.label} className="rounded-xl bg-slate-50 p-3"><b>{item.value}</b><p className="text-xs text-slate-500">{item.label}</p></div>)}</div><div className="mt-4 grid gap-3 sm:grid-cols-3">{(["daily", "weekly", "monthly"] as const).map((period) => <div key={period}><h3 className="mb-2 text-xs font-semibold capitalize text-slate-600">{period} Attendance</h3>{attendance[period].length ? attendance[period].map((item) => <div key={item.label} className="flex justify-between text-xs"><span>{item.label}</span><b>{item.value}</b></div>) : <InsightState />}</div>)}</div></> : <InsightState />}</AdminPanel>
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      <AdminPanel title="Student Performance Trend" description="Average published grade by grading period."><AnalyticsChart data={analytics?.performanceTrend} xKey="label" series={[{ key: "value", label: "Average Grade", color: "#8b5cf6" }]} type="line" loading={loading} error={analyticsUnavailable} /></AdminPanel>
      <AdminPanel title="Grade Distribution" description="Students grouped by their average published grades."><AnalyticsChart data={analytics?.performance?.gradeDistribution ? Object.entries(analytics.performance.gradeDistribution).map(([label, value]) => ({ label, value })) : []} xKey="label" series={[{ key: "value", label: "Students", color: "#2563eb" }]} loading={loading} error={analyticsUnavailable} /></AdminPanel>
    </div>

    <AdminPanel title="Subject Analytics" description="Grades, enrollment, and teacher assignments by subject."><div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]"><AnalyticsChart data={analytics?.subjects?.map((subject) => ({ name: subject.name, averageGrade: subject.averageGrade, students: subject.studentCount, teachers: subject.teacherCount }))} xKey="name" series={[{ key: "averageGrade", label: "Average Grade", color: "#8b5cf6" }]} loading={loading} error={analyticsUnavailable} /><div>{analyticsUnavailable ? <InsightState error /> : analytics?.subjects?.length ? <div className="space-y-2">{analytics.subjects.map((subject) => <div key={subject.id} className="rounded-xl border border-slate-100 p-3"><div className="flex justify-between gap-3"><b className="text-sm text-slate-800">{subject.name}</b><span className="text-xs text-slate-500">{subject.averageGrade ?? "—"}</span></div><p className="mt-1 text-xs text-slate-500">{subject.studentCount ?? "—"} students · {subject.teacherCount ?? "—"} teachers</p></div>)}{analytics.subjectSummary ? <div className="grid grid-cols-2 gap-2 pt-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Highest Performing</p><b className="text-sm">{analytics.subjectSummary.highestPerforming ?? "—"}</b></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Lowest Performing</p><b className="text-sm">{analytics.subjectSummary.lowestPerforming ?? "—"}</b></div></div> : null}</div> : <InsightState />}</div></div></AdminPanel>

    <AdminPanel title="Section Analytics" description="Advisers, enrollment, grades, and attendance by section." action={<label className="text-xs text-slate-500">Sort by <select value={sectionSort} onChange={(event) => setSectionSort(event.target.value as typeof sectionSort)} className="ml-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"><option value="name">Name</option><option value="students">Student Count</option><option value="grade">Average Grade</option><option value="attendance">Attendance</option></select></label>}>{analyticsUnavailable ? <InsightState error /> : sortedSections.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{sortedSections.map((section) => <article key={section.id} className="rounded-xl border border-slate-200 p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm"><div className="flex items-start justify-between"><div><h3 className="font-semibold text-slate-800">{section.name}</h3><p className="mt-1 text-xs text-slate-500">Adviser: {section.adviser ?? "Not assigned"}</p></div><Layers3 className="h-5 w-5 text-slate-400" /></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div><b>{section.studentCount}</b><p className="text-[10px] text-slate-500">Students</p></div><div><b>{section.averageGrade ?? "—"}</b><p className="text-[10px] text-slate-500">Avg. Grade</p></div><div><b>{section.attendanceRate != null ? `${section.attendanceRate}%` : "—"}</b><p className="text-[10px] text-slate-500">Attendance</p></div></div></article>)}</div> : <InsightState />}</AdminPanel>

    <AdminPanel title="Grade Level Comparison" description="Compare enrollment, grades, attendance, and passing rates across grade levels."><AnalyticsChart data={analytics?.gradeComparison} xKey="gradeLevel" series={[{ key: "studentCount", label: "Students", color: "#475569" }, { key: "averageGrade", label: "Average Grade", color: "#8b5cf6" }, { key: "attendanceRate", label: "Attendance Rate", color: "#10b981" }, { key: "passingRate", label: "Passing Rate", color: "#3b82f6" }]} loading={loading} error={analyticsUnavailable} /></AdminPanel>

    <AdminPanel title="Learning Activity Analytics" description="Assignment completion and quiz results calculated from submitted student work."><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard label="Assignments" value={analytics?.assignments?.total ?? null} description="Assignments in the selected scope" icon={ClipboardCheck} href="/admin/reports" loading={loading} tone="blue" />
      <AdminMetricCard label="Assignment Completion" value={analytics?.assignments?.completionRate != null ? `${analytics.assignments.completionRate}%` : null} description={`${analytics?.assignments?.submitted ?? 0} of ${analytics?.assignments?.expected ?? 0} expected submissions`} icon={ShieldCheck} href="/admin/reports" loading={loading} tone="emerald" />
      <AdminMetricCard label="Quizzes" value={analytics?.quizzes?.total ?? null} description={`${analytics?.quizzes?.completedAttempts ?? 0} completed attempts`} icon={BrainCircuit} href="/admin/reports" loading={loading} tone="violet" />
      <AdminMetricCard label="Average Quiz Score" value={analytics?.quizzes?.averageScore ?? null} description="Completed attempts in the selected scope" icon={Percent} href="/admin/reports" loading={loading} tone="amber" />
    </div></AdminPanel>

    <AdminPanel title="AI Teacher Assistant Usage" description="Persisted AI conversation and lesson-plan records from the existing Teacher Assistant."><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard label="AI Conversations" value={analytics?.aiUsage?.conversations ?? null} description="Persisted AI chat sessions" icon={BrainCircuit} href="/admin/analytics" loading={loading} tone="violet" />
      <AdminMetricCard label="Teacher Conversations" value={analytics?.aiUsage?.teacherConversations ?? null} description="Teacher-role AI sessions" icon={UserCheck} href="/admin/analytics" loading={loading} tone="blue" />
      <AdminMetricCard label="Lesson Plans" value={analytics?.aiUsage?.lessonPlans ?? null} description="Saved AI-assisted lesson plans" icon={BookOpenText} href="/admin/analytics" loading={loading} tone="amber" />
      <AdminMetricCard label="Finalized Lesson Plans" value={analytics?.aiUsage?.finalizedLessonPlans ?? null} description="Lesson plans marked final" icon={ShieldCheck} href="/admin/analytics" loading={loading} tone="emerald" />
    </div></AdminPanel>

    <div className="grid gap-5 xl:grid-cols-2">
      <AdminPanel title="Parent Engagement" description="Account linkage and login activity from parent records."><div className="grid gap-3 sm:grid-cols-2">
        <AdminMetricCard label="Parent Accounts" value={analytics?.parents?.total ?? null} description="Registered parent accounts" icon={UsersRound} href="/admin/students" loading={loading} tone="blue" />
        <AdminMetricCard label="Parent Coverage" value={analytics?.parents?.coverageRate != null ? `${analytics.parents.coverageRate}%` : null} description={`${analytics?.parents?.linkedStudents ?? 0} linked students`} icon={ShieldCheck} href="/admin/students" loading={loading} tone="emerald" />
        <AdminMetricCard label="Parents Logged In" value={analytics?.parents?.loggedIn ?? null} description="Accounts with a recorded login" icon={UserCheck} href="/admin/students" loading={loading} tone="violet" />
      </div></AdminPanel>
      <AdminPanel title="Leave & Takeover Analytics" description="Live teacher leave workflow and class takeover status."><div className="grid gap-3 sm:grid-cols-2">
        <AdminMetricCard label="Leave Requests" value={analytics?.leaves?.total ?? null} description={`${analytics?.leaves?.pending ?? 0} awaiting review`} icon={CalendarClock} href="/admin/leave-management" loading={loading} tone="amber" />
        <AdminMetricCard label="Active Leaves" value={analytics?.leaves?.active ?? null} description={`${analytics?.leaves?.approved ?? 0} approved`} icon={Activity} href="/admin/leave-management" loading={loading} tone="blue" />
        <AdminMetricCard label="Active Takeovers" value={analytics?.takeovers?.active ?? null} description={`${analytics?.takeovers?.completed ?? 0} completed`} icon={ShieldCheck} href="/admin/leave-management" loading={loading} tone="violet" />
        <AdminMetricCard label="Rejected Requests" value={analytics?.leaves?.rejected ?? null} description="Rejected leave requests" icon={Users} href="/admin/leave-management" loading={loading} tone="rose" />
      </div></AdminPanel>
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      <AdminPanel title="User Registration Trends" description="New user accounts recorded by month."><AnalyticsChart data={analytics?.registrationTrend} xKey="label" series={[{ key: "value", label: "Registrations", color: "#2563eb" }]} type="line" loading={loading} error={analyticsUnavailable} /></AdminPanel>
      <AdminPanel title="System Activity Trends" description="Audited system actions recorded during the latest 14 active days."><AnalyticsChart data={analytics?.activityTrend} xKey="label" series={[{ key: "value", label: "Activities", color: "#7c3aed" }]} type="line" loading={loading} error={analyticsUnavailable} /></AdminPanel>
    </div>

    <AdminPanel title="Academic Year & Term Summary" description="Current academic configuration from the shared Academic Settings service.">{analyticsUnavailable ? <InsightState error /> : analytics?.academic ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
      ["School Year", analytics.academic.currentSchoolYear],
      ["Active Term", analytics.academic.currentTerm],
      ["Grade Encoding", analytics.academic.gradeEncodingStatus],
      ["Grade Publishing", analytics.academic.gradePublishingStatus],
    ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><b className="mt-1 block text-sm text-slate-800">{value || "Not configured"}</b></div>)}</div> : <InsightState emptyLabel="Academic settings have not been configured." />}</AdminPanel>

    <div className="grid gap-5 xl:grid-cols-2"><AdminPanel title="Academic Insights" description="Insights generated strictly from available backend analytics.">{analyticsUnavailable ? <InsightState error /> : analytics?.insights?.length ? <div className="grid gap-2 sm:grid-cols-2">{analytics.insights.map((insight) => <div key={insight.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-xs text-slate-500">{insight.label}</p><b className="mt-1 block text-sm text-slate-800">{insight.value}</b></div>)}</div> : <InsightState />}</AdminPanel><AdminPanel title="Data Quality" description="Records that may require administrative completion or correction.">{analyticsUnavailable ? <InsightState error /> : analytics?.dataQuality?.length ? <div className="space-y-2">{analytics.dataQuality.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3"><span className="text-sm text-slate-700">{item.label}</span><b className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{item.count}</b></div>)}</div> : <InsightState />}</AdminPanel></div>

    <AdminPanel title="Export Center" description="Download a summary of the currently filtered real-time analytics."><div className="flex flex-wrap gap-2">{([{ format: "pdf", label: "Export PDF", icon: Download }, { format: "excel", label: "Export Excel", icon: FileSpreadsheet }, { format: "csv", label: "Export CSV", icon: FileSpreadsheet }] as const).map(({ format, label, icon: Icon }) => { const available = Boolean(analytics?.exports?.[format]); return <button key={format} type="button" disabled={!available} onClick={() => void exportAnalytics(format)} title={available ? label : `${label} is unavailable`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><Icon className="h-4 w-4" />{label}</button>; })}</div></AdminPanel>

    <AdminPanel title="Analytics Summary" description="Current scope and live analytics service status."><div className="grid gap-3 sm:grid-cols-3"><AdminMetricCard label="Students in Scope" value={analytics?.kpis?.totalStudents ?? filteredStudents.length} description="Matching current filters" icon={Users} href="/admin/students" loading={loading} /><AdminMetricCard label="Teachers in Scope" value={analytics?.kpis?.totalTeachers ?? teachers.length} description="Matching current filters" icon={UserCheck} href="/admin/teachers" loading={loading} /><AdminMetricCard label="Analytics Service" value={analytics ? "Live" : null} description="Real database aggregates" icon={analytics ? TrendingUp : Activity} href="/admin/analytics" loading={loading} /></div></AdminPanel>
  </div>;
}
