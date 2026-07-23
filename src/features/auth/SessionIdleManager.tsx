"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./hooks";
import {
  getLastActivityAt,
  IDLE_TIMEOUT_MS,
  LAST_ACTIVITY_KEY,
  logoutForSessionTimeout,
  markUserActivity,
} from "./session";

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "click",
  "keydown",
  "mousemove",
  "scroll",
  "touchstart",
];

export default function SessionIdleManager() {
  const pathname = usePathname();
  const { user, hydrated } = useAuth();

  useEffect(() => {
    if (!hydrated || !user) return;

    let lastRecorded = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastRecorded < 1000) return;
      lastRecorded = now;
      markUserActivity();
    };

    markUserActivity();

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, onActivity, { passive: true });
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === LAST_ACTIVITY_KEY && event.newValue) {
        lastRecorded = Number(event.newValue) || Date.now();
      }
    };

    window.addEventListener("storage", onStorage);

    const timer = window.setInterval(() => {
      const lastActivityAt = getLastActivityAt();
      if (Date.now() - lastActivityAt >= IDLE_TIMEOUT_MS) {
        logoutForSessionTimeout();
      }
    }, 15000);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", onStorage);
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, onActivity);
      }
    };
  }, [hydrated, user]);

  useEffect(() => {
    if (hydrated && user) {
      markUserActivity();
    }
  }, [pathname, hydrated, user]);

  return null;
}
