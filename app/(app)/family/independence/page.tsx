"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, Button, Card, ScreenHeader, SecurityNote } from "@/components/ui";
import { IconAlert, IconArrowLeft, IconCheck, IconUsers } from "@/components/icons";
import { useAppLink, useCurrentUser, useDb } from "@/lib/hooks";
import {
  selectFamilyGroup,
  selectFamilyMember,
  selectTransferForMember,
  selectUser,
  startTransfer,
} from "@/lib/store";
import { ELIGIBILITY, type EligibilityOutcome } from "@/lib/family";

/**
 * Screen 3 — reassurance before verification. The customer is told what they
 * keep before they are asked for anything, and the eligibility check is named
 * up front so the next screen is not a surprise.
 */
export default function IndependencePage() {
  const db = useDb();
  const user = useCurrentUser();
  const router = useRouter();
  const link = useAppLink();
  const [checking, setChecking] = useState(false);

  if (!user) return null;

  const group = selectFamilyGroup(db, user.id);
  const mine = selectFamilyMember(db, user.id);
  const principal = selectUser(db, group?.principal_user_id ?? "");
  const transfer = selectTransferForMember(db, user.id);

  // A blocked transfer takes over the screen: the customer needs the obstacle
  // and the way past it, not the marketing.
  if (transfer && transfer.status === "BLOCKED") {
    return (
      <BlockedState
        outcome={transfer.eligibility}
        onBack={() => router.push(link("/family/manage"))}
      />
    );
  }

  function check() {
    if (!mine || checking) return;
    setChecking(true);
    // The presenter toolbar can force an exception; the default path is clear.
    const result = startTransfer(user!.id, "ELIGIBLE");
    window.setTimeout(() => {
      setChecking(false);
      if (result) router.push(link("/family/identity"));
    }, 700);
  }

  return (
    <div className="space-y-5">
      <ScreenHeader
        title="Ready for your own account?"
        backLabel="Back"
        onBack={() => router.push(link("/family/manage"))}
      />

      <Card className="text-center">
        <p className="text-[24px] font-bold leading-tight tracking-[-0.02em] text-ink">
          Keep your number.
          <br />
          Get your own account.
        </p>
        <p className="mt-3 inline-block rounded-full bg-blue-100 px-4 py-1.5 font-mono text-[18px] font-bold tracking-tight text-navy-900">
          {mine?.msisdn}
        </p>
      </Card>

      <ul className="space-y-2">
        {[
          `Keep ${mine?.msisdn ?? "your number"}`,
          "Stay connected during the transition",
          "Choose your own plan and billing",
        ].map((point) => (
          <li key={point} className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-green-500 text-white"
            >
              <IconCheck size={14} strokeWidth={3.2} />
            </span>
            <span className="text-[15.5px] font-semibold text-ink">{point}</span>
          </li>
        ))}
      </ul>

      {/* Before and after, side by side — the whole proposition in one glance. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
        <StateCard
          label="Today"
          topName={principal?.name ?? "Family"}
          topRole="Family account"
          bottomName={user.name}
          bottomRole="Supplementary"
          accent={principal?.accent}
          bottomAccent={user.accent}
        />
        <div className="flex items-center">
          <span
            aria-hidden="true"
            className="grid h-7 w-7 place-items-center rounded-full bg-blue-700 text-white"
          >
            <IconArrowLeft size={15} className="rotate-180" />
          </span>
        </div>
        <StateCard
          label="After transfer"
          topName={user.name}
          topRole="Own account"
          bottomName={mine?.msisdn ?? ""}
          bottomRole="Independent"
          accent={user.accent}
          bottomAccent={user.accent}
          highlight
        />
      </div>

      <SecurityNote>
        We&apos;ll first check your line, account and eligibility before making
        any changes.
      </SecurityNote>

      <Button onClick={check} disabled={checking} advance={!checking}>
        {checking ? "Checking your line…" : "Check my eligibility"}
      </Button>
    </div>
  );
}

function StateCard({
  label,
  topName,
  topRole,
  bottomName,
  bottomRole,
  accent,
  bottomAccent,
  highlight = false,
}: {
  label: string;
  topName: string;
  topRole: string;
  bottomName: string;
  bottomRole: string;
  accent?: string;
  bottomAccent?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-card p-3 text-center ${
        highlight ? "bg-navy-900 text-white" : "bg-surface shadow-soft"
      }`}
    >
      <p
        className={`text-[11px] font-bold uppercase tracking-wide ${
          highlight ? "text-blue-100/70" : "text-ink-soft"
        }`}
      >
        {label}
      </p>
      <div className="mt-2.5 flex flex-col items-center gap-1">
        <Avatar name={topName} accent={accent} size={34} />
        <p
          className={`text-[13.5px] font-bold leading-tight ${
            highlight ? "text-white" : "text-ink"
          }`}
        >
          {topName}
        </p>
        <p className={`text-[11px] ${highlight ? "text-white/60" : "text-ink-soft"}`}>
          {topRole}
        </p>
      </div>
      <div
        aria-hidden="true"
        className={`mx-auto my-2 h-4 w-px ${highlight ? "bg-white/25" : "bg-blue-100"}`}
      />
      <div className="flex flex-col items-center gap-1">
        <Avatar name={bottomName} accent={bottomAccent} size={28} />
        <p
          className={`break-all text-[12.5px] font-semibold leading-tight ${
            highlight ? "text-white" : "text-ink"
          }`}
        >
          {bottomName}
        </p>
        <p className={`text-[11px] ${highlight ? "text-white/60" : "text-ink-soft"}`}>
          {bottomRole}
        </p>
      </div>
    </div>
  );
}

/**
 * Exception states (brief §14). None of them dead-ends the customer: each one
 * names the obstacle and the next step, digital-first rather than digital-only.
 */
function BlockedState({
  outcome,
  onBack,
}: {
  outcome: EligibilityOutcome;
  onBack: () => void;
}) {
  const state = ELIGIBILITY[outcome];
  return (
    <div className="space-y-5">
      <ScreenHeader title="Before we continue" backLabel="Back" onBack={onBack} />

      <Card>
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-yellow-500/25 text-[#7A5A00]">
          <IconAlert size={24} />
        </span>
        <p className="text-[20px] font-bold leading-snug text-ink">{state.title}</p>
        <p className="mt-1.5 text-[15px] leading-snug text-ink-soft">{state.body}</p>
        <div className="mt-4">
          <Button advance>{state.cta}</Button>
        </div>
      </Card>

      {state.alternatives ? (
        <Card>
          <p className="mb-2.5 flex items-center gap-2 text-[15px] font-bold text-ink">
            <IconUsers size={18} className="text-blue-700" />
            Other ways to finish this
          </p>
          <ul className="space-y-2">
            {state.alternatives.map((a) => (
              <li
                key={a}
                className="flex items-center gap-2.5 rounded-tile bg-blue-100 px-3 py-2.5 text-[14.5px] font-semibold text-navy-900"
              >
                {a}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-ink-soft">
            Your progress is saved either way.
          </p>
        </Card>
      ) : null}

      <SecurityNote tone="lock">
        Nothing has changed on your line. You can come back to this at any time.
      </SecurityNote>
    </div>
  );
}
