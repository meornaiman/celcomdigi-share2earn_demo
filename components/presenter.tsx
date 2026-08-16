"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DEMO_BASE,
  DemoDivider,
  DemoPhone,
  DemoStage,
  ImpactPanel,
} from "./demo-chrome";
import {
  IconChart,
  IconCheck,
  IconData,
  IconHelp,
  IconLock,
  IconRefresh,
  IconShield,
  IconUsers,
} from "./icons";
import { timeAgo, useDb, useHydrated } from "@/lib/hooks";
import {
  approveRecommendation,
  completeRequest,
  completeTransfer,
  configureTransfer,
  confirmTransferIdentity,
  createHelpRequest,
  decideFamilyData,
  principalDecide,
  requestFamilyData,
  requestPrincipalApproval,
  resetDemo,
  selectFamilyGroup,
  selectOptions,
  selectPendingDataRequests,
  selectRequest,
  selectTransferForMember,
  sendRecommendation,
  setTransferEligibility,
  startTransfer,
} from "@/lib/store";
import {
  ELIGIBILITY,
  INDEPENDENT_PLANS,
  TRUST_SIGNALS,
  type EligibilityOutcome,
} from "@/lib/family";
import {
  FEATURE_COVERAGE,
  TRACKS,
  TRACK_ORDER,
  type TrackId,
} from "@/lib/presenter";
import { TASKS } from "@/lib/tasks";

const OWNER_ID = "u_mum";
const HELPER_ID = "u_aina";

const IMPACT = {
  share2earn: [
    { label: "Higher self-service", detail: "Tasks finish in-app instead of stalling", Icon: IconChart },
    { label: "Lower call centre reliance", detail: "A trusted person answers first", Icon: IconHelp },
    { label: "Better app engagement", detail: "Two customers active per request", Icon: IconUsers },
    { label: "More digital transactions", detail: "Assisted purchases the owner approves", Icon: IconData },
  ],
  family: [
    { label: "Higher digital completion", detail: "Lifecycle change finishes in-app", Icon: IconChart },
    { label: "Lower store and call reliance", detail: "No branch visit to change ownership", Icon: IconUsers },
    { label: "Reduced lifecycle churn", detail: "Leaving the family account is not leaving CelcomDigi", Icon: IconRefresh },
    { label: "Supplementary to principal", detail: "A dependent line becomes an account holder", Icon: IconData },
  ],
  data: [
    { label: "Fewer bill shocks", detail: "Limits agreed instead of discovered", Icon: IconChart },
    { label: "Owner stays in control", detail: "Members ask, they cannot take", Icon: IconLock },
    { label: "Household retention", detail: "The family plan keeps earning its place", Icon: IconUsers },
    { label: "Upsell moment", detail: "A top-up request is a conversation", Icon: IconData },
  ],
} as const;

const TRUST = {
  share2earn: [
    { label: "Task-based permission", Icon: IconLock },
    { label: "Owner approval required", Icon: IconCheck },
    { label: "Sensitive data protected", Icon: IconShield },
  ],
  family: [
    { label: "Adaptive verification", Icon: IconShield },
    { label: "Existing trust reused", Icon: IconCheck },
    { label: "Owner consent required", Icon: IconUsers },
    { label: "Sensitive actions protected", Icon: IconLock },
  ],
  data: [
    { label: "Confirm it's me, not prove it's me", Icon: IconShield },
    { label: "Owner sets every limit", Icon: IconLock },
    { label: "Asking never changes an allowance", Icon: IconCheck },
  ],
} as const;

const EXCEPTIONS: EligibilityOutcome[] = [
  "ACTIVE_CONTRACT",
  "OUTSTANDING_BALANCE",
  "IDENTITY_CONFIDENCE",
  "NOT_DIGITAL",
];

interface Step {
  key: string;
  label: string;
  hint: string;
}

const SCRIPTS: Record<TrackId, Step[]> = {
  share2earn: [
    { key: "REQUEST", label: "Trigger request", hint: "Mum asks Aina about Thailand roaming" },
    { key: "RECOMMEND", label: "Trigger recommendation", hint: "Aina recommends the 3-Day Pass" },
    { key: "APPROVE", label: "Approve", hint: "Mum approves — the only step that acts" },
    { key: "COMPLETE", label: "Complete", hint: "Task executes and both sides are rewarded" },
  ],
  family: [
    { key: "ELIGIBLE", label: "Check eligibility", hint: "The line is checked before anything is asked of her" },
    { key: "IDENTITY", label: "Adaptive identity", hint: "Three signals reused, one confirmation added" },
    { key: "SETUP", label: "Set up account", hint: "Her own plan and billing, then ask the owner" },
    { key: "APPROVE_TRANSFER", label: "Owner approves", hint: "Mum confirms it's her, then releases the line" },
  ],
  data: [
    { key: "ASK_DATA", label: "Aina asks for 10GB", hint: "She can ask for more of the pool, not take it" },
    { key: "SHARE_DATA", label: "Mum confirms and shares", hint: "Confirm it's me — a change, not an ownership move" },
  ],
};

