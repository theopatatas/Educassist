"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { InsightState } from "../_components/AdminInsightsUI";

type ChartRow = Record<string, string | number | null>;

export function AnalyticsChart({ data, xKey, series, type = "bar", loading, error }: {
  data?: ChartRow[]; xKey: string; series: Array<{ key: string; label: string; color: string }>;
  type?: "bar" | "line"; loading?: boolean; error?: boolean;
}) {
  if (loading) return <InsightState loading />;
  if (error) return <InsightState error />;
  if (!data?.length) return <InsightState />;
  const Chart = type === "line" ? LineChart : BarChart;
  return <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><Chart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickLine={false} /><YAxis tick={{ fontSize: 11 }} tickLine={false} /><Tooltip /><Legend />{series.map((item) => type === "line" ? <Line key={item.key} type="monotone" dataKey={item.key} name={item.label} stroke={item.color} strokeWidth={2.5} dot={{ r: 3 }} /> : <Bar key={item.key} dataKey={item.key} name={item.label} fill={item.color} radius={[5, 5, 0, 0]} />)}</Chart></ResponsiveContainer></div>;
}
