"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/http/client";
import {
  Award,
  AlertTriangle,
  Download,
  BarChart3,
  PieChart,
  Target,
  TrendingUp,
} from "lucide-react";

type ScoreBar = { label: string; value: number; color: string };
type SubjectProgress = { subject: string; score: number; color: string };
type Highlight = { title: string; meta: string; icon: React.ComponentType<{ className?: string }>; color: string };
type FocusItem = { subject: string; note: string; score: number };
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

const SUBJECTS: Array<{ key: keyof GradeRow; label: string; color: string }> = [
  { key: "math", label: "Math", color: "bg-blue-500" },
  { key: "science", label: "Science", color: "bg-green-500" },
  { key: "english", label: "English", color: "bg-purple-500" },
  { key: "filipino", label: "Filipino", color: "bg-orange-500" },
  { key: "mapeh", label: "MAPEH", color: "bg-pink-500" },
  { key: "ap", label: "AP", color: "bg-red-500" },
  { key: "tle", label: "TLE", color: "bg-yellow-500" },
  { key: "values", label: "Values", color: "bg-teal-500" },
];

export default function StudentReportsPage() {
  const [gradeRows, setGradeRows] = useState<GradeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .get("/api/classes/grades/me")
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data?.rows) ? (data.rows as GradeRow[]) : [];
        setGradeRows(rows);
      })
      .catch(() => {
        if (active) setGradeRows([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const scoreHistory = useMemo<ScoreBar[]>(() => {
    const palette = ["bg-indigo-400", "bg-blue-400", "bg-cyan-400", "bg-teal-400"];
    return gradeRows.map((row, index) => {
      const avg =
        (row.math + row.science + row.english + row.filipino + row.mapeh + row.ap + row.tle + row.values) / 8;
      return {
        label: row.name,
        value: Math.round(avg),
        color: palette[index % palette.length],
      };
    });
  }, [gradeRows]);

  const subjectProgress = useMemo<SubjectProgress[]>(() => {
    if (!gradeRows.length) return [];
    return SUBJECTS.map((subject) => {
      const total = gradeRows.reduce((sum, row) => sum + Number(row[subject.key] ?? 0), 0);
      return {
        subject: subject.label,
        score: Math.round(total / gradeRows.length),
        color: subject.color,
      };
    }).filter((item) => item.score > 0);
  }, [gradeRows]);

  const myAverage = useMemo(() => {
    if (!scoreHistory.length) return 0;
    return Math.round(scoreHistory.reduce((sum, item) => sum + item.value, 0) / scoreHistory.length);
  }, [scoreHistory]);

  const focusList = useMemo<FocusItem[]>(() => {
    return subjectProgress
      .filter((s) => s.score > 0 && s.score < 75)
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map((s) => ({
        subject: s.subject,
        note: "Needs improvement",
        score: s.score,
      }));
  }, [subjectProgress]);

  const highlights = useMemo<Highlight[]>(() => {
    if (!subjectProgress.length) return [];
    const sorted = [...subjectProgress].sort((a, b) => b.score - a.score);
    const top = sorted.slice(0, 3);
    return top.map((item, index) => ({
      title: index === 0 ? "Top Subject" : "Strong Progress",
      meta: `${item.subject} • ${item.score}%`,
      icon: index === 0 ? Award : TrendingUp,
      color: index === 0 ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700",
    }));
  }, [subjectProgress]);

  const needsFocusCount = focusList.length;

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Reports</h1>
          <p className="text-gray-500">Insights into your progress and performance</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 font-medium text-gray-600 transition-colors hover:bg-gray-50">
          <Download className="h-4 w-4" />
          Export My Report
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-4">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase text-gray-500">My Rank</p>
              <p className="text-2xl font-bold text-gray-800">-</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <TrendingUp className="h-4 w-4" />
            <span>Ranking not available yet</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-4">
            <div className="rounded-xl bg-green-50 p-3 text-green-600">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase text-gray-500">My Average</p>
              <p className="text-2xl font-bold text-gray-800">{myAverage}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <TrendingUp className="h-4 w-4" />
            <span>{isLoading ? "Loading grades..." : "Based on teacher-published grades"}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-4">
            <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase text-gray-500">Needs Focus</p>
              <p className="text-2xl font-bold text-gray-800">{needsFocusCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
            <TrendingUp className="h-4 w-4" />
            <span>{needsFocusCount ? "Subjects below 75%" : "No focus items yet"}</span>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-6 flex items-center gap-2 font-bold text-gray-800">
            <BarChart3 className="h-5 w-5 text-gray-400" />
            My Score History
          </h3>

          {scoreHistory.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">No score history available yet.</div>
          ) : (
            <div className="flex h-64 items-end gap-4">
              {scoreHistory.map((bar) => (
                <div key={bar.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div className="relative flex w-full justify-center">
                    <div className={`w-full max-w-[40px] rounded-t-lg opacity-80 transition-all duration-500 group-hover:opacity-100 ${bar.color}`} style={{ height: `${bar.value}%` }} />
                    <div className="absolute -top-8 rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {bar.value}%
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-500">{bar.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-6 flex items-center gap-2 font-bold text-gray-800">
            <PieChart className="h-5 w-5 text-gray-400" />
            My Subject Progress
          </h3>

          {subjectProgress.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">No subject progress available yet.</div>
          ) : (
            <div className="space-y-6">
              {subjectProgress.map((item) => (
                <div key={item.subject}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{item.subject}</span>
                    <span className="font-bold text-gray-900">{item.score}%</span>
                  </div>

                  <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-800">
            <Award className="h-5 w-5 text-gray-400" />
            My Highlights
          </h3>

          {highlights.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">No highlights yet.</div>
          ) : (
            <div className="space-y-4">
              {highlights.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.meta}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-indigo-600">{i + 1}</p>
                      <p className="text-xs text-gray-400">Badge</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-800">
            <AlertTriangle className="h-5 w-5 text-gray-400" />
            My Focus List
          </h3>

          {focusList.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">No focus items yet.</div>
          ) : (
            <div className="space-y-4">
              {focusList.map((item, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white bg-white/70">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{item.subject}</p>
                      <p className="text-xs font-medium text-red-600">{item.note}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-red-600">{item.score}%</p>
                    <p className="text-xs text-red-400">Current</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
