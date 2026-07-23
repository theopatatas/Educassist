"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/http/client";
import { FileText, Calendar, AlertTriangle, Plus, X, Clock, Users, ChevronDown } from "lucide-react";

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
  gradeLevel: string;
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
  gradeLevel?: string | null;
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

function formatClassOptionLabel(cls: TeacherClass) {
  const subject = cls.subjectName || "Subject";
  const gradeLevel = cls.gradeLevel || "Grade";
  const section = cls.name || "Section";
  return `${subject} - ${gradeLevel} - ${section}`;
}

function getTodayDateInputValue() {
  return new Date().toISOString().split("T")[0];
}

function combineExamLocation(building?: string, room?: string) {
  const cleanBuilding = (building || "").trim();
  const cleanRoom = (room || "").trim();
  if (cleanBuilding && cleanRoom) return `${cleanBuilding} - ${cleanRoom}`;
  return cleanBuilding || cleanRoom || "TBA";
}

function splitExamLocation(value?: string | null) {
  const raw = (value || "").trim();
  if (!raw || raw === "TBA") return { building: "", room: "" };
  const parts = raw.split(" - ");
  if (parts.length >= 2) {
    return {
      building: parts.slice(0, -1).join(" - ").trim(),
      room: parts[parts.length - 1].trim(),
    };
  }
  return { building: "", room: raw };
}

