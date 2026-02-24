"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/http/client";
import {
  Users,
  Clock,
  MapPin,
  MoreVertical,
  Plus,
  BookOpen,
  Calendar,
  ArrowRight,
  X,
  Trash2,
  Edit2,
} from "lucide-react";

type ApiClass = {
  id: number;
  name: string | null;
  gradeLevel: string | null;
  meetingDay: string | null;
  meetingTime: string | null;
  sectionName?: string | null;
  subjectName?: string | null;
  enrolledStudents?: number;
};

type ApiStudent = {
  id: number;
  firstName: string;
  lastName: string;
  lrn: string;
};

type ClassItem = {
  id: number;
  name: string;
  subject: string;
  gradeLevel: string;
  day: string;
  time: string;
  schedule: string;
  room: string;
  students: number;
  avgGrade: number;
  nextTopic: string;
};

const initialClasses: ClassItem[] = [];

function parseMeetingTime(rawValue: string | null | undefined) {
  const raw = rawValue?.trim() || "";
  if (!raw.includes("|")) return { time: raw, room: "" };

  const [partA, partB] = raw.split("|", 2).map((p) => p.trim());
  const aLooksLikeTime = /(:|am|pm)/i.test(partA);
  const bLooksLikeTime = /(:|am|pm)/i.test(partB);

  // Backward-compatible parser:
  // old format: time|room
  // new format: room|time
  if (aLooksLikeTime && !bLooksLikeTime) return { time: partA, room: partB };
  if (!aLooksLikeTime && bLooksLikeTime) return { time: partB, room: partA };

  return { time: partA, room: partB };
}

