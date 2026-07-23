"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  BookOpenText,
  CalendarCheck2,
  Download,
  FileBarChart2,
  GraduationCap,
  Layers3,
  Printer,
  RefreshCw,
  School,
  Users,
} from "lucide-react";
import { api } from "@/src/lib/http/client";
import { useAuth } from "@/src/features/auth/hooks";
import { AdminPanel, InsightState } from "../_components/AdminInsightsUI";

type Student = {
  id: number;
  lrn: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email?: string | null;
  yearLevel?: string | null;
  sectionName?: string | null;
  gender?: string | null;
  isActive?: boolean;
  graduatedAt?: string | null;
  archivedAt?: string | null;
  createdAt?: string | null;
};
type Teacher = {
  id: number;
  employeeNumber?: string | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  gradeLevel?: string | null;
  sectionName?: string | null;
  isActive?: boolean;
  createdAt?: string | null;
};
type Subject = { id: number; name: string; code?: string | null };
type TeacherWithSubjects = Teacher & { subjects: Subject[] };
type ReportRow = Record<string, string | number | null>;
type Filters = {
  schoolYear: string;
  semester: string;
  quarter: string;
  gradeLevel: string;
  section: string;
  subject: string;
  teacher: string;
  student: string;
  dateFrom: string;
  dateTo: string;
};

const emptyFilters: Filters = {
  schoolYear: "",
  semester: "",
  quarter: "",
  gradeLevel: "",
  section: "",
  subject: "",
  teacher: "",
  student: "",
  dateFrom: "",
  dateTo: "",
};

const categories = [
  {
    id: "academic",
    label: "Academic Reports",
    icon: FileBarChart2,
    tone: "text-violet-600 bg-violet-50",
  },
  {
    id: "operational",
    label: "Operational Reports",
    icon: BarChart3,
    tone: "text-indigo-600 bg-indigo-50",
  },
  {
    id: "students",
    label: "Student Reports",
    icon: GraduationCap,
    tone: "text-emerald-600 bg-emerald-50",
  },
  {
    id: "teachers",
    label: "Teacher Reports",
    icon: Users,
    tone: "text-blue-600 bg-blue-50",
  },
  {
    id: "attendance",
    label: "Attendance Reports",
    icon: CalendarCheck2,
    tone: "text-amber-600 bg-amber-50",
  },
  {
    id: "enrollment",
    label: "Enrollment Reports",
    icon: BarChart3,
    tone: "text-cyan-600 bg-cyan-50",
  },
  {
    id: "subjects",
    label: "Subject Reports",
    icon: BookOpenText,
    tone: "text-pink-600 bg-pink-50",
  },
  {
    id: "sections",
    label: "Section Reports",
    icon: Layers3,
    tone: "text-slate-600 bg-slate-100",
  },
] as const;

const reportTypes: Record<string, string[]> = {
  academic: [
    "Student Grades",
    "Quarterly Grades",
    "Final Grades",
    "Subject Performance",
    "Passing Students",
    "Failing Students",
    "Grade Distribution",
    "Academic Performance Summary",
  ],
  operational: ["Operational Overview"],
  students: [
    "Student Directory",
    "Student Master List",
    "Students by Grade",
    "Students by Section",
    "Newly Enrolled Students",
    "Graduated Students",
    "Transferred Students",
    "Inactive Students",
  ],
  teachers: [
    "Teacher Directory",
    "Teacher Assignments",
    "Subjects per Teacher",
    "Sections per Teacher",
    "Teacher Workload",
    "Class Adviser List",
  ],
  attendance: [
    "Daily Attendance",
    "Weekly Attendance",
    "Monthly Attendance",
    "Attendance Summary",
    "Attendance by Grade",
    "Attendance by Section",
  ],
  enrollment: [
    "Enrollment Summary",
    "Enrollment by Grade",
    "Enrollment by Section",
    "Enrollment Trends",
    "School Population",
  ],
  subjects: [
    "Subject List",
    "Students per Subject",
    "Teachers per Subject",
    "Subject Performance",
  ],
  sections: [
    "Student Count",
    "Assigned Adviser",
    "Assigned Subjects",
    "Attendance Rate",
    "Average Grade",
  ],
};