function isPastExamSchedule(date?: string, startTime?: string) {
  if (!date) return false;
  if (startTime?.trim()) {
    const scheduled = new Date(`${date}T${startTime.trim()}:00`);
    if (Number.isNaN(scheduled.getTime())) return true;
    return scheduled.getTime() < Date.now();
  }
  return date < getTodayDateInputValue();
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
    gradeLevel: exam.gradeLevel || "Grade",
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
  const [selectedSubject, setSelectedSubject] = useState(() => {
    if (typeof window === "undefined") return "All Subjects";
    return window.localStorage.getItem("teacher_selected_subject_exam") || "All Subjects";
  });
  const [selectedExam, setSelectedExam] = useState<TeacherExam | null>(null);

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [newExamDateError, setNewExamDateError] = useState("");
  const [editExamDateError, setEditExamDateError] = useState("");
  const [examToDelete, setExamToDelete] = useState<TeacherExam | null>(null);
  const [isDeletingExam, setIsDeletingExam] = useState(false);

  const [newExam, setNewExam] = useState({
    classId: "",
    title: "",
    date: "",
    startTime: "",
    duration: "60 mins",
    building: "",
    room: "",
    coverageText: "",
  });
  const [editExam, setEditExam] = useState({
    id: 0,
    title: "",
    date: "",
    startTime: "",
    duration: "60 mins",
    building: "",
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
  const subjectOptions = useMemo(() => {
    const uniq = new Set<string>();
    for (const cls of teacherClasses) {
      const subject = normalizeValue(cls.subjectName);
      if (subject) uniq.add(subject);
    }
    for (const exam of exams) {
      const subject = normalizeValue(exam.subject);
      if (subject) uniq.add(subject);
    }
    return ["All Subjects", ...Array.from(uniq)];
  }, [exams, teacherClasses]);
  const filteredExams = useMemo(() => {
    if (selectedSubject === "All Subjects") return exams;
    return exams.filter((exam) => exam.subject === selectedSubject);
  }, [exams, selectedSubject]);
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
      const mappedExams = examRows.map(mapApiExam);
      setTeacherClasses(classRows);
      setExams(mappedExams);
      return mappedExams;
    } catch {
      setSaveError("Failed to load exam data.");
      return [];
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
    window.localStorage.setItem("teacher_selected_subject_exam", selectedSubject);
  }, [selectedSubject]);
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
  useEffect(() => {
    if (!subjectOptions.includes(selectedSubject)) {
      setSelectedSubject("All Subjects");
    }
  }, [selectedSubject, subjectOptions]);
  useEffect(() => {
    if (!saveSuccess) return;
    const timer = window.setTimeout(() => setSaveSuccess(""), 2500);
    return () => window.clearTimeout(timer);
  }, [saveSuccess]);
  useEffect(() => {
    if (!saveError) return;
    const timer = window.setTimeout(() => setSaveError(""), 3000);
    return () => window.clearTimeout(timer);
  }, [saveError]);
  useEffect(() => {
    if (!scheduleError) return;
    const timer = window.setTimeout(() => setScheduleError(""), 3000);
    return () => window.clearTimeout(timer);
  }, [scheduleError]);

  const scheduledCount = useMemo(() => filteredExams.filter((e) => e.status === "Scheduled").length, [filteredExams]);

  const markCompleted = async (exam: TeacherExam) => {
    setSaveError("");
    setSaveSuccess("");
    setIsDeletingExam(true);
    try {
      const { data } = await api.delete(`/api/exams/${exam.id}`);
      setExams((prev) => prev.filter((item) => item.id !== exam.id));
      setSelectedExam((prev) => (prev?.id === exam.id ? null : prev));
      setExamToDelete(null);
      setSaveSuccess(data?.message || "Exam schedule marked as done and deleted successfully.");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as { message?: string })?.message ||
        "Failed to delete exam.";
      setSaveError(message);
    } finally {
      setIsDeletingExam(false);
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleError("");
    setSaveSuccess("");
    setNewExamDateError("");
    if (!selectedClass) {
      setScheduleError("Please select a class first.");
      return;
    }
    if (isPastExamSchedule(newExam.date, newExam.startTime)) {
      setNewExamDateError("You cannot create an exam schedule with a past date.");
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
        room: combineExamLocation(newExam.building, newExam.room),
        coverage,
      });

      await loadData();
      setIsScheduleOpen(false);
      setNewExam({ classId: "", title: "", date: "", startTime: "", duration: "60 mins", building: "", room: "", coverageText: "" });
      setSaveSuccess("Exam schedule created successfully.");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as { message?: string })?.message ||
        "Failed to schedule exam.";
      setScheduleError(message);
    }
  };

  const openEditExam = (exam: TeacherExam) => {
    const location = splitExamLocation(exam.room);
    setEditExam({
      id: exam.id,
      title: exam.title,
      date: exam.date,
      startTime: exam.startTime || "",
      duration: exam.duration,
      building: location.building,
      room: location.room,
      coverageText: (exam.coverage || []).join(", "),
      status: exam.status,
    });
    setIsEditOpen(true);
  };

  const handleEditExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    setSaveSuccess("");
    setEditExamDateError("");
    if (isPastExamSchedule(editExam.date, editExam.startTime)) {
      setEditExamDateError("You cannot create an exam schedule with a past date.");
      return;
    }
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
        room: combineExamLocation(editExam.building, editExam.room),
        status: editExam.status,
        coverage,
      });
      const refreshedExams = await loadData();
      const savedExam = refreshedExams.find((exam) => exam.id === editExam.id) ?? null;
      setIsEditOpen(false);
      setSelectedExam(savedExam);
      setSaveSuccess("Exam schedule updated successfully.");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as { message?: string })?.message ||
        "Failed to update exam.";
      setSaveError(message);
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Exam Schedule Teacher</h1>
          <p className="text-gray-500">Schedule exams.</p>

          <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-500">
            <span>
              Scheduled: <span className="font-semibold text-gray-700">{scheduledCount}</span>
            </span>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:flex-nowrap">
          <div className="relative min-w-[190px]">
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="h-10 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-10 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Select grade level"
            >
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          <div className="relative min-w-[180px]">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="h-10 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-10 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Select section"
            >
              {sectionOptions.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          <div className="relative min-w-[180px]">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="h-10 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-10 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Select subject"
            >
              {subjectOptions.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          <button
            onClick={() => {
              setScheduleError("");
              setIsScheduleOpen(true);
            }}
            className="flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700"
            type="button"
          >
            <Plus className="h-5 w-5" />
            Schedule Exam
          </button>
        </div>
      </div>

      {saveSuccess ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 transition-opacity duration-300">
          <span>{saveSuccess}</span>
          <button type="button" onClick={() => setSaveSuccess("")} className="text-green-700/70 transition-colors hover:text-green-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {saveError ? (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 transition-opacity duration-300">
          <span>{saveError}</span>
          <button type="button" onClick={() => setSaveError("")} className="text-red-700/70 transition-colors hover:text-red-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {isLoading ? <div className="mb-4 text-sm text-gray-500">Loading exams...</div> : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredExams.map((exam) => (
          <div
            key={exam.id}
            className="cursor-pointer rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
            onClick={() => setSelectedExam(exam)}
          >
            <div className="p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold text-white ${exam.color}`}>
                  {exam.subject}
                </span>
              </div>

              <h3 className="line-clamp-2 text-xl font-bold text-gray-800">{exam.title}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {exam.gradeLevel} • {exam.section}
              </p>

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
              </div>

              <div className="mt-6 flex gap-3 border-t border-gray-100 pt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExamToDelete(exam);
                  }}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                    exam.status === "Completed"
                      ? "bg-green-50 text-green-700 hover:bg-green-100"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                  type="button"
                >
                  {exam.status === "Completed" ? "Done" : "Mark as Done"}
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
                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-800">Coverage</p>
                  {(selectedExam.coverage || []).length ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
                      {(selectedExam.coverage || []).map((c, index) => (
                        <li key={`${c}-${index}`}>{c}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No coverage added yet.</p>
                  )}
                </div>

              </div>

              <div className="mt-6 flex gap-3">
                <button onClick={() => setSelectedExam(null)} className="flex-1 rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-600 transition-colors hover:bg-gray-50" type="button">Close</button>
                <button onClick={() => openEditExam(selectedExam)} className="flex-1 rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50" type="button">Edit Exam</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {examToDelete ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-full bg-amber-50 p-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Mark Exam as Done</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Mark this exam as done? This will permanently delete it from the system.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              This action will delete this exam schedule from the system.
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  if (isDeletingExam) return;
                  setExamToDelete(null);
                }}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                disabled={isDeletingExam}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void markCompleted(examToDelete)}
                className="flex-1 rounded-xl bg-red-600 py-2.5 font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDeletingExam}
              >
                {isDeletingExam ? "Deleting..." : "Mark as Done"}
              </button>
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
                      {formatClassOptionLabel(cls)}
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
                  <input
                    required
                    type="date"
                    value={newExam.date}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewExam({ ...newExam, date: value });
                      setNewExamDateError(
                        isPastExamSchedule(value, newExam.startTime) ? "You cannot create an exam schedule with a past date." : ""
                      );
                    }}
                    className={`w-full rounded-xl border px-4 py-2 outline-none focus:border-transparent focus:ring-2 ${
                      newExamDateError ? "border-red-300 focus:ring-red-100" : "border-gray-200 focus:ring-indigo-500"
                    }`}
                  />
                  {newExamDateError ? <p className="mt-1 text-xs text-red-600">{newExamDateError}</p> : null}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Start Time</label>
                  <input
                    type="time"
                    value={newExam.startTime}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewExam({ ...newExam, startTime: value });
                      setNewExamDateError(
                        isPastExamSchedule(newExam.date, value) ? "You cannot create an exam schedule with a past date." : ""
                      );
                    }}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Duration</label>
                <input required type="text" value={newExam.duration} onChange={(e) => setNewExam({ ...newExam, duration: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" placeholder="e.g. 90 mins" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Building</label>
                <input
                  type="text"
                  value={newExam.building}
                  onChange={(e) => setNewExam({ ...newExam, building: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Building 1"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Room</label>
                <input
                  type="text"
                  value={newExam.room}
                  onChange={(e) => setNewExam({ ...newExam, room: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="Room number"
                />
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
                  <input
                    required
                    type="date"
                    value={editExam.date}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEditExam({ ...editExam, date: value });
                      setEditExamDateError(
                        isPastExamSchedule(value, editExam.startTime) ? "You cannot create an exam schedule with a past date." : ""
                      );
                    }}
                    className={`w-full rounded-xl border px-4 py-2 outline-none focus:border-transparent focus:ring-2 ${
                      editExamDateError ? "border-red-300 focus:ring-red-100" : "border-gray-200 focus:ring-indigo-500"
                    }`}
                  />
                  {editExamDateError ? <p className="mt-1 text-xs text-red-600">{editExamDateError}</p> : null}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Start Time</label>
                  <input
                    type="time"
                    value={editExam.startTime}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEditExam({ ...editExam, startTime: value });
                      setEditExamDateError(
                        isPastExamSchedule(editExam.date, value) ? "You cannot create an exam schedule with a past date." : ""
                      );
                    }}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Duration</label>
                  <input required type="text" value={editExam.duration} onChange={(e) => setEditExam({ ...editExam, duration: e.target.value })} className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500" />
                </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Building</label>
                <input
                  type="text"
                  value={editExam.building}
                  onChange={(e) => setEditExam({ ...editExam, building: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Building 1"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Room</label>
                <input
                  type="text"
                  value={editExam.room}
                  onChange={(e) => setEditExam({ ...editExam, room: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="Room number"
                />
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
