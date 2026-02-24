"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/http/client";
import { Plus, Calendar, FileText, X, CheckCircle2, Clock, BarChart3 } from "lucide-react";

type AssignmentStatus = "Active" | "Closed";
type ColorKey = "green" | "blue" | "purple" | "orange";

type AssignmentItem = {
  id: number;
  title: string;
  subject: string;
  section: string;
  dueDate: string;
  status: AssignmentStatus;
  submissions: number;
  total: number;
  color: ColorKey;
  description?: string;
};

type ApiAssignment = {
  id: number;
  title: string;
  dueDate: string;
  status: AssignmentStatus;
  description?: string | null;
  subjectName?: string | null;
  sectionName?: string | null;
  color?: string;
  submissions?: { submitted: number; total: number };
};

type TeacherClass = {
  id: number;
  name?: string | null;
  sectionName?: string | null;
  subjectName?: string | null;
  gradeLevel?: string | null;
};

function normalizeValue(value?: string | null) {
  return (value || "").trim();
}

type AssignmentResultRow = {
  studentId: number;
  studentName: string;
  status: "Submitted" | "Not Submitted";
  submittedAt: string | null;
};

const colorStyles: Record<
  ColorKey,
  {
    bar: string;
    chip: string;
    text: string;
    progress: string;
  }
> = {
  green: { bar: "bg-green-500", chip: "bg-green-50", text: "text-green-600", progress: "bg-green-500" },
  blue: { bar: "bg-blue-500", chip: "bg-blue-50", text: "text-blue-600", progress: "bg-blue-500" },
  purple: { bar: "bg-purple-500", chip: "bg-purple-50", text: "text-purple-600", progress: "bg-purple-500" },
  orange: { bar: "bg-orange-500", chip: "bg-orange-50", text: "text-orange-600", progress: "bg-orange-500" },
};

function toColorKey(raw?: string): ColorKey {
  if (raw === "green" || raw === "blue" || raw === "purple" || raw === "orange") return raw;
  return "blue";
}

function mapApiAssignment(a: ApiAssignment): AssignmentItem {
  return {
    id: Number(a.id),
    title: a.title,
    subject: a.subjectName || "Subject",
    section: a.sectionName || "Section",
    dueDate: a.dueDate,
    status: a.status,
    submissions: Number(a.submissions?.submitted ?? 0),
    total: Number(a.submissions?.total ?? 0),
    color: toColorKey(a.color),
    description: a.description || "",
  };
}

