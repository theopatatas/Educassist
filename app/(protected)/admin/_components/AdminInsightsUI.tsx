"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, Database, LoaderCircle } from "lucide-react";

export function AdminPanel({ title, description, action, children, className = "" }: {
  title: string; description?: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5 ${className}`}>
    <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">{title}</h2>{description ? <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p> : null}</div>{action}</div>{children}
  </section>;
}

export function AdminMetricCard({ label, value, description, icon: Icon, href, loading, tone = "blue" }: {
  label: string; value: React.ReactNode | null; description: string; icon: LucideIcon; href: string; loading?: boolean;
  tone?: "blue" | "emerald" | "violet" | "amber" | "rose" | "cyan";
}) {
  const tones = {
    blue: "border-blue-100 bg-blue-50 text-blue-600",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-600",
    violet: "border-violet-100 bg-violet-50 text-violet-600",
    amber: "border-amber-100 bg-amber-50 text-amber-600",
    rose: "border-rose-100 bg-rose-50 text-rose-600",
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-600",
  };
  return <Link href={href} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
    <div className="flex items-start justify-between"><span className={`rounded-xl border p-2.5 ${tones[tone]}`}><Icon className="h-5 w-5" /></span><ArrowUpRight className={`h-4 w-4 opacity-40 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 ${tones[tone].split(" ").at(-1)}`} /></div>
    {loading ? <div className="mt-4 h-8 w-20 animate-pulse rounded bg-slate-100" /> : <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{value ?? "—"}</p>}
    <p className="mt-1 text-sm font-medium text-slate-700">{label}</p><p className="mt-1 text-xs text-slate-500">{description}</p>
  </Link>;
}

export function InsightState({ loading, error, emptyLabel = "No data is available yet." }: { loading?: boolean; error?: boolean; emptyLabel?: string }) {
  return <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 text-center">
    {loading ? <LoaderCircle className="mb-2 h-5 w-5 animate-spin text-slate-400" /> : <Database className="mb-2 h-5 w-5 text-slate-400" />}
    <p className="text-sm font-medium text-slate-600">{loading ? "Loading data…" : error ? "Data service is not available yet." : emptyLabel}</p>
    {!loading && error ? <p className="mt-1 max-w-sm text-xs text-slate-400">This component is connected and will populate when its backend endpoint is available.</p> : null}
  </div>;
}
