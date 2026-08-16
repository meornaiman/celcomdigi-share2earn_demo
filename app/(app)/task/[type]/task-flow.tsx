"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  ChoiceCard,
  Field,
  PageTitle,
  RiskBadge,
  SecurityNote,
  Select,
  TextArea,
  TextInput,
} from "@/components/ui";
import { TaskIcon } from "@/components/task-icon";
import { OptionSummary } from "@/components/option-card";
import {
  IconArrowLeft,
  IconInfo,
  IconLock,
  IconSend,
  IconUsers,
} from "@/components/icons";
import { useT } from "@/components/providers";
import { useAppLink, useCurrentUser, useDb, useQueryParam } from "@/lib/hooks";
import { createHelpRequest, selectHelpers, trackEvent } from "@/lib/store";
import {
  DESTINATIONS,
  DEVICES,
  TASKS,
  buildOptions,
  formatMoney,
} from "@/lib/tasks";
import type { RequestContext, TaskType } from "@/lib/types";
import { TASK_BLURB_KEYS, TASK_TITLE_KEYS } from "@/lib/i18n";

type Step = "CONTEXT" | "SELF" | "HELPER";

/** Defaults to the 15th–22nd of next month so the travel dates are pre-filled. */
function defaultTripDates() {
  const base = new Date();
  const y = base.getMonth() === 11 ? base.getFullYear() + 1 : base.getFullYear();
  const m = (base.getMonth() + 1) % 12;
  const iso = (day: number) =>
    `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { start: iso(15), end: iso(22) };
}

function formatDateRange(start: string, end: string): string {
  if (!start || !end) return "";
  const s = new Date(start);
  const e = new Date(end);
  const month = e.toLocaleDateString("en-GB", { month: "short" });
  const sameMonth = s.getMonth() === e.getMonth();
  return sameMonth
    ? `${s.getDate()}–${e.getDate()} ${month}`
    : `${s.getDate()} ${s.toLocaleDateString("en-GB", { month: "short" })} – ${e.getDate()} ${month}`;
}

/** A plausible bill for the demo: the jump is driven by one roaming line. */
function billFixture(planPrice: number) {
  const lines = [
    { label: "Monthly plan", previous: planPrice, current: planPrice },
    { label: "Roaming data", previous: 0, current: 42.5 },
    { label: "Extra data purchase", previous: 0, current: 12 },
    { label: "Subscription add-on", previous: 13, current: 13 },
  ];
  const previous = lines.reduce((sum, l) => sum + l.previous, 0);
  const current = lines.reduce((sum, l) => sum + l.current, 0);
  return { lines, previous, current };
}

export function TaskFlow({ taskType }: { taskType: TaskType }) {
  const t = useT();
  const db = useDb();
  const user = useCurrentUser();
  const router = useRouter();
  const link = useAppLink();
  const mode = useQueryParam("mode");

  const def = TASKS[taskType];
  const trip = useMemo(defaultTripDates, []);

  const [step, setStep] = useState<Step>("CONTEXT");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState(trip.start);
  const [endDate, setEndDate] = useState(trip.end);
  const [device, setDevice] = useState(DEVICES[0]);
  const [note, setNote] = useState("");
  const [helperId, setHelperId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const helpers = user ? selectHelpers(db, user.id) : [];

  const context: RequestContext = useMemo(() => {
    if (!user) return { headline: "" };
    switch (taskType) {
      case "ROAMING": {
        const range = formatDateRange(startDate, endDate);
        return {
          headline: destination
            ? `${destination} roaming${range ? `, ${range}` : ""}`
            : "Roaming for an upcoming trip",
          destination,
          start_date: startDate,
          end_date: endDate,
          note,
        };
      }
      case "BILL": {
        const bill = billFixture(user.plan_price);
        return {
          headline: `Bill is ${formatMoney(bill.current)}, up from ${formatMoney(bill.previous)}`,
          bill_month: new Date().toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
          }),
          bill_previous: bill.previous,
          bill_current: bill.current,
          bill_lines: bill.lines,
          note,
        };
      }
      case "PLAN":
        return {
          headline: `Compare ${user.plan_name} with other plans`,
          current_plan: user.plan_name,
          current_plan_price: user.plan_price,
          note,
        };
      case "ESIM":
        return {
          headline: `Switch ${device} to eSIM`,
          device,
          note,
        };
      case "ONBOARDING":
      default:
        return { headline: "Getting set up with the app", note };
    }
  }, [taskType, user, destination, startDate, endDate, device, note]);

  if (!user) return null;

  const contextReady = taskType !== "ROAMING" || destination !== "";

  function goSelf() {
    setStep("SELF");
    trackEvent("help_started", user!.id, null, taskType);
  }

  function goHelper() {
    setStep("HELPER");
    trackEvent("trusted_help_selected", user!.id, null, taskType);
  }

  function send() {
    if (!helperId || sending) return;
    setSending(true);
    trackEvent("helper_selected", user!.id, null, taskType);
    const req = createHelpRequest({
      ownerId: user!.id,
      helperId,
      taskType,
      context,
    });
    router.push(link(`/request?id=${req.id}&sent=1`));
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() =>
          step === "CONTEXT" ? router.back() : setStep("CONTEXT")
        }
        className="-ml-1 inline-flex items-center gap-1.5 text-[15px] font-semibold text-blue-700"
      >
        <IconArrowLeft size={18} />
        {t("common.back")}
      </button>

      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-blue-100 text-blue-700">
          <TaskIcon type={taskType} size={24} />
        </span>
        <div className="flex-1">
          <PageTitle sub={t(TASK_BLURB_KEYS[taskType])}>
            {t(TASK_TITLE_KEYS[taskType])}
          </PageTitle>
        </div>
      </div>

      <div className="-mt-3">
        <RiskBadge risk={def.risk} />
      </div>

      {step === "CONTEXT" ? (
        <>
          <Card className="space-y-4">
            {taskType === "ROAMING" ? (
              <>
                <Field label={t("task.destination")} htmlFor="destination">
                  <div className="grid grid-cols-2 gap-2">
                    {DESTINATIONS.map((d) => (
                      <button
                        key={d.code}
                        type="button"
                        onClick={() => setDestination(d.name)}
                        aria-pressed={destination === d.name}
                        className={`flex min-h-[52px] items-center gap-2.5 rounded-btn border-2 px-3 text-[15px] font-semibold transition ${
                          destination === d.name
                            ? "border-blue-500 bg-blue-100 text-navy-900"
                            : "border-blue-100 bg-surface text-ink hover:border-blue-500/50"
                        }`}
                      >
                        <span aria-hidden="true" className="text-[20px]">
                          {d.flag}
                        </span>
                        {d.name}
                      </button>
                    ))}
                  </div>
                </Field>

                <fieldset className="space-y-2">
                  <legend className="mb-1 text-[15px] font-semibold text-ink">
                    {t("task.dates")}
                  </legend>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label={t("task.startDate")} htmlFor="start">
                      <TextInput
                        id="start"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </Field>
                    <Field label={t("task.endDate")} htmlFor="end">
                      <TextInput
                        id="end"
                        type="date"
                        value={endDate}
                        min={startDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </Field>
                  </div>
                </fieldset>
              </>
            ) : null}

            {taskType === "ESIM" ? (
              <Field label={t("task.device")} htmlFor="device">
                <Select
                  id="device"
                  value={device}
                  onChange={(e) => setDevice(e.target.value)}
                >
                  {DEVICES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            {taskType === "BILL" ? <BillSummary context={context} /> : null}

            {taskType === "PLAN" ? (
              <div className="rounded-tile bg-blue-100 p-3.5">
                <p className="text-[13px] font-medium text-ink-soft">
                  {t("home.planLabel")}
                </p>
                <p className="text-[18px] font-bold text-ink">
                  {user.plan_name} · {formatMoney(user.plan_price)}/month
                </p>
              </div>
            ) : null}

            <Field label={t("task.noteLabel")} hint={t("common.optional")} htmlFor="note">
              <TextArea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("task.notePlaceholder")}
                maxLength={240}
              />
            </Field>
          </Card>

          <div className="space-y-2.5">
            <Button
              variant="primary"
              onClick={goHelper}
              disabled={!contextReady}
              icon={<IconUsers size={20} />}
            >
              {t("task.askTrusted")}
            </Button>
            <Button variant="outline" onClick={goSelf} disabled={!contextReady}>
              {t("task.tryMyself")}
            </Button>
            {!contextReady ? (
              <p className="text-center text-[14px] text-ink-soft">
                {t("task.destination")}
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      {step === "SELF" ? (
        <SelfServe
          taskType={taskType}
          context={context}
          onAskInstead={goHelper}
          highlight={mode === "self"}
        />
      ) : null}

      {step === "HELPER" ? (
        <>
          <PageTitle>{t("helpers.title")}</PageTitle>

          <SecurityNote>{t("helpers.security")}</SecurityNote>

          {helpers.length === 0 ? (
            <Card>
              <p className="text-[15px] text-ink-soft">{t("helpers.empty")}</p>
              <div className="mt-3">
                <Button href={link("/profile")} variant="outline" size="md">
                  {t("helpers.manage")}
                </Button>
              </div>
            </Card>
          ) : (
            <ul className="space-y-2.5">
              {helpers.map(({ user: h, relationship }) => (
                <li key={h.id}>
                  <ChoiceCard
                    name="helper"
                    selected={helperId === h.id}
                    onSelect={() => setHelperId(h.id)}
                    leading={<Avatar name={h.name} accent={h.accent} size={46} />}
                    title={h.name}
                    subtitle={`${relationship.relationship_label} · ${h.mobile_number}`}
                  />
                </li>
              ))}
            </ul>
          )}

          <PermissionPreview
            taskType={taskType}
            context={context}
            helperName={
              helpers.find((h) => h.user.id === helperId)?.user.name ?? "your helper"
            }
          />

          <Button
            variant="primary"
            onClick={send}
            disabled={!helperId || sending}
            icon={<IconSend size={19} />}
          >
            {t("helpers.send")}
          </Button>
        </>
      ) : null}
    </div>
  );
}

function BillSummary({ context }: { context: RequestContext }) {
  const lines = context.bill_lines ?? [];
  return (
    <div className="rounded-tile bg-blue-100 p-3.5">
      <p className="text-[13px] font-medium text-ink-soft">{context.bill_month}</p>
      <p className="text-[24px] font-bold tracking-[-0.02em] text-ink">
        {formatMoney(context.bill_current ?? 0)}
      </p>
      <p className="text-[14px] text-ink-soft">
        Last month {formatMoney(context.bill_previous ?? 0)}
      </p>
      <ul className="mt-3 space-y-1.5">
        {lines.map((l) => {
          const delta = l.current - l.previous;
          return (
            <li key={l.label} className="flex items-center justify-between text-[14px]">
              <span className="text-ink">{l.label}</span>
              <span className="flex items-center gap-2">
                <span className="font-semibold text-ink">{formatMoney(l.current)}</span>
                {delta !== 0 ? (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[12px] font-bold ${
                      delta > 0 ? "bg-red-500/12 text-red-500" : "bg-green-500/12 text-[#1B8B3C]"
                    }`}
                  >
                    {delta > 0 ? "+" : "−"}
                    {formatMoney(Math.abs(delta))}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** "Try myself" path: the same information, without involving anyone else. */
