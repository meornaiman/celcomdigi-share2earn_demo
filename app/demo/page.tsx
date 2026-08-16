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
  IconHelp,
  IconLock,
  IconRefresh,
  IconShield,
  IconUsers,
} from "@/components/icons";
import { timeAgo, useDb, useHydrated } from "@/lib/hooks";
import {
  approveRecommendation,
  completeRequest,
  createHelpRequest,
  resetDemo,
  selectOptions,
  selectRequest,
  sendRecommendation,
} from "@/lib/store";
import { TASKS } from "@/lib/tasks";

const OWNER = { id: "u_mum", name: "Mum", role: "Account owner" };
const HELPER = { id: "u_aina", name: "Aina", role: "Trusted helper" };

/** The scripted Thailand roaming run from DESIGN.md §18. */
const SCRIPT = [
  { key: "REQUEST", label: "Trigger request", hint: "Mum asks Aina about Thailand roaming" },
  { key: "RECOMMEND", label: "Trigger recommendation", hint: "Aina recommends the 3-Day Pass" },
  { key: "APPROVE", label: "Approve", hint: "Mum approves — this is the only step that acts" },
  { key: "COMPLETE", label: "Complete", hint: "Task executes and both sides are rewarded" },
] as const;

type StepKey = (typeof SCRIPT)[number]["key"];

const IMPACT = [
  { label: "Higher self-service", detail: "Tasks finish in-app instead of stalling", Icon: IconChart },
  { label: "Lower call centre reliance", detail: "A trusted person answers first", Icon: IconHelp },
  { label: "Better app engagement", detail: "Two customers active per request", Icon: IconUsers },
  { label: "More digital transactions", detail: "Assisted purchases the owner approves", Icon: IconData },
];

const TRUST = [
  { label: "Task-based permission", Icon: IconLock },
  { label: "Owner approval required", Icon: IconCheck },
  { label: "Sensitive data protected", Icon: IconShield },
];

export default function DemoPage() {
  const hydrated = useHydrated();
  const db = useDb();

  const [requestId, setRequestId] = useState<string | null>(null);
  const [ownerPath, setOwnerPath] = useState("/home/");
  const [helperPath, setHelperPath] = useState("/home/");
  const [busy, setBusy] = useState(false);

  const request = selectRequest(db, requestId);

  // Picks up a run that is already in flight, so reloading the presenter view
  // mid-demo does not lose the thread.
  useEffect(() => {
    if (requestId || db.help_requests.length === 0) return;
    const latest = db.help_requests[db.help_requests.length - 1];
    setRequestId(latest.id);
  }, [db.help_requests, requestId]);

  // Keyed on the status string, not the record: the store mutates records in
  // place, so a memo keyed on the object would never recompute.
  const status = request?.status;
  const done: Record<StepKey, boolean> = useMemo(() => {
    return {
      REQUEST: !!request,
      RECOMMEND: !!status && !["SENT", "HELPER_VIEWED", "HELPER_ACCEPTED"].includes(status),
      APPROVE: !!status && ["OWNER_APPROVED", "EXECUTING", "COMPLETED"].includes(status),
      COMPLETE: status === "COMPLETED",
    };
  }, [status, request]);

  function runStep(step: StepKey) {
    if (busy) return;
    setBusy(true);
    try {
      if (step === "REQUEST") {
        // The 15th–22nd of next month, matching the trip the demo script tells.
        const start = new Date();
        start.setMonth(start.getMonth() + 1, 15);
        const end = new Date(start);
        end.setDate(22);
        const month = start.toLocaleDateString("en-GB", { month: "long" });
        const req = createHelpRequest({
          ownerId: OWNER.id,
          helperId: HELPER.id,
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
        setHelperPath(`/request/?id=${req.id}`);
        setOwnerPath(`/request/?id=${req.id}&sent=1`);
        return;
      }

      if (!requestId) return;

      if (step === "RECOMMEND") {
        const options = selectOptions(db, requestId);
        const threeDay = options.find((o) => o.title.startsWith("3-Day")) ?? options[0];
        if (!threeDay) return;
        sendRecommendation(
          requestId,
          HELPER.id,
          threeDay.id,
          "3 days is enough for your trip and it's the best value."
        );
        setOwnerPath(`/request/?id=${requestId}`);
        setHelperPath(`/request/?id=${requestId}`);
        return;
      }

      if (step === "APPROVE") {
        approveRecommendation(requestId, OWNER.id);
        setOwnerPath(`/request/?id=${requestId}`);
        return;
      }

      if (step === "COMPLETE") {
        completeRequest(requestId);
        setOwnerPath(`/request/?id=${requestId}`);
        setHelperPath(`/request/?id=${requestId}`);
      }
    } finally {
      // Lets the store broadcast settle before the next click is accepted.
      window.setTimeout(() => setBusy(false), 220);
    }
  }

  function fullReset() {
    resetDemo();
    setRequestId(null);
    setOwnerPath("/home/");
    setHelperPath("/home/");
  }

  const nextStep = SCRIPT.find((s) => !done[s.key]);

  return (
    <DemoStage
      title="Share2Earn — presenter mode"
      subtitle="Two accounts, one browser, live sync between both panels."
      otherHref="/family-demo"
      otherLabel="Family Mobility demo"
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
                onClick={() => runStep(step.key)}
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
          {nextStep ? nextStep.hint : "Scenario complete — both sides have been rewarded."}
        </p>

        {request ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="rounded-full bg-white/10 px-2.5 py-1 font-mono font-semibold">
              {request.id}
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 font-semibold">
              {TASKS[request.task_type].label}
            </span>
            <span className="rounded-full bg-yellow-500/25 px-2.5 py-1 font-semibold text-yellow-300">
              {request.status}
            </span>
            <span className="text-white/50">{timeAgo(request.created_at)}</span>
          </div>
        ) : null}
      </section>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="grid flex-1 gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <DemoPhone
            name={OWNER.name}
            role={OWNER.role}
            accent="#0057D9"
            ready={hydrated}
            src={`${DEMO_BASE}${ownerPath}${ownerPath.includes("?") ? "&" : "?"}as=${OWNER.id}`}
          />
          <DemoDivider />
          <DemoPhone
            name={HELPER.name}
            role={HELPER.role}
            accent="#FFD400"
            ready={hydrated}
            src={`${DEMO_BASE}${helperPath}${helperPath.includes("?") ? "&" : "?"}as=${HELPER.id}`}
          />
        </div>

        <ImpactPanel impact={IMPACT} trust={TRUST} />
      </div>

      <EventTicker />
    </DemoStage>
  );
}

/** Live view of the tracked events, so the analytics story is visible too. */
function EventTicker() {
  const db = useDb();
  const events = db.events.slice(0, 8);

  if (events.length === 0) return null;

  return (
    <section className="mt-8 rounded-card bg-white/8 p-4">
      <h2 className="mb-3 text-[15px] font-bold">Event stream</h2>
      <ul className="space-y-1.5">
        {events.map((e) => (
          <li
            key={e.id}
            className="flex flex-wrap items-center gap-2 font-mono text-[12px] text-white/70"
          >
            <span className="font-semibold text-yellow-300">{e.name}</span>
            <span>user={e.user_id}</span>
            {e.help_request_id ? <span>request={e.help_request_id}</span> : null}
            {e.task_type ? <span>task={e.task_type}</span> : null}
            <span className="text-white/40">{timeAgo(e.timestamp)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
