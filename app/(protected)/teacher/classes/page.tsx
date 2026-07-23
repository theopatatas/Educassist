"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/http/client";
import {
  Users,
  Clock,
  MapPin,
  Plus,
  Calendar,
  X,
  Trash2,
  Edit2,
} from "lucide-react";

type ApiClass = {
  id: number;
  name: string | null;
  gradeLevel: string | null;
  buildingName?: string | null;
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

type ClassFormSection = {
  id: number;
  name: string;
};

const WEEKDAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

type ClassItem = {
  id: number;
  name: string;
  subject: string;
  gradeLevel: string;
  building: string;
  day: string;
  time: string;
  schedule: string;
  room: string;
  students: number;
  avgGrade: number;
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

function formatTimeForDisplay(value: string) {
  if (!value) return "";
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function formatClassTimeRange(startTime: string, endTime: string) {
  if (!startTime || !endTime) return startTime || endTime || "";
  return `${formatTimeForDisplay(startTime)} - ${formatTimeForDisplay(endTime)}`;
}

function parseDisplayTimeToInput(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "";
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const suffix = match[3].toUpperCase();
  if (suffix === "PM" && hours !== 12) hours += 12;
  if (suffix === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseStoredClassTimeRange(value: string) {
  const [startRaw = "", endRaw = ""] = value.split(" - ").map((part) => part.trim());
  return {
    startTime: parseDisplayTimeToInput(startRaw),
    endTime: parseDisplayTimeToInput(endRaw),
  };
}

function parseMeetingDays(value?: string | null) {
  return String(value ?? "")
    .split(",")
    .map((day) => day.trim())
    .filter((day): day is (typeof WEEKDAY_OPTIONS)[number] => WEEKDAY_OPTIONS.includes(day as (typeof WEEKDAY_OPTIONS)[number]));
}

function formatMeetingDays(value?: string | null) {
  const days = parseMeetingDays(value);
  return days.length ? days.join(", ") : "";
}

function formatGradeSection(gradeLevel?: string | null, section?: string | null) {
  const grade = (gradeLevel || "").trim();
  const sectionName = (section || "").trim();
  if (grade && sectionName) return `${grade} • ${sectionName}`;
  return grade || sectionName || "Not set";
}

function getDefaultGradeLevels() {
  return ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
}

function normalizeGradeLabel(value: string) {
  const match = value.trim().match(/(\d+)/);
  return match ? `Grade ${match[1]}` : value.trim();
}

function sortGradeLevels(levels: string[]) {
  return [...levels]
    .map(normalizeGradeLabel)
    .filter(Boolean)
    .sort((a, b) => {
      const aNum = Number(a.match(/(\d+)/)?.[1] ?? Number.MAX_SAFE_INTEGER);
      const bNum = Number(b.match(/(\d+)/)?.[1] ?? Number.MAX_SAFE_INTEGER);
      return aNum - bNum || a.localeCompare(b);
    });
}

function toggleSelectedDay(current: string[], day: string) {
  return current.includes(day) ? current.filter((item) => item !== day) : [...current, day];
}

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>(initialClasses);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
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
  const [availableGradeLevels, setAvailableGradeLevels] = useState<string[]>(getDefaultGradeLevels());
  const [availableSections, setAvailableSections] = useState<ClassFormSection[]>([]);
  const [newClass, setNewClass] = useState({
    section: "",
    gradeLevel: "",
    subject: "",
    building: "",
    days: [] as string[],
    startTime: "",
    endTime: "",
    room: "",
  });
  const [editClass, setEditClass] = useState({
    id: 0,
    section: "",
    gradeLevel: "",
    subject: "",
    building: "",
    days: [] as string[],
    startTime: "",
    endTime: "",
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
      building: cls.buildingName?.trim() || "Not set",
      day: formatMeetingDays(cls.meetingDay) || "",
      time: timePart,
      schedule: scheduleParts || "TBA",
      room: roomPart || "TBA",
      students: Number(cls.enrolledStudents ?? 0),
      avgGrade: 0,
    };
  };

  const openEditModal = (cls: ClassItem) => {
    const { startTime, endTime } = parseStoredClassTimeRange(cls.time);
    setEditClass({
      id: cls.id,
      section: cls.name,
      gradeLevel: cls.gradeLevel === "Not set" ? "" : cls.gradeLevel,
      subject: cls.subject === "No subject" ? "" : cls.subject,
      building: cls.building === "Not set" ? "" : cls.building,
      days: parseMeetingDays(cls.day),
      startTime,
      endTime,
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
    setIsDeleteModalOpen(false);
    setDeletePassword("");
    setDeleteError("");
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

  useEffect(() => {
    let active = true;

    api
      .get("/api/classes/meta/me")
      .then(({ data }) => {
        if (!active) return;
        const gradeLevels = Array.isArray(data?.gradeLevels) ? (data.gradeLevels as string[]) : [];
        const sections = Array.isArray(data?.sections) ? (data.sections as ClassFormSection[]) : [];
        setAvailableGradeLevels(sortGradeLevels(gradeLevels.length ? gradeLevels : getDefaultGradeLevels()));
        setAvailableSections(sections);
      })
      .catch(() => {
        if (!active) return;
        setAvailableGradeLevels(sortGradeLevels(getDefaultGradeLevels()));
        setAvailableSections([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    if (newClass.startTime && newClass.endTime && newClass.endTime <= newClass.startTime) {
      setSaveError("End time must be later than start time.");
      return;
    }
    if (!newClass.days.length) {
      setSaveError("Please select at least one weekday.");
      return;
    }

    api
      .post("/api/classes/me", {
        className: newClass.section || null,
        gradeLevel: newClass.gradeLevel || null,
        subjectName: newClass.subject || null,
        buildingName: newClass.building || null,
        meetingDay: newClass.days,
        meetingTime: encodeMeetingTime(formatClassTimeRange(newClass.startTime, newClass.endTime), newClass.room) || null,
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
            building: newClass.building || "Not set",
            day: newClass.days.join(", "),
            time: formatClassTimeRange(newClass.startTime, newClass.endTime),
            schedule: [newClass.days.join(", "), formatClassTimeRange(newClass.startTime, newClass.endTime)].filter(Boolean).join(" "),
            room: newClass.room || "TBA",
            students: 0,
            avgGrade: 0,
          };
          setClasses((prev) => [fallback, ...prev]);
        }
        setIsAddModalOpen(false);
        setNewClass({
          section: "",
          gradeLevel: "",
          subject: "",
          building: "",
          days: [],
          startTime: "",
          endTime: "",
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
    setSaveError("");
    setDeleteError("");
    setIsDeleting(true);
    try {
      await api.delete(`/api/classes/${id}`, { data: { password: deletePassword } });
      setClasses((prev) => prev.filter((c) => c.id !== id));
      setIsDeleteModalOpen(false);
      setDeletePassword("");
      closeClassDetails();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to delete class.";
      setDeleteError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = () => {
    setDeletePassword("");
    setDeleteError("");
    setIsDeleteModalOpen(true);
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
    if (editClass.startTime && editClass.endTime && editClass.endTime <= editClass.startTime) {
      setSaveError("End time must be later than start time.");
      return;
    }
    if (!editClass.days.length) {
      setSaveError("Please select at least one weekday.");
      return;
    }
    try {
      const { data } = await api.patch(`/api/classes/${editClass.id}`, {
        className: editClass.section || null,
        gradeLevel: editClass.gradeLevel || null,
        subjectName: editClass.subject || null,
        buildingName: editClass.building || null,
        meetingDay: editClass.days,
        meetingTime: encodeMeetingTime(formatClassTimeRange(editClass.startTime, editClass.endTime), editClass.room) || null,
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
            building: editClass.building || "Not set",
            day: editClass.days.join(", "),
            time: formatClassTimeRange(editClass.startTime, editClass.endTime),
            schedule: [editClass.days.join(", "), formatClassTimeRange(editClass.startTime, editClass.endTime)].filter(Boolean).join(" "),
            room: editClass.room || "TBA",
            students: 0,
            avgGrade: 0,
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

  const studentRosterContent = isStudentsLoading ? (
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
  );

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Classes</h1>
          <p className="text-gray-500">Manage your sections and schedules</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
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
            className="group cursor-pointer rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
          >
            <div className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{cls.subject}</span>
              </div>

              <h3 className="mb-1 text-xl font-bold text-gray-800">{formatGradeSection(cls.gradeLevel, cls.name)}</h3>
              <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="h-4 w-4" />
                <span>{cls.building} • {cls.room}</span>
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
              </div>

              <div className="flex items-center justify-end border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openClassDetails(cls);
                  }}
                  className="text-sm font-semibold text-indigo-600 transition-colors duration-300 group-hover:translate-x-1 hover:text-indigo-700"
                >
                  View Class &rarr;
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
                  </div>
                  <h2 className="mb-1 text-3xl font-bold">{formatGradeSection(selectedClass.gradeLevel, selectedClass.name)}</h2>
                  <p className="flex items-center gap-2 opacity-90">
                    <MapPin className="h-4 w-4" /> {selectedClass.building} • {selectedClass.room}
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
                    onClick={openDeleteModal}
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
              <div className="space-y-2">{studentRosterContent}</div>
            </div>
          </div>
        </div>
      ) : null}

      {isDeleteModalOpen && selectedClass ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900">Delete Subject</h2>
              <p className="mt-2 text-sm text-gray-600">
                This action cannot be undone. Enter your password to delete <span className="font-semibold text-gray-800">{selectedClass.subject}</span>.
              </p>
            </div>

            {deleteError ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {deleteError}
              </div>
            ) : null}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-red-500"
                placeholder="Enter your password"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletePassword("");
                  setDeleteError("");
                }}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteClass(selectedClass.id)}
                className="flex-1 rounded-xl bg-red-600 py-2.5 font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDeleting || !deletePassword.trim()}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
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
                <select
                  required
                  value={editClass.gradeLevel}
                  onChange={(e) => setEditClass({ ...editClass, gradeLevel: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select grade level</option>
                  {availableGradeLevels.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Section</label>
                <select
                  required
                  value={editClass.section}
                  onChange={(e) => setEditClass({ ...editClass, section: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select section</option>
                  {availableSections.map((section) => (
                    <option key={section.id} value={section.name}>
                      {section.name}
                    </option>
                  ))}
                </select>
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
                  <option value="English">English</option>
                  <option value="TLE">TLE</option>
                  <option value="Values">Values</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Days</label>
                <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-3">
                  {WEEKDAY_OPTIONS.map((day) => {
                    const selected = editClass.days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setEditClass({ ...editClass, days: toggleSelectedDay(editClass.days, day) })}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                          selected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-xs text-gray-500">{editClass.days.length ? editClass.days.join(", ") : "Select one or more weekdays."}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Start Time</label>
                  <input
                    required
                    type="time"
                    value={editClass.startTime}
                    onChange={(e) => setEditClass({ ...editClass, startTime: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">End Time</label>
                  <input
                    required
                    type="time"
                    value={editClass.endTime}
                    onChange={(e) => setEditClass({ ...editClass, endTime: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Building</label>
                <input
                  required
                  type="text"
                  value={editClass.building}
                  onChange={(e) => setEditClass({ ...editClass, building: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter building"
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
                <select
                  required
                  value={newClass.gradeLevel}
                  onChange={(e) => setNewClass({ ...newClass, gradeLevel: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select grade level</option>
                  {availableGradeLevels.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Section</label>
                <select
                  required
                  value={newClass.section}
                  onChange={(e) => setNewClass({ ...newClass, section: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select section</option>
                  {availableSections.map((section) => (
                    <option key={section.id} value={section.name}>
                      {section.name}
                    </option>
                  ))}
                </select>
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
                  <option value="English">English</option>
                  <option value="TLE">TLE</option>
                  <option value="Values">Values</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Building</label>
                <input
                  required
                  type="text"
                  value={newClass.building}
                  onChange={(e) => setNewClass({ ...newClass, building: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter building"
                />
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
                <label className="mb-1 block text-sm font-medium text-gray-700">Days</label>
                <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white p-3">
                  {WEEKDAY_OPTIONS.map((day) => {
                    const selected = newClass.days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setNewClass({ ...newClass, days: toggleSelectedDay(newClass.days, day) })}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                          selected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-xs text-gray-500">{newClass.days.length ? newClass.days.join(", ") : "Select one or more weekdays."}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Start Time</label>
                  <input
                    required
                    type="time"
                    value={newClass.startTime}
                    onChange={(e) => setNewClass({ ...newClass, startTime: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">End Time</label>
                  <input
                    required
                    type="time"
                    value={newClass.endTime}
                    onChange={(e) => setNewClass({ ...newClass, endTime: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
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
