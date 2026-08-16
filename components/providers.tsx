"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LANG_KEY, translate, type Lang, type TranslationKey } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/* Language                                                            */
/* ------------------------------------------------------------------ */

interface LangValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LangContext = createContext<LangValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always starts at "en" so the server-rendered markup and the first client
  // paint agree; the stored preference is applied right after mount.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(LANG_KEY);
    if (stored === "en" || stored === "ms") setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "ms" ? "ms" : "en";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(LANG_KEY, l);
  }, []);

  const value = useMemo<LangValue>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
    }),
    [lang, setLang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}

/** Shorthand for the common case of only needing the translate function. */
export function useT() {
  return useLang().t;
}

/* ------------------------------------------------------------------ */
/* Toasts — the in-app stand-in for a push notification                */
/* ------------------------------------------------------------------ */

export interface ToastPayload {
  id: string;
  title: string;
  body: string;
  href?: string;
  cta?: string;
  tone?: "brand" | "success";
}

const ToastContext = createContext<((t: Omit<ToastPayload, "id">) => void) | null>(
  null
);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastPayload[]>([]);

  const push = useCallback((t: Omit<ToastPayload, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]);
    window.setTimeout(
      () => setToasts((prev) => prev.filter((x) => x.id !== id)),
      6500
    );
  }, []);

  const dismiss = useCallback(
    (id: string) => setToasts((prev) => prev.filter((x) => x.id !== id)),
    []
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastPayload[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-3 pt-3"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastPayload;
  onDismiss: (id: string) => void;
}) {
  const tone =
    toast.tone === "success"
      ? "border-green-500/30 bg-white"
      : "border-blue-500/25 bg-white";

  return (
    <div
      className={`animate-rise pointer-events-auto w-full max-w-md rounded-[18px] border ${tone} p-3 shadow-lift`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-navy-900 text-[11px] font-bold tracking-tight text-yellow-500"
        >
          CD
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            CelcomDigi AIdealist
          </p>
          <p className="mt-0.5 truncate text-[15px] font-semibold text-ink">
            {toast.title}
          </p>
          <p className="truncate text-sm text-ink-soft">{toast.body}</p>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="-m-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-blue-100"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