function fullName(person: {
  firstName: string;
  middleName?: string | null;
  lastName: string;
}) {
  return [person.firstName, person.middleName, person.lastName]
    .filter(Boolean)
    .join(" ");
}

function valueLabel(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export default function AdminReportsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<TeacherWithSubjects[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [category, setCategory] = useState("academic");
  const [reportName, setReportName] = useState(reportTypes.academic[0]);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sourceFailed, setSourceFailed] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const loadCore = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [studentResponse, teacherResponse] = await Promise.all([
        api.get("/api/students"),
        api.get("/api/teachers"),
      ]);
      const studentRows = Array.isArray(studentResponse.data?.students)
        ? (studentResponse.data.students as Student[])
        : [];
      const teacherRows = Array.isArray(teacherResponse.data?.teachers)
        ? (teacherResponse.data.teachers as Teacher[])
        : [];
      const subjectResults = await Promise.allSettled(
        teacherRows.map((teacher) =>
          api.get(`/api/teachers/${teacher.id}/subjects`),
        ),
      );
      const teachersWithSubjects = teacherRows.map((teacher, index) => ({
        ...teacher,
        subjects:
          subjectResults[index]?.status === "fulfilled" &&
          Array.isArray(subjectResults[index].value.data?.subjects)
            ? (subjectResults[index].value.data.subjects as Subject[])
            : [],
      }));
      const subjectMap = new Map<number, Subject>();
      teachersWithSubjects.forEach((teacher) =>
        teacher.subjects.forEach((subject) =>
          subjectMap.set(subject.id, subject),
        ),
      );
      setStudents(studentRows);
      setSourceFailed(false);
      setTeachers(teachersWithSubjects);
      setSubjects(
        Array.from(subjectMap.values()).sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
    } catch {
      setStudents([]);
      setSourceFailed(true);
      setTeachers([]);
      setSubjects([]);
      setError("The report source data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        const created = student.createdAt?.slice(0, 10) ?? "";
        return (
          (!filters.student || String(student.id) === filters.student) &&
          (!filters.gradeLevel || student.yearLevel === filters.gradeLevel) &&
          (!filters.section || student.sectionName === filters.section) &&
          (!filters.dateFrom || created >= filters.dateFrom) &&
          (!filters.dateTo || created <= filters.dateTo)
        );
      }),
    [filters, students],
  );

  const generateReport = useCallback(async () => {
    if (loading || sourceFailed) return;
    setError("");
    setRows([]);
    setColumns([]);
    try {
      let nextRows: ReportRow[] = [];
      let nextColumns: string[] = [];
      if (category === "operational") {
        nextColumns = ["Record Type", "Total Records"];
        nextRows = [
          { "Record Type": "Students", "Total Records": students.length },
          { "Record Type": "Teachers", "Total Records": teachers.length },
          { "Record Type": "Subjects", "Total Records": subjects.length },
        ];
      } else if (category === "students") {
        let source = filteredStudents;
        if (reportName === "Graduated Students")
          source = source.filter((item) => item.graduatedAt);
        if (reportName === "Inactive Students")
          source = source.filter((item) => item.isActive === false);
        if (reportName === "Transferred Students") source = [];
        nextColumns = [
          "LRN",
          "Student Name",
          "Email",
          "Grade Level",
          "Section",
          "Status",
          "Date Created",
        ];
        nextRows = source.map((student) => ({
          LRN: student.lrn,
          "Student Name": fullName(student),
          Email: student.email ?? null,
          "Grade Level": student.yearLevel ?? null,
          Section: student.sectionName ?? null,
          Status: student.archivedAt
            ? "Archived"
            : student.graduatedAt
              ? "Graduated"
              : student.isActive === false
                ? "Inactive"
                : "Active",
          "Date Created": student.createdAt
            ? new Date(student.createdAt).toLocaleDateString()
            : null,
          _studentId: student.id,
        }));
      } else if (category === "teachers") {
        const source = filters.teacher
          ? teachers.filter((item) => String(item.id) === filters.teacher)
          : teachers;
        nextColumns = [
          "Employee Number",
          "Teacher Name",
          "Email",
          "Grade",
          "Section",
          "Assigned Subjects",
          "Status",
        ];
        nextRows = source.map((teacher) => ({
          "Employee Number": teacher.employeeNumber ?? null,
          "Teacher Name": fullName(teacher),
          Email: teacher.email ?? null,
          Grade: teacher.gradeLevel ?? null,
          Section: teacher.sectionName ?? null,
          "Assigned Subjects":
            teacher.subjects.map((subject) => subject.name).join(", ") || null,
          Status: teacher.isActive === false ? "Inactive" : "Active",
          _teacherId: teacher.id,
        }));
      } else if (category === "academic") {
        const unsupportedAcademicReports = [
          "Subject Performance",
          "Passing Students",
          "Failing Students",
          "Grade Distribution",
          "Academic Performance Summary",
        ];
        if (
          !filters.student ||
          unsupportedAcademicReports.includes(reportName)
        ) {
          nextRows = [];
        } else {
          const { data } = await api.get(
            `/api/students/${filters.student}/academic-record`,
          );
          const records = Array.isArray(data?.record?.subjects)
            ? data.record.subjects
            : [];
          nextColumns = [
            "Subject",
            "Code",
            "Quarter 1",
            "Quarter 2",
            "Quarter 3",
            "Quarter 4",
            "Final Grade",
          ];
          nextRows = records
            .filter(
              (record: { subjectId: number }) =>
                !filters.subject ||
                String(record.subjectId) === filters.subject,
            )
            .map((record: Record<string, unknown>) => ({
              Subject: record.subjectName as string,
              Code: (record.subjectCode as string) || null,
              "Quarter 1": record.quarter1 as number | null,
              "Quarter 2": record.quarter2 as number | null,
              "Quarter 3": record.quarter3 as number | null,
              "Quarter 4": record.quarter4 as number | null,
              "Final Grade": record.finalGrade as number | null,
            }));
          if (reportName === "Final Grades") {
            nextColumns = ["Subject", "Code", "Final Grade"];
          } else if (filters.quarter) {
            nextColumns = ["Subject", "Code", `Quarter ${filters.quarter}`];
          }
        }
      } else if (category === "attendance") {
        if (filters.student) {
          const { data } = await api.get(
            `/api/students/${filters.student}/attendance`,
          );
          const records = Array.isArray(data?.attendance)
            ? data.attendance
            : [];
          nextColumns = ["Date", "Student", "Subject", "Status", "Recorded By"];
          const student = students.find(
            (item) => String(item.id) === filters.student,
          );
          nextRows = records
            .filter(
              (record: { date: string }) =>
                (!filters.dateFrom || record.date >= filters.dateFrom) &&
                (!filters.dateTo || record.date <= filters.dateTo),
            )
            .map((record: Record<string, unknown>) => ({
              Date: record.date as string,
              Student: student ? fullName(student) : null,
              Subject: record.subject as string | null,
              Status: record.status as string,
              "Recorded By": record.recordedBy as string | null,
            }));
        }
      } else if (category === "enrollment") {
        const groups = new Map<string, number>();
        filteredStudents.forEach((student) => {
          const key =
            reportName === "Enrollment by Section"
              ? (student.sectionName ?? "Unassigned")
              : reportName === "Enrollment Trends"
                ? (student.createdAt?.slice(0, 7) ?? "Unknown")
                : (student.yearLevel ?? "Unassigned");
          groups.set(key, (groups.get(key) ?? 0) + 1);
        });
        nextColumns = ["Group", "Student Count"];
        nextRows = Array.from(groups, ([Group, count]) => ({
          Group,
          "Student Count": count,
        }));
      } else if (category === "subjects") {
        const supported =
          reportName === "Subject List" ||
          reportName === "Teachers per Subject";
        const source = supported
          ? filters.subject
            ? subjects.filter((item) => String(item.id) === filters.subject)
            : subjects
          : [];
        nextColumns = ["Subject", "Code", "Assigned Teachers", "Teacher Count"];
        nextRows = source.map((subject) => {
          const assigned = teachers.filter((teacher) =>
            teacher.subjects.some((item) => item.id === subject.id),
          );
          return {
            Subject: subject.name,
            Code: subject.code ?? null,
            "Assigned Teachers": assigned.map(fullName).join(", ") || null,
            "Teacher Count": assigned.length,
          };
        });
      } else if (category === "sections") {
        const sectionMap = new Map<string, Student[]>();
        filteredStudents.forEach((student) => {
          const key = student.sectionName ?? "Unassigned";
          sectionMap.set(key, [...(sectionMap.get(key) ?? []), student]);
        });
        nextColumns = [
          "Section",
          "Student Count",
          "Grade Levels",
          "Assigned Adviser",
          "Attendance Rate",
          "Average Grade",
        ];
        nextRows = Array.from(sectionMap, ([section, sectionStudents]) => ({
          Section: section,
          "Student Count": sectionStudents.length,
          "Grade Levels":
            Array.from(
              new Set(
                sectionStudents.map((item) => item.yearLevel).filter(Boolean),
              ),
            ).join(", ") || null,
          "Assigned Adviser": teachers.find(
            (teacher) => teacher.sectionName === section,
          )
            ? fullName(
                teachers.find((teacher) => teacher.sectionName === section)!,
              )
            : null,
          "Attendance Rate": null,
          "Average Grade": null,
        }));
      }
      setColumns(nextColumns);
      setRows(nextRows);
      setGeneratedAt(new Date().toISOString());
    } catch {
      setError(
        "The selected report could not be generated from the available backend data.",
      );
    }
  }, [
    category,
    filteredStudents,
    filters,
    loading,
    reportName,
    sourceFailed,
    students,
    subjects,
    teachers,
  ]);

  useEffect(() => {
    void generateReport();
  }, [generateReport]);

  const gradeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          students.map((item) => item.yearLevel).filter(Boolean) as string[],
        ),
      ).sort(),
    [students],
  );
  const sectionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          students.map((item) => item.sectionName).filter(Boolean) as string[],
        ),
      ).sort(),
    [students],
  );
  const appliedFilters = Object.entries(filters).filter(([, value]) => value);

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-10 print:max-w-none print:space-y-3 [&_.text-xs]:!text-sm [&_.text-sm]:!text-base [&_button:not(:disabled)]:cursor-pointer">
      <p className="text-sm text-slate-600 print:hidden">
        Generate and preview reports using available live LMS records.
      </p>

      <section className="space-y-3 print:hidden">
        <div>
          <h2 className="font-semibold text-slate-900">KPI Overview</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Choose a reporting area to view its available live records.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setCategory(item.id);
                  setReportName(reportTypes[item.id][0]);
                }}
                className={`group rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md ${category === item.id ? "border-slate-400 ring-2 ring-slate-100" : "border-slate-200"}`}
              >
                <span className="flex items-start justify-between">
                  <span
                    className={`inline-flex rounded-xl border border-current/10 p-2.5 ${item.tone}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-slate-400 opacity-50 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
                </span>
                <span className="mt-4 block text-sm font-semibold text-slate-900">
                  {item.label}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {reportTypes[item.id].length} available report types
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <AdminPanel
        title="Global Report Filters"
        description="Filters refresh the selected report together."
        className="print:hidden"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select
            disabled
            title="School-year metadata is unavailable"
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400"
          >
            <option>School Year unavailable</option>
          </select>
          <select
            disabled
            title="Semester metadata is unavailable"
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400"
          >
            <option>Semester unavailable</option>
          </select>
          <select
            value={filters.quarter}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                quarter: event.target.value,
              }))
            }
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="">All quarters</option>
            <option value="1">Quarter 1</option>
            <option value="2">Quarter 2</option>
            <option value="3">Quarter 3</option>
            <option value="4">Quarter 4</option>
          </select>
          <select
            value={filters.gradeLevel}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                gradeLevel: event.target.value,
              }))
            }
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="">All grade levels</option>
            {gradeOptions.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            value={filters.section}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                section: event.target.value,
              }))
            }
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="">All sections</option>
            {sectionOptions.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            value={filters.subject}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                subject: event.target.value,
              }))
            }
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          <select
            value={filters.teacher}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                teacher: event.target.value,
              }))
            }
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="">All teachers</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {fullName(teacher)}
              </option>
            ))}
          </select>
          <select
            value={filters.student}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                student: event.target.value,
              }))
            }
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="">All students</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {fullName(student)}
              </option>
            ))}
          </select>
          <label className="text-sm text-slate-500">
            Date From
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  dateFrom: event.target.value,
                }))
              }
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <label className="text-sm text-slate-500">
            Date To
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  dateTo: event.target.value,
                }))
              }
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilters(emptyFilters)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Clear Filters
          </button>
          <button
            type="button"
            disabled
            title="Saved filter preset backend is unavailable"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-400 disabled:cursor-not-allowed"
          >
            Save Preset
          </button>
        </div>
      </AdminPanel>

      <AdminPanel
        title={
          categories.find((item) => item.id === category)?.label ?? "Reports"
        }
        description="Select a report type to update the preview."
        className="print:hidden"
      >
        <div className="flex flex-wrap gap-2">
          {reportTypes[category].map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setReportName(name)}
              className={`rounded-full px-3 py-2 text-sm font-medium transition ${reportName === name ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {name}
            </button>
          ))}
        </div>
      </AdminPanel>

      <section
        id="report-preview"
        className="rounded-2xl border border-slate-200 bg-white shadow-sm print:border-0 print:shadow-none"
      >
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <School className="h-5 w-5 text-slate-500" />
              <h2 className="text-xl font-semibold text-slate-900">
                {reportName}
              </h2>
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm text-slate-500 sm:grid-cols-2">
              <div>
                Generated By:{" "}
                <b className="text-slate-700">{user?.email || "—"}</b>
              </div>
              <div>
                Generated Date:{" "}
                <b className="text-slate-700">
                  {generatedAt ? new Date(generatedAt).toLocaleString() : "—"}
                </b>
              </div>
              <div>
                Total Records: <b className="text-slate-700">{rows.length}</b>
              </div>
              <div>
                Applied Filters:{" "}
                <b className="text-slate-700">
                  {appliedFilters.length
                    ? appliedFilters
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(" · ")
                    : "None"}
                </b>
              </div>
            </dl>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button
              type="button"
              onClick={() => void generateReport()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            {["PDF", "Excel", "CSV"].map((format) => (
              <button
                key={format}
                type="button"
                disabled
                title={`${format} export endpoint is unavailable`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-400 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                {format}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <InsightState loading />
          ) : error ? (
            <div className="p-5">
              <InsightState error />
              <button
                type="button"
                onClick={() => void loadCore()}
                className="mx-auto mt-3 block rounded-xl border px-4 py-2 text-sm"
              >
                Retry
              </button>
            </div>
          ) : rows.length && columns.length ? (
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  {columns.map((column) => (
                    <th key={column} className="px-4 py-3">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    {columns.map((column) => {
                      const destination =
                        column === "Student Name" && row._studentId
                          ? "/admin/students"
                          : column === "Teacher Name" && row._teacherId
                            ? "/admin/teachers"
                            : null;
                      return (
                        <td key={column} className="px-4 py-3 text-slate-700">
                          {destination ? (
                            <Link
                              href={destination}
                              className="font-semibold text-slate-900 underline-offset-4 hover:text-violet-700 hover:underline"
                            >
                              {valueLabel(row[column])}
                            </Link>
                          ) : (
                            valueLabel(row[column])
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <InsightState
              emptyLabel={
                category === "academic" || category === "attendance"
                  ? "Select a student with available records to preview this report."
                  : "No backend records match this report and its filters."
              }
            />
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2 print:hidden">
        <AdminPanel
          title="Saved Filter Presets"
          description="Backend support is not available."
        >
          <InsightState emptyLabel="No saved filter presets are available." />
        </AdminPanel>
        <AdminPanel
          title="Report History"
          description="Generated-report history is not stored by the backend."
        >
          <InsightState emptyLabel="No report history records are available." />
        </AdminPanel>
      </div>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #report-preview,
          #report-preview * {
            visibility: visible !important;
          }
          #report-preview {
            position: absolute;
            inset: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
