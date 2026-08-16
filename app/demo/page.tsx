"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pill } from "@/components/ui";
import { IconCheck, IconRefresh, IconSend, IconSparkle } from "@/components/icons";
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

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

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

  const done: Record<StepKey, boolean> = useMemo(() => {
    const status = request?.status;
    return {
      REQUEST: !!request,
      RECOMMEND: !!status && !["SENT", "HELPER_VIEWED", "HELPER_ACCEPTED"].includes(status),
      APPROVE:
        !!status && ["OWNER_APPROVED", "EXECUTING", "COMPLETED"].includes(status),
      COMPLETE: status === "COMPLETED",
    };
  }, [request]);

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

  return (
    <div className="min-h-dvh bg-navy-900 text-white">
      <div className="mx-auto max-w-6xl px-5 py-6">
        <header className="flex flex-wrap items-center gap-4">
          <span
            aria-hidden="true"
            className="grid h-11 w-11 place-items-center rounded-[13px] bg-yellow-500 text-[13px] font-bold text-navy-900"
          >
            CD
          </span>
          <div className="mr-auto">
            <h1 className="text-[22px] font-bold tracking-[-0.02em]">
              Share2Earn — presenter mode
            </h1>
            <p className="text-[14px] text-white/65">
              Two accounts, one browser, live sync between both panels.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
            Realtime
          </span>
          <Link
            href="/login"
            className="rounded-btn border-2 border-white/25 px-4 py-2 text-[14px] font-semibold transition hover:bg-white/10"
          >
            Open full app
          </Link>
        </header>

        <section className="mt-6 rounded-card bg-white/8 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {SCRIPT.map((step, i) => {
              const complete = done[step.key];
              const isNext =
                !complete && SCRIPT.slice(0, i).every((s) => done[s.key]);
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
            {(() => {
              const next = SCRIPT.find((s) => !done[s.key]);
              if (!next) return "Scenario complete — both sides have been rewarded.";
              return next.hint;
            })()}
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <Panel
            person={OWNER}
            path={ownerPath}
            ready={hydrated}
            accent="#0057D9"
          />

          <div className="hidden flex-col items-center justify-center gap-3 lg:flex">
            <span className="h-24 w-px bg-white/15" />
            <span className="rotate-90 whitespace-nowrap text-[12px] font-bold uppercase tracking-[0.2em] text-white/45">
              realtime
            </span>
            <span className="h-24 w-px bg-white/15" />
          </div>

          <Panel
            person={HELPER}
            path={helperPath}
            ready={hydrated}
            accent="#FFD400"
          />
        </div>

        <EventTicker />
      </div>
    </div>
  );
}

function Panel({
  person,
  path,
  ready,
  accent,
}: {
  person: { id: string; name: string; role: string };
  path: string;
  ready: boolean;
  accent: string;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const separator = path.includes("?") ? "&" : "?";
  const src = `${BASE}${path}${separator}as=${person.id}`;

  return (
    <div className="flex flex-col items-center">
      <div className="mb-3 flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="h-3 w-3 rounded-full"
          style={{ background: accent }}
        />
        <p className="text-[17px] font-bold">{person.name}</p>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[12px] font-semibold text-white/70">
          {person.role}
        </span>
      </div>

      {/* Phone bezel keeps the mobile-first design honest during a demo. */}
      <div className="w-full max-w-[392px] rounded-[42px] bg-black/45 p-2.5 shadow-lift ring-1 ring-white/10">
        <div className="relative overflow-hidden rounded-[34px] bg-canvas">
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black/80"
          />
          {ready ? (
            <iframe
              ref={frameRef}
              key={src}
              src={src}
              title={`${person.name} — ${person.role}`}
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
