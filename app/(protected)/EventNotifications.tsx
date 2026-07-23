"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/http/client";

type EventNotice = {
  id: number;
  title: string;
  category: string;
  occurredAt?: string | null;
  read: boolean;
};

export default function EventNotifications({ eventHref }: { eventHref: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState<EventNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/api/events/notifications");
      setNotices(Array.isArray(data?.notifications) ? data.notifications : []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 30000);
    const refresh = () => void load();
    window.addEventListener("educassist-event-updated", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("educassist-event-updated", refresh);
    };
  }, [load]);

  const unread = useMemo(() => notices.filter((notice) => !notice.read).length, [notices]);
  const openNotice = async (notice: EventNotice) => {
    if (!notice.read) {
      setNotices((current) => current.map((item) => item.id === notice.id ? { ...item, read: true } : item));
      try { await api.patch(`/api/events/notifications/${notice.id}/read`); } catch { void load(); }
    }
    setOpen(false);
    router.push(eventHref);
  };
  const markAllRead = async () => {
    setNotices((current) => current.map((notice) => ({ ...notice, read: true })));
    try { await api.patch("/api/events/notifications/read-all"); } catch { void load(); }
  };

  return <div className="relative">
    <button type="button" onClick={() => setOpen((current) => !current)} className="relative rounded-full p-2 hover:bg-slate-100" aria-label="Open notifications">
      <Bell className="h-5 w-5 text-slate-600" />
      {unread ? <><span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" /><span className="sr-only">{unread} unread notifications</span></> : null}
    </button>
    {open ? <><button type="button" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="Close notifications" /><div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"><div className="flex items-center justify-between border-b p-4"><div><p className="font-bold text-slate-900">Notifications</p><p className="mt-0.5 text-xs text-slate-500">Shared administrator events</p></div>{unread ? <button type="button" onClick={() => void markAllRead()} className="text-xs font-semibold text-blue-600 hover:text-blue-700">Mark all read</button> : null}</div><div className="max-h-96 overflow-y-auto">{loading ? <div className="space-y-3 p-4">{[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div> : error ? <div className="p-5 text-center text-sm text-rose-600">Notifications could not be loaded.<button type="button" onClick={() => void load()} className="mt-2 block w-full font-semibold underline">Retry</button></div> : notices.length ? notices.map((notice) => <button type="button" key={notice.id} onClick={() => void openNotice(notice)} className={`flex w-full gap-3 border-b border-slate-100 p-4 text-left transition-colors last:border-b-0 hover:bg-slate-50 ${notice.read ? "bg-white" : "bg-blue-50/50"}`}><span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${notice.read ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-600"}`}><CalendarDays className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-800">{notice.title}</span><span className="mt-1 block text-xs text-slate-500">{notice.category}{notice.occurredAt ? ` · ${new Date(notice.occurredAt).toLocaleString()}` : ""}</span></span>{!notice.read ? <i className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" /> : null}</button>) : <div className="p-6 text-center"><CalendarDays className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-2 text-sm font-medium text-slate-600">No event notifications yet.</p></div>}</div></div></> : null}
  </div>;
}
