"use client";

/**
 * Prototype session handling (DESIGN.md §13). There are no permanent roles: the
 * signed-in user is an owner on one request and a helper on another, and the
 * screens decide which face to show from the request itself.
 */

const SESSION_KEY = "s2e.session.v1";

/**
 * The /demo screen renders two panels in one browser, so a persisted session
 * cannot distinguish them. An `?as=<userId>` parameter pins a panel to one
 * account for that frame only and is never written to storage.
 */
const AS_PARAM = "as";

const isBrowser = typeof window !== "undefined";

let current: string | null = null;
let pinned: string | null = null;
let initialised = false;
const listeners = new Set<() => void>();

function init() {
  if (initialised || !isBrowser) return;
  initialised = true;
  const params = new URLSearchParams(window.location.search);
  pinned = params.get(AS_PARAM);
  current = pinned ?? window.localStorage.getItem(SESSION_KEY);
}

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeSession(listener: () => void): () => void {
  init();
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    // Only follow another tab's sign-in when this frame is not pinned.
    if (e.key === SESSION_KEY && !pinned) {
      current = e.newValue;
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getSessionSnapshot(): string | null {
  init();
  return current;
}

export function getSessionServerSnapshot(): string | null {
  return null;
}

/** True when this frame is locked to an account by the demo screen. */
export function isPinnedSession(): boolean {
  init();
  return pinned !== null;
}

export function signIn(userId: string) {
  init();
  current = userId;
  if (!pinned && isBrowser) window.localStorage.setItem(SESSION_KEY, userId);
  emit();
}

export function signOut() {
  init();
  current = null;
  if (!pinned && isBrowser) window.localStorage.removeItem(SESSION_KEY);
  emit();
}

/**
 * Mock OTP (DESIGN.md §13). A code is generated per attempt and shown on screen
 * so the prototype can be demonstrated without an SMS gateway.
 */
export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
