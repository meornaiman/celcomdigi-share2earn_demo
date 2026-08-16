"use client";

import { Card } from "./ui";
import { IconAlert, IconCheck, IconLock, IconShield } from "./icons";
import {
  ASSURANCE,
  ASSURANCE_ORDER,
  type AssuranceLevel,
  type TrustSignal,
} from "@/lib/family";

/**
 * The three rungs, with the current action's rung lit. This is the picture the
 * brief asks the room to leave with: security scales to the action, it is not
 * removed. Low risk does not interrupt; high risk asks for proof.
 */
export function AssuranceLadder({
  active,
  compact = false,
}: {
  active: AssuranceLevel;
  compact?: boolean;
}) {
  return (
    <ol className="space-y-1.5">
      {ASSURANCE_ORDER.map((level) => {
        const def = ASSURANCE[level];
        const isActive = level === active;
        const passed = def.rung < ASSURANCE[active].rung;
        return (
          <li
            key={level}
            className={`flex items-center gap-3 rounded-tile border-2 px-3 py-2.5 transition ${
              isActive
                ? "border-blue-500 bg-blue-100"
                : "border-transparent bg-blue-100/40"
            }`}
          >
            <span
              aria-hidden="true"
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold ${
                isActive
                  ? "bg-blue-700 text-white"
                  : passed
                    ? "bg-green-500/20 text-[#1B8B3C]"
                    : "bg-white text-ink-soft"
              }`}
            >
              {passed ? <IconCheck size={14} strokeWidth={3} /> : def.rung}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block text-[15px] font-bold leading-tight ${
                  isActive ? "text-navy-900" : "text-ink-soft"
                }`}
              >
                {def.promise}
              </span>
              {!compact ? (
                <span className="block text-[12.5px] text-ink-soft">{def.name}</span>
              ) : null}
            </span>
            {isActive ? (
              <span className="shrink-0 rounded-full bg-blue-700 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                Now
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * What CelcomDigi already holds, and the single thing it still needs. Reused
 * signals are shown as settled facts so the customer sees the work they are
 * not being asked to repeat.
 */
export function TrustSignalList({ signals }: { signals: TrustSignal[] }) {
  return (
    <ul className="space-y-2">
      {signals.map((s) => {
        const established = s.state === "ESTABLISHED";
        return (
          <li key={s.id} className="flex items-start gap-2.5">
            <span
              aria-hidden="true"
              className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                established ? "bg-green-500 text-white" : "bg-yellow-500 text-navy-900"
              }`}
            >
              {established ? (
                <IconCheck size={12} strokeWidth={3.2} />
              ) : (
                <IconLock size={11} strokeWidth={2.6} />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold leading-snug text-ink">
                {s.label}
              </span>
              <span className="block text-[13px] leading-snug text-ink-soft">
                {s.detail}
              </span>
            </span>
            {!established ? (
              <span className="shrink-0 rounded-full bg-yellow-500/25 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#7A5A00]">
                Needed
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** Names the risk that triggered a step-up, so the ask never feels arbitrary. */
export function RiskBanner({
  action,
  level,
}: {
  action: string;
  level: AssuranceLevel;
}) {
  const def = ASSURANCE[level];
  return (
    <Card tone="tint" className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-yellow-500 text-navy-900">
        {level === "OWNERSHIP" ? <IconShield size={20} /> : <IconAlert size={19} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold leading-snug text-navy-900">{action}</p>
        <p className="text-[13.5px] leading-snug text-navy-900/70">
          {def.name} · {def.promise}
        </p>
      </div>
    </Card>
  );
}

/** The "why do I need this?" explainer, collapsed by default. */
export function WhyThisCheck({ level }: { level: AssuranceLevel }) {
  const def = ASSURANCE[level];
  return (
    <details className="rounded-card bg-surface p-4 shadow-soft">
      <summary className="cursor-pointer list-none text-[15px] font-bold text-blue-700 marker:hidden">
        Why do I need this?
      </summary>
      <p className="mt-2 text-[14px] leading-snug text-ink-soft">
        Sensitive account changes require stronger verification than everyday
        activities. Everything you have already verified is reused — only the
        checks below are added for this step.
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {def.checks.map((c) => (
          <li
            key={c}
            className="rounded-full bg-blue-100 px-2.5 py-1 text-[12px] font-semibold text-blue-700"
          >
            {c}
          </li>
        ))}
      </ul>
    </details>
  );
}
