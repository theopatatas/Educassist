"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/http/client";

type EventNotice = {
  id: number;
  title: string;
  category: string;
  occurredAt?: string | null;
  read: boolean;
  href?: string | null;
  source: "event" | "system";
};

export default function EventNotifications({
  eventHref,
  studentId,
}: {
  eventHref: string;
  studentId?: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState<EventNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const [eventResult, systemResult] = await Promise.allSettled([
        api.get("/api/events/notifications", {
          params: studentId ? { studentId } : undefined,
        }),
        api.get("/api/leaves/notifications"),
      ]);
      const eventRows =
        eventResult.status === "fulfilled" &&
        Array.isArray(eventResult.value.data?.notifications)
        ? eventResult.value.data.notifications
        : [];
      const systemRows =
        systemResult.status === "fulfilled" &&
        Array.isArray(systemResult.value.data?.notifications)
        ? systemResult.value.data.notifications
        : [];
      if (
        eventResult.status === "rejected" &&
        systemResult.status === "rejected"
      )
        throw new Error("Notifications are unavailable");
      setNotices([
        ...eventRows.map((notice: Omit<EventNotice, "source">) => ({
          ...notice,
          source: "event" as const,
        })),
        ...systemRows.map(
          (notice: {
            id: number;
            title: string;
            category: string;
            createdAt: string;
            readAt?: string | null;
            href?: string | null;
          }) => ({
            id: notice.id,
            title: notice.title,
            category: notice.category,
            occurredAt: notice.createdAt,
            read: Boolean(notice.readAt),
            href: notice.href,
            source: "system" as const,
          }),
        ),
      ].sort((left, right) =>
        String(right.occurredAt ?? "").localeCompare(
          String(left.occurredAt ?? ""),
        ),
      ));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

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
      setNotices((current) => current.map((item) => item.id === notice.id && item.source === notice.source ? { ...item, read: true } : item));
      try {
        await api.patch(
          notice.source === "system"
            ? `/api/leaves/notifications/${notice.id}/read`
            : `/api/events/notifications/${notice.id}/read`,
        );
      } catch { void load(); }
    }
    setOpen(false);
    router.push(notice.href || eventHref);
  };
  const markAllRead = async () => {
    setNotices((current) => current.map((notice) => ({ ...notice, read: true })));
    try {
      await Promise.allSettled([
        api.patch("/api/events/notifications/read-all"),
        api.patch("/api/leaves/notifications/read-all"),
      ]);
    } catch { void load(); }
  };
  const clearAll = async () => {
    const previous = notices;
    setNotices([]);
    try {
      const results = await Promise.allSettled([
        api.delete("/api/events/notifications/clear-all"),
        api.delete("/api/leaves/notifications/clear-all"),
      ]);
      if (results.every((result) => result.status === "rejected")) {
        setNotices(previous);
      }
    } catch {
      setNotices(previous);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-full p-2 hover:bg-slate-100"
        aria-label="Open notifications"
      >
        <Bell className="h-5 w-5 text-slate-600" />
        {unread ? (
          <>
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
            <span className="sr-only">{unread} unread notifications</span>
          </>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Close notifications"
          />
          <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b p-4 font-bold">
              <span>Notifications</span>
              <span className="flex items-center gap-3">
                {unread ? (
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Mark all as read
                  </button>
                ) : null}
                {notices.length ? (
                  <button
                    type="button"
                    onClick={() => void clearAll()}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Clear all
                  </button>
                ) : null}
              </span>
            </div>

            <div className="max-h-[380px] overflow-y-auto [&>button]:min-h-[76px]">
              {loading ? (
                <div className="space-y-3 p-4">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-14 animate-pulse rounded-xl bg-slate-100"
                    />
                  ))}
                </div>
              ) : error ? (
                <div className="p-5 text-center text-sm text-rose-600">
                  Notifications could not be loaded.
                  <button
                    type="button"
                    onClick={() => void load()}
                    className="mt-2 block w-full font-semibold underline"
                  >
                    Retry
                  </button>
                </div>
              ) : notices.length ? (
                notices.map((notice) => (
                  <button
                    type="button"
                    key={`${notice.source}-${notice.id}`}
                    onClick={() => void openNotice(notice)}
                    className={`block w-full border-b border-slate-100 p-4 text-left text-sm transition-colors last:border-b-0 hover:bg-slate-50 ${
                      notice.read ? "bg-white" : "bg-slate-50"
                    }`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-medium text-slate-800">
                        {notice.title}
                      </span>
                      {!notice.read ? (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-900" />
                      ) : null}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {notice.category}
                      {notice.occurredAt
                        ? ` · ${new Date(notice.occurredAt).toLocaleString()}`
                        : ""}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-sm text-slate-600">
                  No notifications yet.
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