function encodeMeetingTime(time: string, room: string) {
  // Store room first so truncation (DB column limit) affects time, not room.
  return [room, time].filter(Boolean).join("|");
}

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>(initialClasses);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [selectedSection, setSelectedSection] = useState(() => {
    if (typeof window === "undefined") return "All Sections";
    return window.localStorage.getItem("teacher_selected_section") || "All Sections";
  });
  const [selectedGrade, setSelectedGrade] = useState(() => {
    if (typeof window === "undefined") return "All Grade Levels";
    return window.localStorage.getItem("teacher_selected_grade") || "All Grade Levels";
  });
  const [classStudents, setClassStudents] = useState<ApiStudent[]>([]);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  const [newClass, setNewClass] = useState({
    section: "",
    gradeLevel: "",
    subject: "",
    day: "",
    time: "",
    room: "",
  });
  const [editClass, setEditClass] = useState({
    id: 0,
    section: "",
    gradeLevel: "",
    subject: "",
    day: "",
    time: "",
    room: "",
  });

  useEffect(() => {
    window.localStorage.setItem("teacher_selected_section", selectedSection);
  }, [selectedSection]);
  useEffect(() => {
    window.localStorage.setItem("teacher_selected_grade", selectedGrade);
  }, [selectedGrade]);

  const mapApiClassToCard = (cls: ApiClass): ClassItem => {
    const rawName = cls.name?.trim() || "";
    const normalized = rawName.toLowerCase();
    const subjectNames = ["science", "mathematics", "math", "english", "filipino", "mapeh", "ap", "tle", "values"];
    const looksLikeSubject =
      subjectNames.includes(normalized) ||
      subjectNames.some((s) => normalized.startsWith(`${s} `) || normalized.endsWith(` ${s}`));

    const { time: timePart, room: roomPart } = parseMeetingTime(cls.meetingTime);
    const scheduleParts = [cls.meetingDay, timePart].filter(Boolean).join(" ").trim();
    const classTitle = !looksLikeSubject && rawName ? rawName : cls.gradeLevel?.trim() || `Class ${cls.id}`;
    const subject = cls.subjectName?.trim() || (looksLikeSubject ? rawName : "No subject");

    return {
      id: Number(cls.id),
      name: classTitle,
      subject,
      gradeLevel: cls.gradeLevel?.trim() || "Not set",
      day: cls.meetingDay?.trim() || "",
      time: timePart,
      schedule: scheduleParts || "TBA",
      room: roomPart || "TBA",
      students: Number(cls.enrolledStudents ?? 0),
      avgGrade: 0,
      nextTopic: "Not set",
    };
  };

  const openEditModal = (cls: ClassItem) => {
    setEditClass({
      id: cls.id,
      section: cls.name,
      gradeLevel: cls.gradeLevel === "Not set" ? "" : cls.gradeLevel,
      subject: cls.subject === "No subject" ? "" : cls.subject,
      day: cls.day,
      time: cls.time,
      room: cls.room === "TBA" ? "" : cls.room,
    });
    setIsEditModalOpen(true);
  };

  const openClassDetails = (cls: ClassItem) => {
    setIsStudentsLoading(true);
    setClassStudents([]);
    setSelectedClass(cls);
  };

  const closeClassDetails = () => {
    setSelectedClass(null);
    setClassStudents([]);
    setIsStudentsLoading(false);
  };

  useEffect(() => {
    let active = true;
    api
      .get("/api/classes/me")
      .then(async ({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data?.classes) ? (data.classes as ApiClass[]) : [];
        const mapped = rows.map(mapApiClassToCard);
        setClasses(mapped);

        // Fallback: always refresh student counts from roster endpoint so card counts
        // stay correct even if /api/classes/me does not include enrolledStudents.
        const counts = await Promise.all(
          mapped.map(async (cls) => {
            try {
              const res = await api.get(`/api/classes/${cls.id}/students`);
              const students = Array.isArray(res.data?.students) ? (res.data.students as ApiStudent[]) : [];
              return { id: cls.id, count: students.length };
            } catch {
              return { id: cls.id, count: cls.students };
            }
          })
        );
        if (!active) return;
        const countMap = new Map(counts.map((item) => [item.id, item.count]));
        setClasses((prev) =>
          prev.map((cls) => ({
            ...cls,
            students: countMap.get(cls.id) ?? cls.students,
          }))
        );
      })
      .catch(() => {
        if (active) setSaveError("Failed to load classes.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");

    api
      .post("/api/classes/me", {
        className: newClass.section || null,
        gradeLevel: newClass.gradeLevel || null,
        subjectName: newClass.subject || null,
        meetingDay: newClass.day || null,
        meetingTime: encodeMeetingTime(newClass.time, newClass.room) || null,
      })
      .then(({ data }) => {
        const created = data?.class as ApiClass | undefined;
        if (created?.id) {
          setClasses((prev) => [
            mapApiClassToCard({
              ...created,
              subjectName: created.subjectName ?? (newClass.subject || null),
            }),
            ...prev,
          ]);
        } else {
          const fallback: ClassItem = {
            id: classes.length + 1,
            name: newClass.section,
            subject: newClass.subject || "No subject",
            gradeLevel: newClass.gradeLevel || "Not set",
            day: newClass.day,
            time: newClass.time,
            schedule: [newClass.day, newClass.time].filter(Boolean).join(" "),
            room: newClass.room || "TBA",
            students: 0,
            avgGrade: 0,
            nextTopic: "Not set",
          };
          setClasses((prev) => [fallback, ...prev]);
        }
        setIsAddModalOpen(false);
        setNewClass({
          section: "",
          gradeLevel: "",
          subject: "",
          day: "",
          time: "",
          room: "",
        });
      })
      .catch((err: unknown) => {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to save class.";
        setSaveError(message);
      });
  };

  const handleDeleteClass = async (id: number) => {
    if (!confirm("Are you sure you want to delete this class?")) return;
    setSaveError("");
    try {
      await api.delete(`/api/classes/${id}`);
      setClasses((prev) => prev.filter((c) => c.id !== id));
      closeClassDetails();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to delete class.";
      setSaveError(message);
    }
  };

  useEffect(() => {
    if (!selectedClass) return;
    let active = true;
    api
      .get(`/api/classes/${selectedClass.id}/students`)
      .then(({ data }) => {
        if (!active) return;
        const students = Array.isArray(data?.students) ? (data.students as ApiStudent[]) : [];
        setClassStudents(students);
        setClasses((prev) =>
          prev.map((c) => (c.id === selectedClass.id ? { ...c, students: students.length } : c))
        );
        setSelectedClass((prev) => (prev ? { ...prev, students: students.length } : prev));
      })
      .catch(() => {
        if (active) setClassStudents([]);
      })
      .finally(() => {
        if (active) setIsStudentsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedClass]);

  const handleEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    try {
      const { data } = await api.patch(`/api/classes/${editClass.id}`, {
        className: editClass.section || null,
        gradeLevel: editClass.gradeLevel || null,
        subjectName: editClass.subject || null,
        meetingDay: editClass.day || null,
        meetingTime: encodeMeetingTime(editClass.time, editClass.room) || null,
      });
      const updatedApiClass = data?.class as ApiClass | undefined;
      const updatedClass = updatedApiClass
        ? mapApiClassToCard({
            ...updatedApiClass,
            subjectName: updatedApiClass.subjectName ?? (selectedClass?.subject || null),
          })
        : {
            id: editClass.id,
            name: editClass.section,
            subject: editClass.subject || selectedClass?.subject || "No subject",
            gradeLevel: editClass.gradeLevel || "Not set",
            day: editClass.day,
            time: editClass.time,
            schedule: [editClass.day, editClass.time].filter(Boolean).join(" "),
            room: editClass.room || "TBA",
            students: 0,
            avgGrade: 0,
            nextTopic: "Not set",
          };

      setClasses((prev) => prev.map((c) => (c.id === editClass.id ? updatedClass : c)));
      setSelectedClass(updatedClass);
      setIsEditModalOpen(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to update class.";
      setSaveError(message);
    }
  };

  const sectionOptions = useMemo(() => {
    const uniq = new Set<string>();
    for (const cls of classes) {
      const section = cls.name?.trim();
      if (section) uniq.add(section);
    }
    return ["All Sections", ...Array.from(uniq)];
  }, [classes]);
  const gradeOptions = useMemo(() => {
    const uniq = new Map<string, string>();
    for (const cls of classes) {
      const grade = cls.gradeLevel?.trim();
      if (!grade || grade === "Not set") continue;
      const key = grade.toLowerCase().replace(/\s+/g, " ").trim();
      if (!uniq.has(key)) uniq.set(key, grade);
    }
    return ["All Grade Levels", ...Array.from(uniq.values())];
  }, [classes]);

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const matchesSection = selectedSection === "All Sections" || c.name === selectedSection;
      const matchesGrade = selectedGrade === "All Grade Levels" || c.gradeLevel === selectedGrade;
      return matchesSection && matchesGrade;
    });
  }, [classes, selectedGrade, selectedSection]);

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Classes</h1>
          <p className="text-gray-500">Manage your sections and schedules</p>
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
            onClick={() => setIsAddModalOpen(true)}
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-5 w-5" />
            Add New Class
          </button>
        </div>
      </div>
      {saveError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</div>
      ) : null}
      {isLoading ? <div className="mb-4 text-sm text-gray-500">Loading classes...</div> : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredClasses.map((cls) => (
          <div
            key={cls.id}
            onClick={() => openClassDetails(cls)}
            className="group cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
          >
            <div className="h-2 w-full bg-gray-800" />
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{cls.subject}</span>
                <button className="text-gray-400 hover:text-gray-600" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>

              <h3 className="mb-1 text-xl font-bold text-gray-800">{cls.name}</h3>
              <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="h-4 w-4" />
                <span>{cls.room}</span>
              </div>

              <div className="mb-6 space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <span className="font-medium">{cls.day || "TBA"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                    <Clock className="h-4 w-4" />
                  </div>
                  <span className="font-medium">{cls.time || "TBA"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="font-medium">{cls.students} Students</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Next: {cls.nextTopic}</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <div className="text-xs text-gray-500">Learner preview unavailable</div>
                <button
                  className="flex items-center gap-1 text-sm font-semibold text-indigo-600 transition-colors duration-300 group-hover:translate-x-1 hover:text-indigo-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  View Class <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 p-6 text-gray-400 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 transition-colors">
            <Calendar className="h-8 w-8" />
          </div>
          <span className="mb-1 text-lg font-bold">Schedule New Class</span>
          <span className="text-sm text-gray-400">Add a new section to your load</span>
        </button>
      </div>
      {!isLoading && filteredClasses.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          {selectedSection === "All Sections" && selectedGrade === "All Grade Levels"
            ? "No classes yet."
            : "No classes for selected filters."}
        </div>
      ) : null}

      {selectedClass ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={closeClassDetails}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <div className="bg-gray-800 p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-lg bg-white/20 px-2 py-1 text-xs font-bold backdrop-blur-sm">
                      {selectedClass.subject}
                    </span>
                    <span className="flex items-center gap-1 rounded-lg bg-white/20 px-2 py-1 text-xs font-bold backdrop-blur-sm">
                      <Clock className="h-3 w-3" /> {selectedClass.schedule}
                    </span>
                    <span className="rounded-lg bg-white/20 px-2 py-1 text-xs font-bold backdrop-blur-sm">
                      {selectedClass.gradeLevel}
                    </span>
                  </div>
                  <h2 className="mb-1 text-3xl font-bold">{selectedClass.name}</h2>
                  <p className="flex items-center gap-2 opacity-90">
                    <MapPin className="h-4 w-4" /> {selectedClass.room}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(selectedClass)}
                    className="rounded-xl bg-white/20 p-2 transition-colors hover:bg-white/30"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteClass(selectedClass.id)}
                    className="rounded-xl bg-white/20 p-2 transition-colors hover:bg-white/30"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={closeClassDetails}
                    className="rounded-xl bg-white/20 p-2 transition-colors hover:bg-white/30"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto p-6">
              <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-bold uppercase text-gray-500">Students</p>
                  <p className="text-2xl font-bold text-gray-800">{selectedClass.students}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-bold uppercase text-gray-500">Class Average</p>
                  <p className="text-2xl font-bold text-gray-800">{selectedClass.avgGrade}%</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-bold uppercase text-gray-500">Attendance</p>
                  <p className="text-2xl font-bold text-gray-800">-</p>
                </div>
              </div>

              <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-800">
                <Users className="h-5 w-5 text-gray-500" /> Student Roster
              </h3>
              <div className="space-y-2">
                {isStudentsLoading ? (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
                    Loading students...
                  </div>
                ) : classStudents.length === 0 ? (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
                    No students enrolled yet.
                  </div>
                ) : (
                  classStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {student.lastName}, {student.firstName}
                        </p>
                        <p className="text-xs text-gray-500">LRN: {student.lrn}</p>
                      </div>
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                        Enrolled
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isEditModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800">Edit Class</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditClass} className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Grade Level</label>
                <input
                  required
                  type="text"
                  value={editClass.gradeLevel}
                  onChange={(e) => setEditClass({ ...editClass, gradeLevel: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter grade level"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Section</label>
                <input
                  required
                  type="text"
                  value={editClass.section}
                  onChange={(e) => setEditClass({ ...editClass, section: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter section"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
                <select
                  value={editClass.subject}
                  onChange={(e) => setEditClass({ ...editClass, subject: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select subject</option>
                  <option value="Math">Math</option>
                  <option value="Science">Science</option>
                  <option value="Filipino">Filipino</option>
                  <option value="Aralin Panlipunan">Aralin Panlipunan</option>
                  <option value="PE">PE</option>
                  <option value="ESP">ESP</option>
                  <option value="Mapeh">Mapeh</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Day</label>
                <input
                  required
                  type="text"
                  value={editClass.day}
                  onChange={(e) => setEditClass({ ...editClass, day: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter day"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Time</label>
                <input
                  required
                  type="text"
                  value={editClass.time}
                  onChange={(e) => setEditClass({ ...editClass, time: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter time"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Room</label>
                <input
                  required
                  type="text"
                  value={editClass.room}
                  onChange={(e) => setEditClass({ ...editClass, room: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter room"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isAddModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800">Add New Class</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddClass} className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Grade Level</label>
                <input
                  required
                  type="text"
                  value={newClass.gradeLevel}
                  onChange={(e) => setNewClass({ ...newClass, gradeLevel: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter grade level"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Section</label>
                <input
                  required
                  type="text"
                  value={newClass.section}
                  onChange={(e) => setNewClass({ ...newClass, section: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter section"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
                <select
                  value={newClass.subject}
                  onChange={(e) => setNewClass({ ...newClass, subject: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select subject</option>
                  <option value="Math">Math</option>
                  <option value="Science">Science</option>
                  <option value="Filipino">Filipino</option>
                  <option value="Aralin Panlipunan">Aralin Panlipunan</option>
                  <option value="PE">PE</option>
                  <option value="ESP">ESP</option>
                  <option value="Mapeh">Mapeh</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Room</label>
                <input
                  required
                  type="text"
                  value={newClass.room}
                  onChange={(e) => setNewClass({ ...newClass, room: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter room"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Day</label>
                <input
                  required
                  type="text"
                  value={newClass.day}
                  onChange={(e) => setNewClass({ ...newClass, day: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter day"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Time</label>
                <input
                  required
                  type="text"
                  value={newClass.time}
                  onChange={(e) => setNewClass({ ...newClass, time: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter time"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700"
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
