"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, GraduationCap, LayoutDashboard, Settings, X } from "lucide-react";

const items = [
  ["/staff-admin/dashboard", "Dashboard", LayoutDashboard, "text-blue-500"],
  ["/staff-admin/students", "Student Management", GraduationCap, "text-green-500"],
  ["/staff-admin/events", "Meetings & Events", CalendarDays, "text-violet-500"],
  ["/staff-admin/reports", "Reports", BarChart3, "text-amber-500"],
  ["/staff-admin/settings", "Settings", Settings, "text-slate-500"],
] as const;

export default function StaffAdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  return <>
    {open ? <button type="button" className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm md:hidden" onClick={onClose} aria-label="Close navigation menu" /> : null}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] shrink-0 overflow-y-auto border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 md:sticky md:top-16 md:z-20 md:h-[calc(100vh-4rem)] md:w-64 md:translate-x-0 md:shadow-none ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="w-full space-y-1 p-4">
        <div className="flex items-center justify-between px-4 py-2"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Admin Menu</p><button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden" aria-label="Close navigation menu"><X className="h-5 w-5" /></button></div>
        {items.map(([href, label, Icon, color]) => { const active = pathname === href || pathname.startsWith(`${href}/`); return <Link key={href} href={href} onClick={onClose} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${active ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}><span className={`rounded-lg p-2 ${active ? "bg-white shadow-sm" : ""}`}><Icon className={`h-5 w-5 ${color}`} /></span><span>{label}</span></Link>; })}
      </div>
    </aside>
  </>;
}
