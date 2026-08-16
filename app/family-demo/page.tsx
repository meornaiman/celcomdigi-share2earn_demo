"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEMO_BASE,
  DemoDivider,
  DemoPhone,
  DemoStage,
  ImpactPanel,
} from "@/components/demo-chrome";
import {
  IconChart,
  IconCheck,
  IconData,
  IconFaceId,
  IconLock,
  IconRefresh,
  IconShield,
  IconUsers,
} from "@/components/icons";
import { timeAgo, useDb, useHydrated } from "@/lib/hooks";
import {
  completeTransfer,
  configureTransfer,
  confirmTransferIdentity,
  decideFamilyData,
  principalDecide,
  requestFamilyData,
  requestPrincipalApproval,
  resetDemo,
  selectPendingDataRequests,
  selectTransferForMember,
  setTransferEligibility,
  startTransfer,
} from "@/lib/store";
import {
  DEMO_MESSAGE,
  ELIGIBILITY,
  INDEPENDENT_PLANS,
  TRUST_SIGNALS,
  type EligibilityOutcome,
} from "@/lib/family";

const MEMBER = { id: "u_aina", name: "Aina", role: "Supplementary line" };
const PRINCIPAL = { id: "u_mum", name: "Mum", role: "Family account owner" };

/**
 * The demo opens on the family dashboard, so the script starts at the first
 * action rather than at "show the screen you are already looking at".
 */
const SCRIPT = [
  { key: "ELIGIBLE", label: "Check eligibility", hint: "The line is checked before anything is asked of her" },
  { key: "IDENTITY", label: "Adaptive identity", hint: "Three signals reused, one confirmation added" },
  { key: "SETUP", label: "Set up account", hint: "Her own plan and billing, then ask the owner" },
  { key: "APPROVE", label: "Principal approves", hint: "Mum confirms it's her, then releases the line" },
] as const;

type StepKey = (typeof SCRIPT)[number]["key"];

const IMPACT = [
  { label: "Higher digital completion", detail: "Lifecycle change finishes in-app", Icon: IconChart },
  { label: "Lower store and call reliance", detail: "No branch visit to change ownership", Icon: IconUsers },
  { label: "Reduced lifecycle churn", detail: "Leaving the family account is not leaving CelcomDigi", Icon: IconRefresh },
  { label: "Supplementary to principal", detail: "A dependent line becomes an account holder", Icon: IconData },
];

const TRUST = [
  { label: "Adaptive verification", Icon: IconShield },
  { label: "Existing trust reused", Icon: IconCheck },
  { label: "Owner consent required", Icon: IconUsers },
  { label: "Sensitive actions protected", Icon: IconLock },
];

const EXCEPTIONS: EligibilityOutcome[] = [
  "ACTIVE_CONTRACT",
  "OUTSTANDING_BALANCE",
  "IDENTITY_CONFIDENCE",
  "NOT_DIGITAL",
];

