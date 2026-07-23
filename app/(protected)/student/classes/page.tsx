"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/src/lib/http/client";
import { Users, Clock, MapPin, X, Calendar, Building2 } from "lucide-react";

type ApiClass = {
  id: number;
  name: string | null;
  gradeLevel: string | null;
  buildingName?: string | null;
  meetingDay: string | null;
  meetingTime: string | null;
  subjectName?: string | null;
  teacherName?: string | null;
};

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
  teacher: string;
  color: string;
  lightColor: string;
  textColor: string;
};

function parseMeetingTime(rawValue: string | null | undefined) {
  const raw = rawValue?.trim() || "";
  if (!raw.includes("|")) return { time: raw, room: "" };

  const [partA, partB] = raw.split("|", 2).map((p) => p.trim());
  const aLooksLikeTime = /(:|am|pm)/i.test(partA);
  const bLooksLikeTime = /(:|am|pm)/i.test(partB);

  if (aLooksLikeTime && !bLooksLikeTime) return { time: partA, room: partB };
  if (!aLooksLikeTime && bLooksLikeTime) return { time: partB, room: partA };
  return { time: partA, room: partB };
}

function formatGradeSection(gradeLevel: string | null | undefined, section: string | null | undefined) {
  return [gradeLevel?.trim(), section?.trim()].filter(Boolean).join(" • ") || "Section";
}

export default function StudentClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const subjectTheme = (subject: string) => {
    const colors: Record<string, Pick<ClassItem, "color" | "lightColor" | "textColor">> = {
      Science: { color: "bg-green-500", lightColor: "bg-green-50", textColor: "text-green-600" },
      Mathematics: { color: "bg-blue-500", lightColor: "bg-blue-50", textColor: "text-blue-600" },
      Math: { color: "bg-blue-500", lightColor: "bg-blue-50", textColor: "text-blue-600" },
      English: { color: "bg-purple-500", lightColor: "bg-purple-50", textColor: "text-purple-600" },
      Filipino: { color: "bg-orange-500", lightColor: "bg-orange-50", textColor: "text-orange-600" },
      Mapeh: { color: "bg-pink-500", lightColor: "bg-pink-50", textColor: "text-pink-600" },
      ESP: { color: "bg-teal-500", lightColor: "bg-teal-50", textColor: "text-teal-600" },
      "Aralin Panlipunan": { color: "bg-red-500", lightColor: "bg-red-50", textColor: "text-red-600" },
      PE: { color: "bg-amber-500", lightColor: "bg-amber-50", textColor: "text-amber-600" },
    };
    return colors[subject] || { color: "bg-gray-700", lightColor: "bg-gray-100", textColor: "text-gray-700" };
  };

  useEffect(() => {
    let active = true;

    api
      .get("/api/classes/me")
      .then(({ data }) => {
        if (!active) return;

        const rows = Array.isArray(data?.classes) ? (data.classes as ApiClass[]) : [];
        const mapped = rows.map((cls) => {
          const { time: timePart, room: roomPart } = parseMeetingTime(cls.meetingTime);
          const subject = cls.subjectName?.trim() || "Subject";

          return {
            id: Number(cls.id),
            name: cls.name?.trim() || "Section",
            subject,
            gradeLevel: cls.gradeLevel?.trim() || "",
            building: cls.buildingName?.trim() || "Building",
            day: cls.meetingDay?.trim() || "",
            time: timePart,
            schedule: [cls.meetingDay?.trim(), timePart].filter(Boolean).join(" ") || "TBA",
            room: roomPart || "TBA",
            teacher: cls.teacherName?.trim() || "Teacher",
            ...subjectTheme(subject),
          } satisfies ClassItem;
        });

        setClasses(mapped);
      })
      .catch(() => {
        if (active) setLoadError("Failed to load your classes.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Classes</h1>
          <p className="text-gray-500">Classes are automatically assigned from your grade level and section.</p>
        </div>
      </div>

      {loadError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
      ) : null}
      {isLoading ? <div className="mb-4 text-sm text-gray-500">Loading classes...</div> : null}

      {!isLoading && classes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">No classes yet.</div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {classes.map((cls) => (
          <div
            key={cls.id}
            onClick={() => setSelectedClass(cls)}
            className="cursor-pointer rounded-2xl bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
          >
            <div className="p-6">
              <div className="mb-4">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${cls.lightColor} ${cls.textColor}`}>{cls.subject}</span>
              </div>

              <h3 className="mb-1 text-xl font-bold text-gray-800">{formatGradeSection(cls.gradeLevel, cls.name)}</h3>
              <p className="mb-3 text-sm text-gray-500">
                Teacher: <span className="font-medium text-gray-700">{cls.teacher}</span>
              </p>

              <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="h-4 w-4" />
                <span>{cls.building} - {cls.room}</span>
              </div>

              <div className="space-y-3">
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
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedClass ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setSelectedClass(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <div className={`p-6 text-white ${selectedClass.color}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-lg bg-white/20 px-2 py-1 text-xs font-bold backdrop-blur-sm">{selectedClass.subject}</span>
                    <span className="flex items-center gap-1 rounded-lg bg-white/20 px-2 py-1 text-xs font-bold backdrop-blur-sm">
                      <Clock className="h-3 w-3" /> {selectedClass.schedule}
                    </span>
                  </div>

                  <h2 className="mb-1 text-3xl font-bold">{formatGradeSection(selectedClass.gradeLevel, selectedClass.name)}</h2>

                  <p className="flex flex-wrap items-center gap-3 opacity-90">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> {selectedClass.building} - {selectedClass.room}
                    </span>
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" /> Teacher: {selectedClass.teacher}
                    </span>
                  </p>
                </div>

                <button
                  onClick={() => setSelectedClass(null)}
                  className="rounded-xl bg-white/20 p-2 transition-colors hover:bg-white/30"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-bold uppercase text-gray-500">Teacher</p>
                  <p className="mt-1 text-lg font-bold text-gray-800">{selectedClass.teacher}</p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-bold uppercase text-gray-500">Class Days</p>
                  <p className="mt-1 text-lg font-bold text-gray-800">{selectedClass.day || "TBA"}</p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-bold uppercase text-gray-500">Class Time</p>
                  <p className="mt-1 text-lg font-bold text-gray-800">{selectedClass.time || "TBA"}</p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-bold uppercase text-gray-500">Location</p>
                  <p className="mt-1 flex items-center gap-2 text-lg font-bold text-gray-800">
                    <Building2 className="h-5 w-5 text-gray-500" />
                    <span>{selectedClass.building} - {selectedClass.room}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
