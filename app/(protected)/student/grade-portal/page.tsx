"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/http/client";
import { Download, Save, CheckCircle2 } from "lucide-react";

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
const quarterLabels = ["Quarter 1", "Quarter 2", "Quarter 3", "Quarter 4"] as const;

export default function StudentGradePortalPage() {
  const [grades, setGrades] = useState(myGradeRows);
  const [selectedView, setSelectedView] = useState("Quarter 3");
  const [showToast, setShowToast] = useState(false);
  const quarterRows = useMemo(() => {
    const defaults = quarterLabels.map((quarter, idx) => ({
      id: idx + 1,
      name: quarter,
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
    () => quarterRows.find((r) => r.name === selectedView) ?? quarterRows[0],
    [quarterRows, selectedView]
  );

  useEffect(() => {
    let active = true;
    api
      .get("/api/classes/grades/me")
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data?.rows)
          ? (data.rows as Array<GradeRow & { quarter?: string }>).map((row, index) => ({
              ...row,
              id: Number(row.id) || index + 1,
              name: row.name || row.quarter || `Quarter ${index + 1}`,
            }))
          : [];
        setGrades(rows);
      })
      .catch(() => {
        if (active) setGrades([]);
      });
    return () => {
      active = false;
    };
  }, []);

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

  const handleSave = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

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
    <div className="relative mx-auto max-w-7xl p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Grades</h1>
          <p className="text-gray-500">View your subject grades and overall average</p>
          <p className="mt-2 text-sm text-gray-500">
            Overall Average: <span className="font-semibold text-indigo-700">{average}</span>
          </p>
        </div>

        <div className="flex w-full flex-wrap gap-3 md:w-auto">
          <div className="relative">
            <select
              value={selectedView}
              onChange={(e) => setSelectedView(e.target.value)}
              className="appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-4 pr-10 font-medium text-gray-600 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Quarter 1">Quarter 1</option>
              <option value="Quarter 2">Quarter 2</option>
              <option value="Quarter 3">Quarter 3</option>
              <option value="Quarter 4">Quarter 4</option>
            </select>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Save to My Notes</span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="sticky left-0 z-10 min-w-[220px] bg-gray-50 px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                  Quarter
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
              {quarterRows.map((row) => {
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

      {showToast ? (
        <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3 rounded-xl bg-gray-900 px-6 py-3 text-white shadow-2xl">
          <CheckCircle2 className="h-5 w-5 text-green-400" />
          <span className="font-medium">Saved to your notes</span>
        </div>
      ) : null}
    </div>
  );
}