export default function FamilyDemoPage() {
  const hydrated = useHydrated();
  const db = useDb();

  const [ainaPath, setAinaPath] = useState("/family/");
  const [mumPath, setMumPath] = useState("/family/");
  const [busy, setBusy] = useState(false);

  const transfer = selectTransferForMember(db, MEMBER.id);
  const pendingData = selectPendingDataRequests(db, PRINCIPAL.id)[0] ?? null;

  // Keyed on the status string, not the record: the store mutates records in
  // place, so a memo keyed on the object would never recompute.
  const status = transfer?.status;
  const done: Record<StepKey, boolean> = useMemo(() => {
    const s = status;
    return {
      ELIGIBLE: !!s && s !== "NOT_STARTED",
      IDENTITY: !!s && !["ELIGIBILITY_CHECKED", "BLOCKED"].includes(s),
      SETUP:
        !!s &&
        ["AWAITING_PRINCIPAL", "PRINCIPAL_APPROVED", "COMPLETED", "PRINCIPAL_DECLINED"].includes(s),
      APPROVE: s === "COMPLETED",
    };
  }, [status]);

  // Keeps the principal's panel on the request while one is waiting, so the
  // consent step is visible without the presenter driving it manually.
  useEffect(() => {
    if (transfer?.status === "AWAITING_PRINCIPAL") setMumPath("/family/approve/");
  }, [transfer?.status]);

  function run(step: StepKey) {
    if (busy) return;
    setBusy(true);
    try {
      if (step === "ELIGIBLE") {
        startTransfer(MEMBER.id, "ELIGIBLE");
        setAinaPath("/family/independence/");
        return;
      }
      if (!transfer) return;

      if (step === "IDENTITY") {
        confirmTransferIdentity(
          transfer.id,
          "Face ID",
          TRUST_SIGNALS.filter((s) => s.state === "ESTABLISHED").map((s) => s.id)
        );
        setAinaPath("/family/identity/");
        return;
      }
      if (step === "SETUP") {
        configureTransfer(transfer.id, INDEPENDENT_PLANS[0].id, "card");
        requestPrincipalApproval(transfer.id);
        setAinaPath("/family/success/");
        setMumPath("/family/approve/");
        return;
      }
      if (step === "APPROVE") {
        principalDecide(transfer.id, PRINCIPAL.id, true);
        completeTransfer(transfer.id);
        setAinaPath("/family/success/");
        setMumPath("/family/");
      }
    } finally {
      window.setTimeout(() => setBusy(false), 220);
    }
  }

  function askForData() {
    if (busy) return;
    setBusy(true);
    requestFamilyData(MEMBER.id, 10, "Working from home this month");
    setAinaPath("/family/data/");
    setMumPath("/family/data/");
    window.setTimeout(() => setBusy(false), 220);
  }

  function approveData() {
    if (busy || !pendingData) return;
    setBusy(true);
    decideFamilyData(pendingData.id, PRINCIPAL.id, true);
    setAinaPath("/family/data/");
    setMumPath("/family/data/");
    window.setTimeout(() => setBusy(false), 220);
  }

  function showException(outcome: EligibilityOutcome) {
    const t = transfer ?? startTransfer(MEMBER.id, outcome);
    if (t) setTransferEligibility(t.id, outcome);
    setAinaPath("/family/independence/");
  }

  function fullReset() {
    resetDemo();
    setAinaPath("/family/");
    setMumPath("/family/");
  }

  const nextStep = SCRIPT.find((s) => !done[s.key]);

  return (
    <DemoStage
      title="Family Mobility — presenter mode"
      subtitle="Powered by Adaptive Identity. Same number, own account."
      otherHref="/demo"
      otherLabel="Share2Earn demo"
    >
      <section className="mt-6 rounded-card bg-white/8 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {SCRIPT.map((step, i) => {
            const complete = done[step.key];
            const isNext = !complete && SCRIPT.slice(0, i).every((s) => done[s.key]);
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => run(step.key)}
                disabled={busy || complete || !isNext}
                title={step.hint}
                className={`inline-flex min-h-[46px] items-center gap-2 rounded-btn px-4 text-[15px] font-semibold transition disabled:cursor-not-allowed ${
                  complete
                    ? "bg-green-500/20 text-green-500"
                    : isNext
                      ? "bg-yellow-500 text-navy-900 hover:bg-yellow-300"
                      : "bg-white/10 text-white/40"
                }`}
              >
                {complete ? <IconCheck size={17} strokeWidth={2.8} /> : null}
                <span className="tabular-nums opacity-60">{i + 1}</span>
                {step.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={fullReset}
            className="ml-auto inline-flex min-h-[46px] items-center gap-2 rounded-btn border-2 border-white/25 px-4 text-[15px] font-semibold transition hover:bg-white/10"
          >
            <IconRefresh size={17} />
            Reset demo
          </button>
        </div>

        <p className="mt-3 text-[14px] text-white/65">
          {nextStep ? nextStep.hint : "Aina is an independent CelcomDigi customer."}
        </p>

        {/*
          A second, shorter track. Sharing data is a CHANGE-level action, so the
          owner is asked to confirm rather than to prove — the contrast with the
          transfer above is the whole point of the adaptive model.
        */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
          <span className="text-[12px] font-bold uppercase tracking-wide text-white/45">
            Data sharing
          </span>
          <button
            type="button"
            onClick={askForData}
            disabled={busy || !!pendingData}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-white/10 px-3.5 text-[13px] font-semibold transition hover:bg-white/20 disabled:opacity-40"
          >
            Aina asks for 10GB
          </button>
          <button
            type="button"
            onClick={approveData}
            disabled={busy || !pendingData}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-white/10 px-3.5 text-[13px] font-semibold transition hover:bg-white/20 disabled:opacity-40"
          >
            Mum confirms and shares
          </button>
          <span className="text-[12px] text-white/45">
            Confirm it&apos;s me — not prove it&apos;s me
          </span>
        </div>

        {/* The unhappy paths are one click away, because that is what a board asks about. */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
          <span className="text-[12px] font-bold uppercase tracking-wide text-white/45">
            Exception states
          </span>
          {EXCEPTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => showException(e)}
              className="rounded-full bg-white/10 px-3 py-1.5 text-[12.5px] font-semibold transition hover:bg-white/20"
            >
              {ELIGIBILITY[e].title}
            </button>
          ))}
        </div>

        {transfer ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="rounded-full bg-white/10 px-2.5 py-1 font-mono font-semibold">
              {transfer.id}
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 font-semibold">
              {transfer.msisdn}
            </span>
            <span className="rounded-full bg-yellow-500/25 px-2.5 py-1 font-semibold text-yellow-300">
              {transfer.status}
            </span>
            {transfer.reused_signals.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 px-2.5 py-1 font-semibold text-green-500">
                <IconFaceId size={14} />
                {transfer.reused_signals.length} signals reused
              </span>
            ) : null}
            <span className="text-white/50">{timeAgo(transfer.created_at)}</span>
          </div>
        ) : null}
      </section>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="grid flex-1 gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <DemoPhone
            name={MEMBER.name}
            role={MEMBER.role}
            accent="#FFD400"
            ready={hydrated}
            src={`${DEMO_BASE}${ainaPath}?as=${MEMBER.id}`}
          />
          <DemoDivider />
          <DemoPhone
            name={PRINCIPAL.name}
            role={PRINCIPAL.role}
            accent="#0057D9"
            ready={hydrated}
            src={`${DEMO_BASE}${mumPath}?as=${PRINCIPAL.id}`}
          />
        </div>

        <ImpactPanel impact={IMPACT} trust={TRUST} />
      </div>

      <p className="mx-auto mt-8 max-w-3xl text-center text-[17px] font-semibold leading-snug text-white/80">
        “{DEMO_MESSAGE}”
      </p>
    </DemoStage>
  );
}
