"use client";

import { useEffect } from "react";

/**
 * Registers the offline shell. Scope is the deployed base path so the same
 * build works at "/" locally and at "/<repo>/" on GitHub Pages.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
      return;
    }
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {
      // A failed registration only costs offline support; the app still runs.
    });
  }, []);

  return null;
}