function SelfServe({
  taskType,
  context,
  onAskInstead,
  highlight,
}: {
  taskType: TaskType;
  context: RequestContext;
  onAskInstead: () => void;
  highlight: boolean;
}) {
  const t = useT();
  const options = buildOptions(taskType, context);

  return (
    <div className="space-y-4">
      <PageTitle sub={context.headline}>{t("task.selfServeTitle")}</PageTitle>

      {highlight ? (
        <SecurityNote>
          Everything here is read-only. Nothing is bought or changed until you
          choose it yourself.
        </SecurityNote>
      ) : null}

      <ul className="space-y-2.5">
        {options.map((o) => (
          <li key={o.title}>
            <OptionSummary option={o} />
          </li>
        ))}
      </ul>

      <Card className="space-y-3">
        <p className="flex items-start gap-2.5 text-[15px] text-ink">
          <IconInfo size={19} className="mt-px shrink-0 text-blue-700" />
          {t("task.selfServeHint")}
        </p>
        <Button variant="primary" onClick={onAskInstead} icon={<IconUsers size={20} />}>
          {t("task.askTrusted")}
        </Button>
      </Card>
    </div>
  );
}

/**
 * Shows the exact task-scoped grant before it is issued, alongside what stays
 * private, so consent is informed rather than implied (DESIGN.md §11).
 */
