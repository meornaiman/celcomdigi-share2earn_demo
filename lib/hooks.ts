"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  getServerSnapshot,
  getSnapshot,
  runExpirySweep,
  selectUser,
  subscribe,
} from "./store";
import {
  getSessionServerSnapshot,
  getSessionSnapshot,
  subscribeSession,
} from "./session";
import type { AppNotification, Database, User } from "./types";

/** Live view of the store, kept in sync across tabs and demo panels. */
export function useDb(): Database {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useSessionUserId(): string | null {
  return useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    getSessionServerSnapshot
  );
}

export function useCurrentUser(): User | null {
  const db = useDb();
  const id = useSessionUserId();
  return selectUser(db, id);
}

/**
 * False during the server-rendered pass and the first client paint. Screens use
 * it to hold back content that depends on browser storage, which keeps the
 * static export free of hydration mismatches.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

/** Ages out requests that passed their expiry while the tab was idle. */
export function useExpirySweep(intervalMs = 30000) {
  useEffect(() => {
    runExpirySweep();
    const timer = window.setInterval(runExpirySweep, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
}

/**
 * Fires for each notification that arrives after mount. This is what the app
 * uses to surface an in-app push while the user is looking at another screen;
 * the same payload shape is what a Web Push handler would receive.
 */
export function useNotificationStream(
  userId: string | null,
  onArrive: (n: AppNotification) => void
) {
  const db = useDb();
  const seen = useRef<Set<string> | null>(null);
  const handler = useRef(onArrive);
  handler.current = onArrive;

  useEffect(() => {
    if (!userId) {
      seen.current = null;
      return;
    }
    const mine = db.notifications.filter((n) => n.user_id === userId);
    if (seen.current === null) {
      // First pass after sign-in: adopt the backlog silently.
      seen.current = new Set(mine.map((n) => n.id));
      return;
    }
    const fresh = mine.filter((n) => !seen.current!.has(n.id));
    fresh.forEach((n) => {
      seen.current!.add(n.id);
      handler.current(n);
    });
  }, [db.notifications, userId]);
}

/**
 * Builds in-app links that carry the `?as=` account pin forward. The /demo
 * panels rely on it: without the pin a panel would fall back to the shared
 * stored session and both sides would show the same account.
 *
 * The pin resolves to null on the server and on the first paint so the static
 * markup and the hydrated markup agree.
 */
export function useAppLink(): (href: string) => string {
  const [pin, setPin] = useState<string | null>(null);

  useEffect(() => {
    setPin(new URLSearchParams(window.location.search).get("as"));
  }, []);

  return (href: string) => {
    if (!pin) return href;
    const [path, existing] = href.split("?");
    const params = new URLSearchParams(existing);
    params.set("as", pin);
    return `${path}?${params.toString()}`;
  };
}

/** Reads a query parameter after mount, without needing a Suspense boundary. */
export function useQueryParam(name: string): string | null {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    setValue(new URLSearchParams(window.location.search).get(name));
  }, [name]);
  return value;
}

/** Relative time such as "just now" or "3 min ago". */
export function timeAgo(iso: string, lang: "en" | "ms" = "en"): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === "ms" ? "baru sahaja" : "just now";
  if (mins < 60) return lang === "ms" ? `${mins} min lalu` : `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return lang === "ms" ? `${hours} jam lalu` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return lang === "ms" ? `${days} hari lalu` : `${days}d ago`;
}

/** "in 23h" style countdown used on request expiry labels. */
export function timeUntil(iso: string, lang: "en" | "ms" = "en"): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return lang === "ms" ? "tamat" : "expired";
  const hours = Math.floor(diff / 3600000);
  if (hours >= 1) return lang === "ms" ? `dalam ${hours} jam` : `in ${hours}h`;
  const mins = Math.max(1, Math.floor(diff / 60000));
  return lang === "ms" ? `dalam ${mins} min` : `in ${mins} min`;
}
