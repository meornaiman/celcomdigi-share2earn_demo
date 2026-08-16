"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared presenter-mode chrome. Both demos sit on the same navy stage with the
 * same phone frames and toolbar rhythm, because the story is that they are two
 * journeys inside one product rather than two prototypes.
 */

export const DEMO_BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function DemoStage({
  title,
  subtitle,
  children,
  otherHref,
  otherLabel,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  otherHref: string;
  otherLabel: string;
}) {
  return (
    <div className="min-h-dvh bg-navy-900 text-white">
      <div className="mx-auto max-w-[1600px] px-5 py-6">
        <header className="flex flex-wrap items-center gap-4">
          <span
            aria-hidden="true"
            className="grid h-11 w-11 place-items-center rounded-[13px] bg-yellow-500 text-[13px] font-bold text-navy-900"
          >
            CD
          </span>
          <div className="mr-auto">
            <h1 className="text-[22px] font-bold tracking-[-0.02em]">{title}</h1>
            <p className="text-[14px] text-white/65">{subtitle}</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
            Realtime
          </span>
          <Link
            href={otherHref}
            className="rounded-btn border-2 border-white/25 px-4 py-2 text-[14px] font-semibold transition hover:bg-white/10"
          >
            {otherLabel}
          </Link>
          <Link
            href="/login"
            className="rounded-btn border-2 border-white/25 px-4 py-2 text-[14px] font-semibold transition hover:bg-white/10"
          >
            Open full app
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}

/** A phone bezel around one iframe, labelled with whose screen it is. */
export function DemoPhone({
  name,
  role,
  accent,
  src,
  ready,
}: {
  name: string;
  role: string;
  accent: string;
  src: string;
  ready: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="mb-3 flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="h-3 w-3 rounded-full"
          style={{ background: accent }}
        />
        <p className="text-[17px] font-bold">{name}</p>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[12px] font-semibold text-white/70">
          {role}
        </span>
      </div>

      <div className="w-full max-w-[392px] rounded-[42px] bg-black/45 p-2.5 shadow-lift ring-1 ring-white/10">
        <div className="relative overflow-hidden rounded-[34px] bg-canvas">
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black/80"
          />
          {ready ? (
            <iframe
              key={src}
              src={src}
              title={`${name} — ${role}`}
              className="h-[720px] w-full border-0"
            />
          ) : (
            <div className="h-[720px] w-full" />
          )}
        </div>
      </div>
    </div>
  );
}

export function DemoDivider() {
  return (
    <div className="hidden flex-col items-center justify-center gap-3 lg:flex">
      <span className="h-24 w-px bg-white/15" />
      <span className="rotate-90 whitespace-nowrap text-[12px] font-bold uppercase tracking-[0.2em] text-white/45">
        realtime
      </span>
      <span className="h-24 w-px bg-white/15" />
    </div>
  );
}

/**
 * The right-hand board panel. Business value and the security story sit beside
 * the product so the room reads both at once.
 */
export function ImpactPanel({
  impact,
  trust,
}: {
  impact: { label: string; detail: string; Icon: (p: { size?: number }) => ReactNode }[];
  trust: { label: string; Icon: (p: { size?: number }) => ReactNode }[];
}) {
  return (
    <aside className="w-full space-y-4 lg:w-[280px] lg:shrink-0">
      <section className="overflow-hidden rounded-card bg-white/8">
        <h2 className="bg-white/8 px-4 py-3 text-[15px] font-bold">
          Business impact
        </h2>
        <ul className="space-y-1 p-3">
          {impact.map(({ label, detail, Icon }) => (
            <li
              key={label}
              className="flex items-start gap-3 rounded-tile bg-white/6 px-3 py-2.5"
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-yellow-500 text-navy-900">
                <Icon size={17} />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-bold leading-tight">
                  {label}
                </span>
                <span className="block text-[12px] leading-snug text-white/60">
                  {detail}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="overflow-hidden rounded-card bg-white/8">
        <h2 className="bg-white/8 px-4 py-3 text-[15px] font-bold">
          Trust &amp; security
        </h2>
        <ul className="space-y-1 p-3">
          {trust.map(({ label, Icon }) => (
            <li
              key={label}
              className="flex items-center gap-3 rounded-tile bg-white/6 px-3 py-2.5"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-500/25 text-blue-100">
                <Icon size={17} />
              </span>
              <span className="text-[13.5px] font-semibold leading-tight">
                {label}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