function PermissionPreview({
  taskType,
  context,
  helperName,
}: {
  taskType: TaskType;
  context: RequestContext;
  helperName: string;
}) {
  const t = useT();
  const def = TASKS[taskType];

  const shared: string[] = [context.headline];
  if (context.destination) shared.push(`Destination: ${context.destination}`);
  if (context.start_date && context.end_date)
    shared.push(`Travel dates: ${formatDateRange(context.start_date, context.end_date)}`);
  if (context.bill_current !== undefined)
    shared.push("This month's bill total and the lines that changed");
  if (context.current_plan) shared.push(`Current plan: ${context.current_plan}`);
  if (context.device) shared.push(`Device: ${context.device}`);
  if (context.note) shared.push(`Your note: "${context.note}"`);

  return (
    <div className="grid gap-2.5">
      <Card>
        <p className="mb-2 text-[15px] font-bold text-ink">
          {t("helpers.shareTitle", { name: helperName })}
        </p>
        <ul className="space-y-1.5">
          {shared.map((s) => (
            <li key={s} className="flex gap-2 text-[14px] text-ink-soft">
              <span aria-hidden="true" className="text-blue-700">
                •
              </span>
              {s}
            </li>
          ))}
        </ul>
        <p className="mt-3 flex flex-wrap gap-1.5">
          {def.permissions.map((p) => (
            <span
              key={p}
              className="rounded-full bg-blue-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-blue-700"
            >
              {p}
            </span>
          ))}
        </p>
      </Card>

      <Card className="bg-navy-900 text-white">
        <p className="mb-2 flex items-center gap-2 text-[15px] font-bold">
          <IconLock size={18} className="text-yellow-500" />
          {t("helpers.hiddenTitle")}
        </p>
        <p className="text-[14px] leading-snug text-white/75">
          {t("helpers.hiddenItems")}
        </p>
      </Card>
    </div>
  );
}
