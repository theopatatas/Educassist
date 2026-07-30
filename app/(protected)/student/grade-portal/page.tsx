"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/http/client";
import { Download } from "lucide-react";

type GradeRow = {
  id: number;
  name: string;
  math: number;
  science: number;
  english: number;
  filipino: number;
  mapeh: number;
  ap: number;
  tle: number;
  values: number;
};
type AcademicSession = {
  academicYear: string;
  gradeLevel: string;
  status: "Current" | "Completed";
};

const myGradeRows: GradeRow[] = [];

const subjects = [
  { key: "math", label: "Math" },
  { key: "science", label: "Science" },
  { key: "english", label: "English" },
  { key: "filipino", label: "Filipino" },
  { key: "mapeh", label: "MAPEH" },
  { key: "ap", label: "AP" },
  { key: "tle", label: "TLE" },
  { key: "values", label: "Values" },
] as const;
const termLabels = ["Term 1", "Term 2", "Term 3"] as const;

export default function StudentGradePortalPage() {
  const [grades, setGrades] = useState(myGradeRows);
  const [selectedView, setSelectedView] = useState("Term 3");
  const [finalSubjectAverages, setFinalSubjectAverages] = useState<
    Record<string, number>
  >({});
  const [overallAverage, setOverallAverage] = useState<number | null>(null);
  const [gradeLevel, setGradeLevel] = useState<string | null>(null);
  const [academicYear, setAcademicYear] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<
    "Current" | "Completed"
  >("Current");
  const [academicRemarks, setAcademicRemarks] = useState<string | null>(null);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [selectedSession, setSelectedSession] =
    useState<AcademicSession | null>(null);
  const termRows = useMemo(() => {
    const defaults = termLabels.map((term, idx) => ({
      id: idx + 1,
      name: term,
      math: 0,
      science: 0,
      english: 0,
      filipino: 0,
      mapeh: 0,
      ap: 0,
      tle: 0,
      values: 0,
    }));
    if (!grades.length) return defaults;
    const byName = new Map(grades.map((g) => [g.name, g]));
    return defaults.map((row) => byName.get(row.name) ?? row);
  }, [grades]);
  const selectedRow = useMemo(
    () => termRows.find((r) => r.name === selectedView) ?? termRows[0],
    [termRows, selectedView]
  );

  const loadSession = useCallback(async (session: AcademicSession) => {
    const { data } = await api.get("/api/classes/grades/me", {
      params: {
        academicYear: session.academicYear,
        gradeLevel: session.gradeLevel,
      },
    });
        const rows = Array.isArray(data?.rows)
          ? (data.rows as Array<GradeRow & { term?: string }>).map((row, index) => ({
              ...row,
              id: Number(row.id) || index + 1,
              name: row.name || row.term || `Term ${index + 1}`,
            }))
          : [];
        setGrades(rows);
        setFinalSubjectAverages(
          data?.finalSubjectAverages &&
            typeof data.finalSubjectAverages === "object"
            ? data.finalSubjectAverages
            : {},
        );
        setOverallAverage(
          typeof data?.overallAverage === "number"
            ? data.overallAverage
            : null,
        );
        setGradeLevel(
          typeof data?.gradeLevel === "string" && data.gradeLevel.trim()
            ? data.gradeLevel
            : null,
        );
        setAcademicYear(
          typeof data?.academicYear === "string" ? data.academicYear : null,
        );
        setSessionStatus(
          data?.status === "Completed" ? "Completed" : "Current",
        );
        setAcademicRemarks(
          typeof data?.academicRemarks === "string"
            ? data.academicRemarks
            : null,
        );
        setSelectedSession(session);
  }, []);

  useEffect(() => {
    let active = true;
    api
      .get("/api/classes/grades/me/sessions")
      .then(async ({ data }) => {
        if (!active) return;
        const available = Array.isArray(data?.sessions)
          ? (data.sessions as AcademicSession[])
          : [];
        setSessions(available);
        if (!available.length) return;
        const params = new URLSearchParams(window.location.search);
        const requestedYear = params.get("academicYear");
        const requestedGrade = params.get("gradeLevel");
        const selected =
          available.find(
            (session) =>
              session.academicYear === requestedYear &&
              session.gradeLevel === requestedGrade,
          ) ??
          available.find((session) => session.status === "Current") ??
          available[0];
        await loadSession(selected);
      })
      .catch(() => {
        if (active) {
          setSessions([]);
          setGrades([]);
        }
      });
    return () => {
      active = false;
    };
  }, [loadSession]);

  const chooseSession = (value: string) => {
    const session = sessions.find(
      (item) => `${item.academicYear}|${item.gradeLevel}` === value,
    );
    if (!session) return;
    const params = new URLSearchParams({
      academicYear: session.academicYear,
      gradeLevel: session.gradeLevel,
    });
    window.history.replaceState(
      null,
      "",
      `/student/grade-portal?${params.toString()}`,
    );
    void loadSession(session).catch(() => setGrades([]));
  };

  const average = useMemo(() => {
    return Math.round(
      (selectedRow.math +
        selectedRow.science +
        selectedRow.english +
        selectedRow.filipino +
        selectedRow.mapeh +
        selectedRow.ap +
        selectedRow.tle +
        selectedRow.values) /
        8
    );
  }, [selectedRow]);

  const handleExport = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        "View,Math,Science,English,Filipino,MAPEH,AP,TLE,Values,Average",
        `${selectedView},${selectedRow.math},${selectedRow.science},${selectedRow.english},${selectedRow.filipino},${selectedRow.mapeh},${selectedRow.ap},${selectedRow.tle},${selectedRow.values},${average}`,
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `my_grades_${selectedView.replace(/\s+/g, "_").toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative mx-auto max-w-7xl p-3 sm:p-6">
      <section className="mb-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-medium text-slate-500">Student Learning</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Academic Session</h1>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                sessionStatus === "Current"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {sessionStatus}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">View your subject grades and overall average</p>
          <p className="mt-2 text-sm text-gray-500">
            Academic Year:{" "}
            <span className="font-semibold text-indigo-700">
              {academicYear || "Unavailable"}
            </span>
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Grade Level:{" "}
            <span className="font-semibold text-indigo-700">
              {gradeLevel || "Not assigned"}
            </span>
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Overall Average: <span className="font-semibold text-indigo-700">{average}</span>
          </p>
          {academicRemarks ? (
            <p className="mt-2 text-sm text-gray-500">
              Academic Remarks:{" "}
              <span className="font-semibold text-indigo-700">
                {academicRemarks}
              </span>
            </p>
          ) : null}
        </div>

        <div className="flex w-full flex-wrap gap-3 md:w-auto">
          <select
            value={
              selectedSession
                ? `${selectedSession.academicYear}|${selectedSession.gradeLevel}`
                : ""
            }
            onChange={(event) => chooseSession(event.target.value)}
            className="min-w-[220px] rounded-xl border border-gray-200 bg-white px-4 py-2 font-medium text-gray-600 outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Select academic session"
          >
            {sessions.length ? (
              sessions.map((session) => (
                <option
                  key={`${session.academicYear}-${session.gradeLevel}`}
                  value={`${session.academicYear}|${session.gradeLevel}`}
                >
                  {session.gradeLevel} • {session.academicYear}
                </option>
              ))
            ) : (
              <option value="">No previous academic sessions found</option>
            )}
          </select>
          <div className="relative">
            <select
              value={selectedView}
              onChange={(e) => setSelectedView(e.target.value)}
              className="appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-4 pr-10 font-medium text-gray-600 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

        </div>
      </section>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="sticky left-0 z-10 min-w-[220px] bg-gray-50 px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  Term
                </th>

                {subjects.map((subject) => (
                  <th
                    key={subject.key}
                    className="min-w-[110px] bg-gray-50 px-4 py-5 text-center text-xs font-bold uppercase tracking-wider text-gray-600"
                  >
                    {subject.label}
                  </th>
                ))}

                <th className="min-w-[110px] bg-gray-100 px-4 py-5 text-center text-xs font-bold uppercase tracking-wider text-gray-700">
                  Average
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {termRows.map((row) => {
                const rowAvg = Math.round(
                  (row.math +
                    row.science +
                    row.english +
                    row.filipino +
                    row.mapeh +
                    row.ap +
                    row.tle +
                    row.values) /
                    8
                );

                return (
                  <tr key={row.name} className="group transition-colors hover:bg-gray-50">
                    <td className="sticky left-0 z-10 whitespace-nowrap border-r border-gray-100 bg-white px-6 py-4 text-sm font-medium text-gray-900 group-hover:bg-gray-50">
                      {row.name}
                    </td>

                    {subjects.map((s) => {
                      const value = row[s.key] as number;
                      return (
                        <td key={s.key} className="px-4 py-4 text-center text-sm font-semibold text-gray-700">
                          {value}
                        </td>
                      );
                    })}

                    <td className="whitespace-nowrap bg-gray-50 px-4 py-4 text-center text-sm font-bold text-gray-800">
                      {rowAvg}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {overallAverage !== null ? (
        <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-600">
                Final Academic Results
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Overall Average: {overallAverage}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {subjects.map((subject) =>
                finalSubjectAverages[subject.key] !== undefined ? (
                  <span
                    key={subject.key}
                    className="rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                  >
                    {subject.label}: {finalSubjectAverages[subject.key]}
                  </span>
                ) : null,
              )}
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
