"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/http/client";
import { FileText, Calendar, AlertTriangle, Plus, X, Clock, Users, ClipboardList } from "lucide-react";

type ExamStatus = "Scheduled" | "Completed" | "Drafting";
type GradingStatus = "Not Started" | "In Progress" | "Done";

type TeacherExam = {
  id: number;
  subject: string;
  title: string;
  date: string;
  startTime: string;
  duration: string;
  status: ExamStatus;
  color: string;
  room: string;
  coverage: string[];
  section: string;
  students: number;
  submissions?: { submitted: number; total: number };
  gradingStatus: GradingStatus;
  publishResults: boolean;
};

type ApiExam = {
  id: number;
  title: string;
  examDate: string;
  startTime?: string | null;
  duration: string;
  status: ExamStatus;
  room: string | null;
  gradingStatus: GradingStatus;
  publishResults: boolean;
  color?: string;
  subjectName?: string | null;
  sectionName?: string | null;
  coverage?: string[];
  students?: number;
  submissions?: { submitted: number; total: number };
};

type TeacherClass = {
  id: number;
  name: string | null;
  gradeLevel: string | null;
  subjectName?: string | null;
  enrolledStudents?: number;
};

function normalizeValue(value?: string | null) {
  return (value || "").trim();
}

function statusPill(status: ExamStatus) {
  if (status === "Scheduled") return "bg-amber-100 text-amber-700";
  if (status === "Completed") return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-600";
}

function gradingPill(status: TeacherExam["gradingStatus"]) {
  if (status === "Done") return "bg-green-100 text-green-700";
  if (status === "In Progress") return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-600";
}

function mapApiExam(exam: ApiExam): TeacherExam {
  return {
    id: Number(exam.id),
    subject: exam.subjectName || "Subject",
    title: exam.title,
    date: exam.examDate,
    startTime: exam.startTime || "",
    duration: exam.duration,
    status: exam.status,
    color: exam.color || "bg-blue-500",
    room: exam.room || "TBA",
    coverage: Array.isArray(exam.coverage) ? exam.coverage : [],
    section: exam.sectionName || "Section",
    students: Number(exam.students ?? exam.submissions?.total ?? 0),
    submissions: {
      submitted: Number(exam.submissions?.submitted ?? 0),
      total: Number(exam.submissions?.total ?? exam.students ?? 0),
    },
    gradingStatus: exam.gradingStatus || "Not Started",
    publishResults: !!exam.publishResults,
  };
}