export default function TeacherAssignmentPage() {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [selectedSection, setSelectedSection] = useState(() => {
    if (typeof window === "undefined") return "All Sections";
    return window.localStorage.getItem("teacher_selected_section") || "All Sections";
  });
  const [selectedGrade, setSelectedGrade] = useState(() => {
    if (typeof window === "undefined") return "All Grade Levels";
    return window.localStorage.getItem("teacher_selected_grade") || "All Grade Levels";
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResultsLoading, setIsResultsLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [assignmentResults, setAssignmentResults] = useState<AssignmentResultRow[]>([]);
  const [resultsSubmitted, setResultsSubmitted] = useState(0);
  const [resultsTotal, setResultsTotal] = useState(0);
  const [newAssignment, setNewAssignment] = useState({
    classId: "",
    title: "",
    dueDate: "",
    description: "",
    status: "Active" as AssignmentStatus,
  });

  const selectedClass = useMemo(
    () => teacherClasses.find((c) => Number(c.id) === Number(newAssignment.classId)) ?? null,
    [teacherClasses, newAssignment.classId]
  );
  const sectionOptions = useMemo(() => {
    const uniq = new Set<string>();
    for (const cls of teacherClasses) {
      const section = normalizeValue(cls.sectionName || cls.name);
      if (section) uniq.add(section);
    }
    for (const a of assignments) {
      const section = normalizeValue(a.section);
      if (section) uniq.add(section);
    }
    return ["All Sections", ...Array.from(uniq)];
  }, [assignments, teacherClasses]);
  const gradeOptions = useMemo(() => {
    const uniq = new Map<string, string>();
    for (const cls of teacherClasses) {
      const grade = cls.gradeLevel?.trim();
      if (!grade || grade === "Not set") continue;
      const key = grade.toLowerCase().replace(/\s+/g, " ").trim();
      if (!uniq.has(key)) uniq.set(key, grade);
    }
    return ["All Grade Levels", ...Array.from(uniq.values())];
  }, [teacherClasses]);
  const filteredAssignments = useMemo(() => assignments, [assignments]);
  const filteredTeacherClasses = useMemo(() => {
    return teacherClasses.filter((c) => {
      const section = normalizeValue(c.sectionName || c.name);
      const grade = normalizeValue(c.gradeLevel);
      const matchesSection = selectedSection === "All Sections" || section === selectedSection;
      const matchesGrade = selectedGrade === "All Grade Levels" || grade === selectedGrade;
      return matchesSection && matchesGrade;
    });
  }, [teacherClasses, selectedGrade, selectedSection]);

  const dashboard = useMemo(() => {
    const total = assignments.length;
    const active = assignments.filter((a) => a.status === "Active").length;
    const closed = assignments.filter((a) => a.status === "Closed").length;
    const dueSoon = assignments.filter((a) => {
      if (!a.dueDate) return false;
      const due = new Date(a.dueDate);
      const now = new Date();
      const diff = due.getTime() - now.getTime();
      const days = diff / (1000 * 60 * 60 * 24);
      return days >= 0 && days <= 7;
    }).length;

    const submitted = assignments.reduce((sum, a) => sum + a.submissions, 0);
    const expected = assignments.reduce((sum, a) => sum + a.total, 0);
    const submissionRate = expected > 0 ? Math.round((submitted / expected) * 100) : 0;

    return { total, active, closed, dueSoon, submissionRate };
  }, [assignments]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setSaveError("");
    try {
      const [classesRes, assignmentsRes] = await Promise.all([
        api.get("/api/classes/me"),
        api.get("/api/assignments/me", {
          params: {
            section: selectedSection,
            gradeLevel: selectedGrade,
          },
        }),
      ]);
      const classRows = Array.isArray(classesRes.data?.classes) ? (classesRes.data.classes as TeacherClass[]) : [];
      const assignmentRows = Array.isArray(assignmentsRes.data?.assignments)
        ? (assignmentsRes.data.assignments as ApiAssignment[])
        : [];

      setTeacherClasses(classRows);
      setAssignments(assignmentRows.map(mapApiAssignment));
    } catch {
      setSaveError("Failed to load assignments.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedGrade, selectedSection]);

  useEffect(() => {
    void loadData();
  }, [loadData]);
  useEffect(() => {
    window.localStorage.setItem("teacher_selected_section", selectedSection);
  }, [selectedSection]);
  useEffect(() => {
    window.localStorage.setItem("teacher_selected_grade", selectedGrade);
  }, [selectedGrade]);
  useEffect(() => {
    if (!sectionOptions.includes(selectedSection)) {
      setSelectedSection("All Sections");
    }
  }, [sectionOptions, selectedSection]);
  useEffect(() => {
    if (!gradeOptions.includes(selectedGrade)) {
      setSelectedGrade("All Grade Levels");
    }
  }, [gradeOptions, selectedGrade]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");

    try {
      await api.post("/api/assignments/me", {
        classId: Number(newAssignment.classId),
        title: newAssignment.title,
        dueDate: newAssignment.dueDate,
        description: newAssignment.description,
        status: newAssignment.status,
      });

      await loadData();
      setIsCreateModalOpen(false);
      setNewAssignment({ classId: "", title: "", dueDate: "", description: "", status: "Active" });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to create assignment.";
      setSaveError(message);
    }
  };

  const openAssignmentModal = async (assignment: AssignmentItem) => {
    setSelectedAssignment(assignment);
    setAssignmentResults([]);
    setResultsSubmitted(0);
    setResultsTotal(0);
    setIsResultsLoading(true);
    try {
      const { data } = await api.get(`/api/assignments/${assignment.id}/results`);
      const rows = Array.isArray(data?.rows) ? (data.rows as AssignmentResultRow[]) : [];
      setAssignmentResults(rows);
      setResultsSubmitted(Number(data?.submitted ?? 0));
      setResultsTotal(Number(data?.total ?? rows.length));
    } catch {
      setAssignmentResults([]);
      setResultsSubmitted(0);
      setResultsTotal(0);
    } finally {
      setIsResultsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Assignments</h1>
          <p className="text-gray-500">Track homework and projects</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Select section"
          >
            {sectionOptions.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Select grade level"
          >
            {gradeOptions.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-5 w-5" />
            Create Assignment
          </button>
        </div>
      </div>

      {saveError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</div>
      ) : null}
      {isLoading ? <div className="mb-4 text-sm text-gray-500">Loading assignments...</div> : null}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">Total</p>
          <p className="mt-1 text-2xl font-bold text-gray-800">{dashboard.total}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">Active</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            {dashboard.active}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">Closed</p>
          <p className="mt-1 text-2xl font-bold text-gray-700">{dashboard.closed}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">Due In 7 Days</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-amber-700">
            <Clock className="h-5 w-5" />
            {dashboard.dueSoon}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase text-gray-400">Submission Rate</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-indigo-700">
            <BarChart3 className="h-5 w-5" />
            {dashboard.submissionRate}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAssignments.map((assignment) => {
          const c = colorStyles[assignment.color];
          return (
            <div
              key={assignment.id}
              onClick={() => void openAssignmentModal(assignment)}
              className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md"
            >
              <div className={`h-2 w-full ${c.bar}`} />
              <div className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${c.chip} ${c.text}`}>{assignment.subject}</span>
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-semibold ${
                      assignment.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {assignment.status}
                  </span>
                </div>

                <h3 className="mb-1 text-lg font-bold text-gray-800 transition-colors group-hover:text-indigo-600">{assignment.title}</h3>
                <p className="mb-2 text-xs font-medium text-gray-500">Section: {assignment.section}</p>

                <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  <span>Due {assignment.dueDate}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Submissions</span>
                    <span className="font-bold text-gray-700">
                      {assignment.submissions}/{assignment.total}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${c.progress}`}
                      style={{ width: `${assignment.total ? (assignment.submissions / assignment.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!isLoading && filteredAssignments.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          {selectedSection === "All Sections" && selectedGrade === "All Grade Levels"
            ? "No assignments available yet."
            : "No assignments for selected filters."}
        </div>
      ) : null}

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800">New Assignment</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAssignment} className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Class (Section)</label>
                <select
                  required
                  value={newAssignment.classId}
                  onChange={(e) => setNewAssignment({ ...newAssignment, classId: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select class</option>
                  {filteredTeacherClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {(cls.subjectName || "Subject") + " - " + (cls.sectionName || cls.name || cls.gradeLevel || `Class ${cls.id}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase text-gray-500">Subject</p>
                  <p className="text-sm font-medium text-gray-800">{selectedClass?.subjectName || "—"}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase text-gray-500">Section</p>
                  <p className="text-sm font-medium text-gray-800">{selectedClass?.sectionName || selectedClass?.name || "—"}</p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
                <input
                  required
                  type="text"
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="Assignment Title"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Due Date</label>
                <input
                  required
                  type="date"
                  value={newAssignment.dueDate}
                  onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={3}
                  value={newAssignment.description}
                  onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="Instructions..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={newAssignment.status}
                  onChange={(e) => setNewAssignment({ ...newAssignment, status: e.target.value as AssignmentStatus })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Active">Active</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedAssignment ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setSelectedAssignment(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <div className="flex items-start justify-between border-b border-gray-100 p-6">
              <div>
                <span className={`mb-2 inline-block rounded-lg px-2 py-1 text-xs font-bold ${colorStyles[selectedAssignment.color].chip} ${colorStyles[selectedAssignment.color].text}`}>
                  {selectedAssignment.subject}
                </span>
                <h2 className="text-2xl font-bold text-gray-800">{selectedAssignment.title}</h2>
              </div>
              <button
                onClick={() => setSelectedAssignment(null)}
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <div className="mb-8 flex gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Due: {selectedAssignment.dueDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>{resultsSubmitted}/{resultsTotal} Submissions</span>
                </div>
              </div>

              <h3 className="mb-4 font-bold text-gray-800">Student Submissions</h3>
              {isResultsLoading ? (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
                  Loading submission list...
                </div>
              ) : assignmentResults.length === 0 ? (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
                  No enrolled students yet.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Submitted At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {assignmentResults.map((row) => (
                        <tr key={row.studentId}>
                          <td className="px-4 py-3 font-medium text-gray-800">{row.studentName}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                row.status === "Submitted"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {row.submittedAt ? new Date(row.submittedAt).toLocaleString("en-US") : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