export function Presenter({ defaultTrack }: { defaultTrack: TrackId }) {
  const hydrated = useHydrated();
  const db = useDb();

  const [track, setTrack] = useState<TrackId>(defaultTrack);
  const [leftPath, setLeftPath] = useState(TRACKS[defaultTrack].leftStart);
  const [rightPath, setRightPath] = useState(TRACKS[defaultTrack].rightStart);
  const [drive, setDrive] = useState<"left" | "right">("left");
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);

  const config = TRACKS[track];
  const request = selectRequest(db, requestId);
  const transfer = selectTransferForMember(db, HELPER_ID);
  const pendingData = selectPendingDataRequests(db, OWNER_ID)[0] ?? null;
  const approvedData = db.data_requests.find((r) => r.status === "APPROVED") ?? null;
  const memberInFamily = !!selectFamilyGroup(db, HELPER_ID);

  useEffect(() => {
    if (requestId || db.help_requests.length === 0) return;
    setRequestId(db.help_requests[db.help_requests.length - 1].id);
  }, [db.help_requests, requestId]);

  // Keeps the owner's phone on the request while one is waiting on them.
  useEffect(() => {
    if (track === "family" && transfer?.status === "AWAITING_PRINCIPAL") {
      setRightPath("/family/approve/");
    }
  }, [track, transfer?.status]);

  function switchTrack(next: TrackId) {
    setTrack(next);
    setLeftPath(TRACKS[next].leftStart);
    setRightPath(TRACKS[next].rightStart);
  }

  // Keyed on status strings, not records: the store mutates records in place.
  const requestStatus = request?.status;
  const transferStatus = transfer?.status;
  const done: Record<string, boolean> = useMemo(
    () => ({
      REQUEST: !!requestStatus,
      RECOMMEND:
        !!requestStatus &&
        !["SENT", "HELPER_VIEWED", "HELPER_ACCEPTED"].includes(requestStatus),
      APPROVE:
        !!requestStatus &&
        ["OWNER_APPROVED", "EXECUTING", "COMPLETED"].includes(requestStatus),
      COMPLETE: requestStatus === "COMPLETED",
      ELIGIBLE: !!transferStatus && transferStatus !== "NOT_STARTED",
      IDENTITY:
        !!transferStatus &&
        !["ELIGIBILITY_CHECKED", "BLOCKED"].includes(transferStatus),
      SETUP:
        !!transferStatus &&
        ["AWAITING_PRINCIPAL", "PRINCIPAL_APPROVED", "COMPLETED", "PRINCIPAL_DECLINED"].includes(
          transferStatus
        ),
      APPROVE_TRANSFER: transferStatus === "COMPLETED",
      ASK_DATA: !!pendingData || !!approvedData,
      SHARE_DATA: !!approvedData,
    }),
    [requestStatus, transferStatus, pendingData, approvedData]
  );

  function run(key: string) {
    if (busy) return;
    setBusy(true);
    try {
      switch (key) {
        case "REQUEST": {
          const start = new Date();
          start.setMonth(start.getMonth() + 1, 15);
          const end = new Date(start);
          end.setDate(22);
          const month = start.toLocaleDateString("en-GB", { month: "long" });
          const req = createHelpRequest({
            ownerId: OWNER_ID,
            helperId: HELPER_ID,
            taskType: "ROAMING",
            context: {
              headline: `Thailand roaming, 15–22 ${month}`,
              destination: "Thailand",
              start_date: start.toISOString().slice(0, 10),
              end_date: end.toISOString().slice(0, 10),
              note: "Going to Bangkok with your dad. Which one should I get?",
            },
          });
          setRequestId(req.id);
          setLeftPath(`/request/?id=${req.id}&sent=1`);
          setRightPath(`/request/?id=${req.id}`);
          return;
        }
        case "RECOMMEND": {
          if (!requestId) return;
          const options = selectOptions(db, requestId);
          const pick = options.find((o) => o.title.startsWith("3-Day")) ?? options[0];
          if (!pick) return;
          sendRecommendation(
            requestId,
            HELPER_ID,
            pick.id,
            "3 days is enough for your trip and it's the best value."
          );
          setLeftPath(`/request/?id=${requestId}`);
          setRightPath(`/request/?id=${requestId}`);
          return;
        }
        case "APPROVE":
          if (requestId) approveRecommendation(requestId, OWNER_ID);
          return;
        case "COMPLETE":
          if (requestId) completeRequest(requestId);
          return;

        case "ELIGIBLE":
          startTransfer(HELPER_ID, "ELIGIBLE");
          setLeftPath("/family/independence/");
          return;
        case "IDENTITY":
          if (!transfer) return;
          confirmTransferIdentity(
            transfer.id,
            "Face ID",
            TRUST_SIGNALS.filter((s) => s.state === "ESTABLISHED").map((s) => s.id)
          );
          setLeftPath("/family/identity/");
          return;
        case "SETUP":
          if (!transfer) return;
          configureTransfer(transfer.id, INDEPENDENT_PLANS[0].id, "card");
          requestPrincipalApproval(transfer.id);
          setLeftPath("/family/success/");
          setRightPath("/family/approve/");
          return;
        case "APPROVE_TRANSFER":
          if (!transfer) return;
          principalDecide(transfer.id, OWNER_ID, true);
          completeTransfer(transfer.id);
          setLeftPath("/family/success/");
          setRightPath("/family/");
          return;

        case "ASK_DATA":
          requestFamilyData(HELPER_ID, 10, "Working from home this month");
          setLeftPath("/family/data/");
          setRightPath("/family/data/");
          return;
        case "SHARE_DATA":
          if (!pendingData) return;
          decideFamilyData(pendingData.id, OWNER_ID, true);
          setLeftPath("/family/data/");
          setRightPath("/family/data/");
          return;
      }
    } finally {
      window.setTimeout(() => setBusy(false), 220);
    }
  }

  function showException(outcome: EligibilityOutcome) {
    const t = transfer ?? startTransfer(HELPER_ID, outcome);
    if (t) setTransferEligibility(t.id, outcome);
    setLeftPath("/family/independence/");
    setTrack("family");
  }

  function jump(path: string) {
    if (drive === "left") setLeftPath(path);
    else setRightPath(path);
  }

  function fullReset() {
    resetDemo();
    setRequestId(null);
    setLeftPath(config.leftStart);
    setRightPath(config.rightStart);
  }

  const script = SCRIPTS[track];
  const nextStep = script.find((s) => !done[s.key]);

  const withPin = (path: string, id: string) =>
    `${DEMO_BASE}${path}${path.includes("?") ? "&" : "?"}as=${id}`;

  return (
    <DemoStage
      title="AIdealist — presenter mode"
      subtitle="Every journey in the prototype, driven from one place."
    >
      {/* Journey switcher: the whole product, not one demo at a time. */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {TRACK_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => switchTrack(id)}
            aria-pressed={track === id}
            className={`min-h-[44px] rounded-full px-5 text-[15px] font-bold transition ${
              track === id
                ? "bg-white text-navy-900"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            {TRACKS[id].label}
          </button>
        ))}
        <p className="ml-2 text-[14px] italic text-white/55">“{config.claim}”</p>
      </div>

      <section className="mt-4 rounded-card bg-white/8 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {script.map((step, i) => {
            const complete = done[step.key];
            const isNext = !complete && script.slice(0, i).every((s) => done[s.key]);
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
          {nextStep ? nextStep.hint : "This journey is complete."}
        </p>

        {/*
          Once Aina is independent she is no longer in the family pool, so the
          data track has nothing to share. That is the product working, not a
          fault — say so, and offer the one click that restores the setup.
        */}
        {track === "data" && !memberInFamily ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-tile bg-yellow-500/15 px-3.5 py-3">
            <span className="text-[14px] text-yellow-300">
              Aina has already moved to her own account, so she is no longer in
              the family pool. Reset to show data sharing.
            </span>
            <button
              type="button"
              onClick={fullReset}
              className="ml-auto inline-flex min-h-[38px] items-center gap-2 rounded-full bg-yellow-500 px-3.5 text-[13px] font-bold text-navy-900 transition hover:bg-yellow-300"
            >
              <IconRefresh size={15} />
              Reset and show
            </button>
          </div>
        ) : null}

        {track === "family" ? (
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
        ) : null}

        <StatusChips
          request={request ? { id: request.id, status: request.status, task: TASKS[request.task_type].label, at: request.created_at } : null}
          transfer={transfer}
          dataStatus={approvedData ? "APPROVED" : pendingData ? "PENDING" : null}
        />
      </section>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="grid flex-1 gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <DemoPhone
            name={config.left.name}
            role={config.left.role}
            accent={config.left.accent}
            ready={hydrated}
            src={withPin(leftPath, config.left.id)}
          />
          <DemoDivider />
          <DemoPhone
            name={config.right.name}
            role={config.right.role}
            accent={config.right.accent}
            ready={hydrated}
            src={withPin(rightPath, config.right.id)}
          />
        </div>

        <ImpactPanel impact={[...IMPACT[track]]} trust={[...TRUST[track]]} />
      </div>

      {/* Any screen, on either phone, without leaving the dashboard. */}
      <section className="mt-8 rounded-card bg-white/8 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-[15px] font-bold">Jump to any screen</h2>
          <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
            {(["left", "right"] as const).map((side) => {
              const person = side === "left" ? config.left : config.right;
              return (
                <button
                  key={side}
                  type="button"
                  onClick={() => setDrive(side)}
                  aria-pressed={drive === side}
                  className={`min-h-[34px] rounded-full px-3.5 text-[13px] font-bold transition ${
                    drive === side ? "bg-white text-navy-900" : "text-white/70"
                  }`}
                >
                  {person.name}
                </button>
              );
            })}
          </div>
          <span className="text-[13px] text-white/50">
            Sends {drive === "left" ? config.left.name : config.right.name} to that screen
          </span>
          <Link
            href="/admin"
            className="ml-auto rounded-full border-2 border-white/25 px-3.5 py-1.5 text-[13px] font-semibold transition hover:bg-white/10"
          >
            Admin dashboard
          </Link>
        </div>
        <ul className="flex flex-wrap gap-2">
          {config.screens.map((s) => (
            <li key={s.path}>
              <button
                type="button"
                onClick={() => jump(s.path)}
                className="rounded-full bg-white/10 px-3.5 py-2 text-[13px] font-semibold transition hover:bg-white/20"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        {FEATURE_COVERAGE.map((group) => (
          <div key={group.group} className="rounded-card bg-white/8 p-4">
            <h3 className="mb-2.5 text-[14px] font-bold">{group.group}</h3>
            <ul className="space-y-1.5">
              {group.items.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <IconCheck
                    size={14}
                    strokeWidth={3}
                    className="mt-1 shrink-0 text-green-500"
                  />
                  <span className="text-[13px] leading-snug text-white/75">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <EventTicker />
    </DemoStage>
  );
}

function StatusChips({
  request,
  transfer,
  dataStatus,
}: {
  request: { id: string; status: string; task: string; at: string } | null;
  transfer: { id: string; status: string; msisdn: string } | null;
  dataStatus: string | null;
}) {
  if (!request && !transfer && !dataStatus) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
      {request ? (
        <>
          <Chip mono>{request.id}</Chip>
          <Chip>{request.task}</Chip>
          <Chip tone="yellow">{request.status}</Chip>
          <span className="text-white/50">{timeAgo(request.at)}</span>
        </>
      ) : null}
      {transfer ? (
        <>
          <Chip mono>{transfer.id}</Chip>
          <Chip>{transfer.msisdn}</Chip>
          <Chip tone="yellow">{transfer.status}</Chip>
        </>
      ) : null}
      {dataStatus ? <Chip tone="green">DATA {dataStatus}</Chip> : null}
    </div>
  );
}

function Chip({
  children,
  tone = "plain",
  mono = false,
}: {
  children: React.ReactNode;
  tone?: "plain" | "yellow" | "green";
  mono?: boolean;
}) {
  const tones = {
    plain: "bg-white/10",
    yellow: "bg-yellow-500/25 text-yellow-300",
    green: "bg-green-500/20 text-green-500",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-semibold ${tones[tone]} ${
        mono ? "font-mono" : ""
      }`}
    >
      {children}
    </span>
  );
}

/** Live view of the tracked events, so the analytics story is visible too. */
function EventTicker() {
  const db = useDb();
  const events = db.events.slice(0, 8);
  if (events.length === 0) return null;

  return (
    <section className="mt-6 rounded-card bg-white/8 p-4">
      <h2 className="mb-3 text-[15px] font-bold">Event stream</h2>
      <ul className="space-y-1.5">
        {events.map((e) => (
          <li
            key={e.id}
            className="flex flex-wrap items-center gap-2 font-mono text-[12px] text-white/70"
          >
            <span className="font-semibold text-yellow-300">{e.name}</span>
            <span>user={e.user_id}</span>
            {e.help_request_id ? <span>ref={e.help_request_id}</span> : null}
            {e.task_type ? <span>task={e.task_type}</span> : null}
            <span className="text-white/40">{timeAgo(e.timestamp)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
