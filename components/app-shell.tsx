"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  IconActivity,
  IconBell,
  IconGlobeLang,
  IconHelp,
  IconHome,
  IconProfile,
  IconRewards,
} from "./icons";
import { Avatar } from "./ui";
import { BrandLogo } from "./brand-logo";
import { useT, useToast, useLang } from "./providers";
import {
  useAppLink,
  useCurrentUser,
  useDb,
  useExpirySweep,
  useHydrated,
  useNotificationStream,
} from "@/lib/hooks";
import { markNotificationsRead, selectUnreadCount } from "@/lib/store";
import { LANGS } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";

const NAV: { href: string; key: TranslationKey; Icon: typeof IconHome }[] = [
  { href: "/home", key: "nav.home", Icon: IconHome },
  { href: "/help", key: "nav.help", Icon: IconHelp },
  { href: "/activity", key: "nav.activity", Icon: IconActivity },
  { href: "/rewards", key: "nav.rewards", Icon: IconRewards },
  { href: "/profile", key: "nav.profile", Icon: IconProfile },
];

/** Normalises "/home/" and "/home" so trailing-slash export URLs match. */
const samePath = (a: string, b: string) =>
  a.replace(/\/+$/, "") === b.replace(/\/+$/, "");

export function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const user = useCurrentUser();
  const router = useRouter();
  const link = useAppLink();

  useExpirySweep();

  // Static export cannot guard routes on the server, so the redirect happens
  // once the browser knows whether a session exists.
  const signedIn = !!user;
  useEffect(() => {
    if (hydrated && !signedIn) router.replace("/login");
  }, [hydrated, signedIn, router]);

  if (!hydrated || !user) return <BootSplash />;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-canvas">
      <TopBar />
      <main className="flex-1 px-4 pb-28 pt-3">{children}</main>
      <BottomNav link={link} />
    </div>
  );
}

function BootSplash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas">
      <div className="flex flex-col items-center gap-4">
        <BrandLogo height={34} />
        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-blue-100">
          <span className="block h-full w-1/2 animate-pulse rounded-full bg-blue-500" />
        </span>
        <span className="sr-only">Loading AIdealist</span>
      </div>
    </div>
  );
}

function TopBar() {
  const user = useCurrentUser();
  const db = useDb();
  const t = useT();
  const link = useAppLink();
  const toast = useToast();
  const pathname = usePathname();
  const { lang, setLang } = useLang();
  const [langOpen, setLangOpen] = useState(false);

  const unread = user ? selectUnreadCount(db, user.id) : 0;

  // Home opens on a navy band; the bar joins it instead of drawing a seam
  // across the top of the brand colour.
  const onNavy = samePath(pathname, "/home");

  // Every notification that lands while the app is open is surfaced as a card
  // in the same shape a Web Push payload would carry (DESIGN.md §9).
  useNotificationStream(user?.id ?? null, (n) => {
    toast({
      title: n.title,
      body: n.body,
      tone: n.type === "TASK_COMPLETED" ? "success" : "brand",
    });
  });

  if (!user) return null;

  return (
    <div
      className={`sticky top-0 z-30 flex items-center gap-2 px-4 py-2.5 transition-colors ${
        onNavy
          ? "bg-navy-900 text-white"
          : "border-b border-blue-100/80 bg-canvas/92 text-ink backdrop-blur"
      }`}
    >
      {/*
        AIdealist is the app. Share2Earn and Family Mobility are the journeys
        inside it, so the wordmark stays neutral between them.
      */}
      <Link
        href={link("/home")}
        className="flex items-center gap-2.5"
        aria-label="AIdealist home"
      >
        <BrandLogo variant="mark" height={26} plate />
        <span
          className={`text-[15px] font-bold tracking-[-0.01em] ${
            onNavy ? "text-white" : "text-ink"
          }`}
        >
          AIdealist
        </span>
      </Link>

      <div className="ml-auto flex items-center gap-1">
        <div className="relative">
          <button
            type="button"
            onClick={() => setLangOpen((v) => !v)}
            aria-expanded={langOpen}
            aria-label={t("common.language")}
            className={`flex h-11 items-center gap-1 rounded-full px-2.5 text-[13px] font-bold transition ${
              onNavy
                ? "text-blue-100 hover:bg-white/12"
                : "text-ink-soft hover:bg-blue-100"
            }`}
          >
            <IconGlobeLang size={19} />
            {LANGS.find((l) => l.code === lang)?.short}
          </button>
          {langOpen ? (
            <>
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                onClick={() => setLangOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <ul className="absolute right-0 top-12 z-20 w-44 overflow-hidden rounded-tile bg-surface py-1 shadow-lift">
                {LANGS.map((l) => (
                  <li key={l.code}>
                    <button
                      type="button"
                      onClick={() => {
                        setLang(l.code);
                        setLangOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[15px] transition hover:bg-blue-100 ${
                        l.code === lang ? "font-bold text-blue-700" : "text-ink"
                      }`}
                    >
                      {l.label}
                      {l.code === lang ? <span aria-hidden="true">✓</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <Link
          href={link("/activity")}
          onClick={() => markNotificationsRead(user.id)}
          aria-label={`${t("nav.activity")}${unread ? `, ${unread} unread` : ""}`}
          className={`relative grid h-11 w-11 place-items-center rounded-full transition ${
            onNavy
              ? "text-blue-100 hover:bg-white/12"
              : "text-ink-soft hover:bg-blue-100"
          }`}
        >
          <IconBell size={21} />
          {unread > 0 ? (
            <span className="absolute right-1.5 top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Link>

        <Link href={link("/profile")} aria-label={t("nav.profile")} className="ml-0.5">
          <Avatar name={user.name} accent={user.accent} size={36} />
        </Link>
      </div>
    </div>
  );
}

function BottomNav({ link }: { link: (href: string) => string }) {
  const pathname = usePathname();
  const t = useT();
  const db = useDb();
  const user = useCurrentUser();

  const pending = user
    ? db.help_requests.filter(
        (r) =>
          (r.helper_user_id === user.id &&
            ["SENT", "HELPER_VIEWED", "HELPER_ACCEPTED"].includes(r.status)) ||
          (r.owner_user_id === user.id &&
            ["RECOMMENDATION_SENT", "OWNER_REVIEWING"].includes(r.status))
      ).length
    : 0;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-lg border-t border-blue-100 bg-surface/96 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="flex">
        {NAV.map(({ href, key, Icon }) => {
          const active = samePath(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={link(href)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[60px] flex-col items-center justify-center gap-1 pt-1.5 text-[11px] font-semibold transition ${
                  active ? "text-blue-700" : "text-ink-soft"
                }`}
              >
                <span className="relative">
                  <Icon size={23} strokeWidth={active ? 2.2 : 1.8} />
                  {href === "/help" && pending > 0 ? (
                    <span
                      aria-hidden="true"
                      className="absolute -right-1.5 -top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
                    >
                      {pending}
                    </span>
                  ) : null}
                </span>
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