export default function TeacherExamHallPage() {
  const [exams, setExams] = useState<TeacherExam[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [selectedSection, setSelectedSection] = useState(() => {
    if (typeof window === "undefined") return "All Sections";
    return window.localStorage.getItem("teacher_selected_section") || "All Sections";
  });
  const [selectedGrade, setSelectedGrade] = useState(() => {
    if (typeof window === "undefined") return "All Grade Levels";
    return window.localStorage.getItem("teacher_selected_grade") || "All Grade Levels";
  });
  const [selectedExam, setSelectedExam] = useState<TeacherExam | null>(null);

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [scheduleError, setScheduleError] = useState("");

  const [newExam, setNewExam] = useState({
    classId: "",
    title: "",
    date: "",
    startTime: "",
    duration: "60 mins",
    room: "",
    coverageText: "",
    status: "Scheduled" as ExamStatus,
  });
  const [editExam, setEditExam] = useState({
    id: 0,
    title: "",
    date: "",
    startTime: "",
    duration: "60 mins",
    room: "",
    coverageText: "",
    status: "Scheduled" as ExamStatus,
  });

  const selectedClass = useMemo(
    () => teacherClasses.find((c) => Number(c.id) === Number(newExam.classId)) ?? null,
    [teacherClasses, newExam.classId]
  );
  const sectionOptions = useMemo(() => {
    const uniq = new Set<string>();
    for (const cls of teacherClasses) {
      const section = normalizeValue(cls.name);
      if (section) uniq.add(section);
    }
    for (const e of exams) {
      const section = normalizeValue(e.section);
      if (section) uniq.add(section);
    }
    return ["All Sections", ...Array.from(uniq)];
  }, [exams, teacherClasses]);
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
  const filteredExams = useMemo(() => exams, [exams]);
  const filteredTeacherClasses = useMemo(() => {
    return teacherClasses.filter((c) => {
      const section = normalizeValue(c.name);
      const grade = normalizeValue(c.gradeLevel);
      const matchesSection = selectedSection === "All Sections" || section === selectedSection;
      const matchesGrade = selectedGrade === "All Grade Levels" || grade === selectedGrade;
      return matchesSection && matchesGrade;
    });
  }, [teacherClasses, selectedGrade, selectedSection]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setSaveError("");
    try {
      const [classesRes, examsRes] = await Promise.all([
        api.get("/api/classes/me"),
        api.get("/api/exams/me", {
          params: {
            section: selectedSection,
            gradeLevel: selectedGrade,
          },
        }),
      ]);
      const classRows = Array.isArray(classesRes.data?.classes) ? (classesRes.data.classes as TeacherClass[]) : [];
      const examRows = Array.isArray(examsRes.data?.exams) ? (examsRes.data.exams as ApiExam[]) : [];
      setTeacherClasses(classRows);
      setExams(examRows.map(mapApiExam));
    } catch {
      setSaveError("Failed to load exam data.");
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

  const scheduledCount = useMemo(() => filteredExams.filter((e) => e.status === "Scheduled").length, [filteredExams]);
  const draftingCount = useMemo(() => filteredExams.filter((e) => e.status === "Drafting").length, [filteredExams]);

  const togglePublish = async (id: number) => {
    const exam = exams.find((e) => e.id === id);
    if (!exam) return;
    try {
      await api.patch(`/api/exams/${id}`, { publishResults: !exam.publishResults });
      await loadData();
      setSelectedExam((prev) => (prev && prev.id === id ? { ...prev, publishResults: !prev.publishResults } : prev));
    } catch {
      setSaveError("Failed to update publish status.");
    }
  };

  const markCompleted = async (id: number) => {
    try {
      await api.patch(`/api/exams/${id}`, { status: "Completed" });
      await loadData();
      setSelectedExam((prev) => (prev && prev.id === id ? { ...prev, status: "Completed" } : prev));
    } catch {
      setSaveError("Failed to mark exam as completed.");
    }
  };

  const setGradingStatus = async (id: number, gradingStatus: TeacherExam["gradingStatus"]) => {
    try {
      await api.patch(`/api/exams/${id}`, { gradingStatus });
      await loadData();
      setSelectedExam((prev) => (prev && prev.id === id ? { ...prev, gradingStatus } : prev));
    } catch {
      setSaveError("Failed to update grading status.");
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleError("");
    if (!selectedClass) {
      setScheduleError("Please select a class first.");
      return;
    }

    const subject = selectedClass.subjectName?.trim() || "Subject";

    try {
      const coverage = newExam.coverageText
        .split(/\n|,/)
        .map((x) => x.trim())
        .filter(Boolean);
      await api.post("/api/exams/me", {
        classId: Number(newExam.classId),
        title: newExam.title || `${subject} Exam`,
        date: newExam.date,
        startTime: newExam.startTime,
        duration: newExam.duration,
        status: newExam.status,
        room: newExam.room || "TBA",
        coverage,
      });

      await loadData();
      setIsScheduleOpen(false);
      setNewExam({ classId: "", title: "", date: "", startTime: "", duration: "60 mins", room: "", coverageText: "", status: "Scheduled" });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to schedule exam.";
      setScheduleError(message);
    }
  };

  const openEditExam = (exam: TeacherExam) => {
    setEditExam({
      id: exam.id,
      title: exam.title,
      date: exam.date,
      startTime: exam.startTime || "",
      duration: exam.duration,
      room: exam.room === "TBA" ? "" : exam.room,
      coverageText: (exam.coverage || []).join(", "),
      status: exam.status,
    });
    setIsEditOpen(true);
  };

  const handleEditExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    try {
      const coverage = editExam.coverageText
        .split(/\n|,/)
        .map((x) => x.trim())
        .filter(Boolean);
      await api.patch(`/api/exams/${editExam.id}`, {
        title: editExam.title,
        date: editExam.date,
        startTime: editExam.startTime,
        duration: editExam.duration,
        room: editExam.room || "TBA",
        status: editExam.status,
        coverage,
      });
      await loadData();
      setIsEditOpen(false);
      setSelectedExam((prev) =>
        prev && prev.id === editExam.id
          ? {
              ...prev,
              title: editExam.title,
              date: editExam.date,
              startTime: editExam.startTime,
              duration: editExam.duration,
              room: editExam.room || "TBA",
              status: editExam.status,
              coverage,
            }
          : prev
      );
    } catch {
      setSaveError("Failed to update exam.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Exam Hall (Teacher)</h1>
          <p className="text-gray-500">Schedule exams, track submissions, and manage grading.</p>

          <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-500">
            <span>
              Scheduled: <span className="font-semibold text-gray-700">{scheduledCount}</span>
            </span>
            <span className="text-gray-300">•</span>
            <span>
              Drafting: <span className="font-semibold text-gray-700">{draftingCount}</span>
            </span>
          </div>
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
            onClick={() => {
              setScheduleError("");
              setIsScheduleOpen(true);
            }}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700"
            type="button"
          >
            <Plus className="h-5 w-5" />
            Schedule Exam
          </button>
        </div>
      </div>

      {saveError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</div>
      ) : null}
      {isLoading ? <div className="mb-4 text-sm text-gray-500">Loading exams...</div> : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredExams.map((exam) => (
          <div
            key={exam.id}
            className="cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
            onClick={() => setSelectedExam(exam)}
          >
            <div className={`h-3 ${exam.color}`} />
            <div className="p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${exam.color}`}>
                  {exam.subject}
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusPill(exam.status)}`}>
                    {exam.status}
                  </span>
                  <span className={`rounded-md px-2 py-1 text-xs font-semibold ${gradingPill(exam.gradingStatus)}`}>
                    {exam.gradingStatus}
                  </span>
                </div>
              </div>

              <h3 className="line-clamp-2 text-xl font-bold text-gray-800">{exam.title}</h3>
              <p className="mt-1 text-sm text-gray-500">{exam.section}</p>

              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{exam.date}{exam.startTime ? ` • ${exam.startTime}` : ""}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>{exam.duration}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span>{exam.room}</span>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>{exam.students} students</span>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <ClipboardList className="h-4 w-4 text-gray-400" />
                      Submissions
                    </span>
                    <span className="text-gray-700">
                      {exam.submissions?.submitted ?? 0}/{exam.submissions?.total ?? exam.students}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{
                        width: `${
                          (exam.submissions?.total ?? exam.students)
                            ? Math.round(
                                ((exam.submissions?.submitted ?? 0) /
                                  (exam.submissions?.total ?? exam.students)) *
                                  100
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3 border-t border-gray-100 pt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void togglePublish(exam.id);
                  }}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                    exam.publishResults ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                  type="button"
                >
                  {exam.publishResults ? "Results Published" : "Publish Results"}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedExam(exam);
                  }}
                  className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                  type="button"
                >
                  Manage
                </button>
              </div>
            </div>
          </div>
        ))}

      </div>
      {!isLoading && filteredExams.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          {selectedSection === "All Sections" && selectedGrade === "All Grade Levels"
            ? "No exams available yet."
            : "No exams for selected filters."}
        </div>
      ) : null}

      {selectedExam ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setSelectedExam(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className={`h-4 ${selectedExam.color}`} />

            <div className="p-6">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <span className="text-sm font-bold uppercase tracking-wider text-gray-500">{selectedExam.subject} • {selectedExam.section}</span>
                  <h2 className="mt-1 text-2xl font-bold text-gray-800">{selectedExam.title}</h2>
                </div>

                <button onClick={() => setSelectedExam(null)} className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100" type="button">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-8 grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-gray-400">Date</p>
                      <p className="font-medium text-gray-800">
                        {selectedExam.date}
                        {selectedExam.startTime ? ` • ${selectedExam.startTime}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-gray-400">Duration</p>
                      <p className="font-medium text-gray-800">{selectedExam.duration}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-gray-400">Room</p>
                      <p className="font-medium text-gray-800">{selectedExam.room}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-gray-400">Exam Status</p>
                      <p className="font-medium text-gray-800">{selectedExam.status}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <h3 className="mb-3 font-bold text-gray-800">Teacher Controls</h3>

                <div className="mb-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void setGradingStatus(selectedExam.id, "Not Started")} className="rounded-xl border px-3 py-2 text-sm hover:bg-white">Grading: Not Started</button>
                  <button type="button" onClick={() => void setGradingStatus(selectedExam.id, "In Progress")} className="rounded-xl border px-3 py-2 text-sm hover:bg-white">Grading: In Progress</button>
                  <button type="button" onClick={() => void setGradingStatus(selectedExam.id, "Done")} className="rounded-xl border px-3 py-2 text-sm hover:bg-white">Grading: Done</button>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-gray-600">
                    Submissions: <span className="font-semibold text-gray-800">{selectedExam.submissions?.submitted ?? 0}/{selectedExam.submissions?.total ?? selectedExam.students}</span>
                  </div>

                  <button type="button" onClick={() => void togglePublish(selectedExam.id)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${selectedExam.publishResults ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>
                    {selectedExam.publishResults ? "Unpublish Results" : "Publish Results"}
                  </button>
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-sm font-semibold text-gray-800">Coverage</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
                    {(selectedExam.coverage || []).map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button onClick={() => setSelectedExam(null)} className="flex-1 rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-600 transition-colors hover:bg-gray-50" type="button">Close</button>
                <button onClick={() => openEditExam(selectedExam)} className="flex-1 rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50" type="button">Edit Exam</button>
                <button onClick={() => void markCompleted(selectedExam.id)} className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700" type="button">Mark Exam as Completed</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isScheduleOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800">Schedule Exam</h2>
              <button onClick={() => setIsScheduleOpen(false)} className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100" type="button">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSchedule} className="space-y-4 p-6">
              {scheduleError ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{scheduleError}</div> : null}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Class</label>
                <select required value={newExam.classId} onChange={(e) => setNewExam({ ...newExam, classId: e.target.value })} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select class</option>
                  {filteredTeacherClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {(cls.subjectName || "Subject") + " - " + (cls.name || cls.gradeLevel || `Class ${cls.id}`)}
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
                  <p className="text-sm font-medium text-gray-800">{selectedClass?.name || "—"}</p>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Exam Title</label>
                <input type="text" value={newExam.title} onChange={(e) => setNewExam({ ...newExam, title: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" placeholder="e.g. First Quarter Exam" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
                  <input required type="date" value={newExam.date} onChange={(e) => setNewExam({ ...newExam, date: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Start Time</label>
                  <input type="time" value={newExam.startTime} onChange={(e) => setNewExam({ ...newExam, startTime: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Duration</label>
                <input required type="text" value={newExam.duration} onChange={(e) => setNewExam({ ...newExam, duration: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" placeholder="e.g. 90 mins" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Room / Venue</label>
                <input type="text" value={newExam.room} onChange={(e) => setNewExam({ ...newExam, room: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Room 305 / Google Form" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Coverage</label>
                <textarea
                  rows={3}
                  value={newExam.coverageText}
                  onChange={(e) => setNewExam({ ...newExam, coverageText: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter topics separated by comma or new line"
                />
                <p className="mt-1 text-xs text-gray-500">This will be shown to students for review.</p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                <select value={newExam.status} onChange={(e) => setNewExam({ ...newExam, status: e.target.value as ExamStatus })} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500">
                  <option value="Scheduled">Scheduled</option>
                  <option value="Drafting">Drafting</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsScheduleOpen(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-600 transition-colors hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700">Schedule</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800">Edit Exam</h2>
              <button onClick={() => setIsEditOpen(false)} className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100" type="button">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditExam} className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Exam Title</label>
                <input required type="text" value={editExam.title} onChange={(e) => setEditExam({ ...editExam, title: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
                  <input required type="date" value={editExam.date} onChange={(e) => setEditExam({ ...editExam, date: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Start Time</label>
                  <input type="time" value={editExam.startTime} onChange={(e) => setEditExam({ ...editExam, startTime: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Duration</label>
                  <input required type="text" value={editExam.duration} onChange={(e) => setEditExam({ ...editExam, duration: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" />
                </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Room / Venue</label>
                <input type="text" value={editExam.room} onChange={(e) => setEditExam({ ...editExam, room: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                <select value={editExam.status} onChange={(e) => setEditExam({ ...editExam, status: e.target.value as ExamStatus })} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500">
                  <option value="Scheduled">Scheduled</option>
                  <option value="Drafting">Drafting</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Coverage</label>
                <textarea rows={3} value={editExam.coverageText} onChange={(e) => setEditExam({ ...editExam, coverageText: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" placeholder="Enter topics separated by comma or new line" />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-600 transition-colors hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
