"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, Pill, Select, Stat, StatusBadge } from "@/components/ui";
import { IconChart, IconRefresh } from "@/components/icons";
import { useDb, useHydrated, timeAgo } from "@/lib/hooks";
import { selectUser } from "@/lib/store";
import { TASKS, TASK_ORDER, formatMoney, formatReward } from "@/lib/tasks";
import type { RequestStatus, RiskLevel, TaskType } from "@/lib/types";

type Range = "ALL" | "7D" | "30D";

const STATUSES: RequestStatus[] = [
  "SENT",
  "HELPER_VIEWED",
  "HELPER_ACCEPTED",
  "RECOMMENDATION_SENT",
  "OWNER_REVIEWING",
  "OWNER_APPROVED",
  "EXECUTING",
  "COMPLETED",
  "DECLINED_BY_HELPER",
  "DECLINED_BY_OWNER",
  "EXPIRED",
  "CANCELLED",
  "FAILED",
];

export default function AdminPage() {
  const db = useDb();
  const hydrated = useHydrated();

  const [range, setRange] = useState<Range>("ALL");
  const [status, setStatus] = useState<RequestStatus | "ALL">("ALL");
  const [taskType, setTaskType] = useState<TaskType | "ALL">("ALL");
  const [risk, setRisk] = useState<RiskLevel | "ALL">("ALL");

  const requests = useMemo(() => {
    const cutoff =
      range === "ALL"
        ? 0
        : Date.now() - (range === "7D" ? 7 : 30) * 24 * 60 * 60 * 1000;
    return db.help_requests
      .filter((r) => new Date(r.created_at).getTime() >= cutoff)
      .filter((r) => status === "ALL" || r.status === status)
      .filter((r) => taskType === "ALL" || r.task_type === taskType)
      .filter((r) => risk === "ALL" || r.risk_level === risk)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [db.help_requests, range, status, taskType, risk]);

  const metrics = useMemo(() => {
    const created = requests.length;
    const completed = requests.filter((r) => r.status === "COMPLETED").length;
    const decided = requests.filter((r) =>
      ["OWNER_APPROVED", "EXECUTING", "COMPLETED", "DECLINED_BY_OWNER"].includes(
        r.status
      )
    ).length;
    const approved = requests.filter((r) =>
      ["OWNER_APPROVED", "EXECUTING", "COMPLETED"].includes(r.status)
    ).length;
    const accepted = requests.filter(
      (r) => r.status !== "SENT" && r.status !== "EXPIRED" && r.status !== "CANCELLED"
    ).length;

    const responseTimes = requests
      .map((r) => r.helper_response_ms)
      .filter((ms): ms is number => typeof ms === "number");
    const avgResponseMin =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / 60000
        : 0;

    const ids = new Set(requests.map((r) => r.id));
    const rewards = db.rewards.filter((r) => ids.has(r.help_request_id));
    const issued = rewards.filter((r) => r.status === "ISSUED");
    const flagged = rewards.filter((r) => r.status !== "ISSUED").length;

    const conversion = requests
      .filter((r) => r.status === "COMPLETED")
      .reduce((sum, r) => sum + TASKS[r.task_type].conversionValue, 0);

    return {
      created,
      completed,
      completionRate: created ? Math.round((completed / created) * 100) : 0,
      acceptanceRate: created ? Math.round((accepted / created) * 100) : 0,
      approvalRate: decided ? Math.round((approved / decided) * 100) : 0,
      avgResponseMin,
      rewardsIssued: issued.length,
      dataIssued: issued
        .filter((r) => r.reward_type === "DATA_MB")
        .reduce((s, r) => s + r.reward_value, 0),
      pointsIssued: issued
        .filter((r) => r.reward_type === "POINTS")
        .reduce((s, r) => s + r.reward_value, 0),
      flagged,
      conversion,
    };
  }, [requests, db.rewards]);

  const byTask = useMemo(
    () =>
      TASK_ORDER.map((type) => {
        const rows = requests.filter((r) => r.task_type === type);
        return {
          type,
          created: rows.length,
          completed: rows.filter((r) => r.status === "COMPLETED").length,
        };
      }).filter((row) => row.created > 0),
    [requests]
  );

  const maxByTask = Math.max(1, ...byTask.map((b) => b.created));

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto max-w-5xl px-5 py-6">
        <header className="mb-6 flex flex-wrap items-center gap-3">
          <span
            aria-hidden="true"
            className="grid h-11 w-11 place-items-center rounded-[13px] bg-navy-900 text-blue-100"
          >
            <IconChart size={22} />
          </span>
          <div className="mr-auto">
            <h1 className="text-[24px] font-bold tracking-[-0.02em] text-ink">
              Share2Earn admin
            </h1>
            <p className="text-[14px] text-ink-soft">
              Prototype metrics from this browser&apos;s demo data.
            </p>
          </div>
          <Link
            href="/demo"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-btn border-2 border-blue-100 bg-surface px-4 text-[15px] font-semibold text-blue-700 transition hover:border-blue-500"
          >
            <IconRefresh size={17} />
            Presenter mode
          </Link>
        </header>

        <Card className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Filter label="Date range">
            <Select value={range} onChange={(e) => setRange(e.target.value as Range)}>
              <option value="ALL">All time</option>
              <option value="7D">Last 7 days</option>
              <option value="30D">Last 30 days</option>
            </Select>
          </Filter>
          <Filter label="Status">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as RequestStatus | "ALL")}
            >
              <option value="ALL">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Filter>
          <Filter label="Task type">
            <Select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value as TaskType | "ALL")}
            >
              <option value="ALL">All tasks</option>
              {TASK_ORDER.map((tt) => (
                <option key={tt} value={tt}>
                  {TASKS[tt].label}
                </option>
              ))}
            </Select>
          </Filter>
          <Filter label="Risk level">
            <Select
              value={risk}
              onChange={(e) => setRisk(e.target.value as RiskLevel | "ALL")}
            >
              <option value="ALL">All risk levels</option>
              <option value="GREEN">Green</option>
              <option value="AMBER">Amber</option>
              <option value="RED">Red</option>
            </Select>
          </Filter>
        </Card>

        <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <Stat label="Requests created" value={metrics.created} />
          <Stat label="Requests completed" value={metrics.completed} tone="success" />
          <Stat
            label="Completion rate"
            value={`${metrics.completionRate}%`}
            tone="brand"
            hint="Completed ÷ created"
          />
          <Stat
            label="Acceptance rate"
            value={`${metrics.acceptanceRate}%`}
            hint="Helper engaged with the request"
          />
          <Stat
            label="Helper response"
            value={
              metrics.avgResponseMin > 0
                ? `${metrics.avgResponseMin < 1 ? "<1" : Math.round(metrics.avgResponseMin)} min`
                : "—"
            }
            hint="Average time to recommend"
          />
          <Stat
            label="Owner approval rate"
            value={`${metrics.approvalRate}%`}
            tone="brand"
          />
          <Stat
            label="Conversion value"
            value={formatMoney(metrics.conversion)}
            tone="success"
            hint="Booked on completed tasks"
          />
          <Stat
            label="Fraud flags"
            value={metrics.flagged}
            hint="Rewards blocked by anti-abuse"
          />
        </div>

        <Card className="mb-5">
          <h2 className="mb-3 text-[17px] font-bold text-ink">Rewards issued</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="info">{metrics.rewardsIssued} rewards</Pill>
            <Pill tone="success">
              {formatReward("DATA_MB", metrics.dataIssued)} bonus data
            </Pill>
            <Pill tone="warn">
              {formatReward("POINTS", metrics.pointsIssued)}
            </Pill>
          </div>
        </Card>

        {byTask.length > 0 ? (
          <Card className="mb-5">
            <h2 className="mb-3 text-[17px] font-bold text-ink">Requests by task</h2>
            <ul className="space-y-2.5">
              {byTask.map((row) => (
                <li key={row.type}>
                  <div className="mb-1 flex items-baseline justify-between text-[14px]">
                    <span className="font-semibold text-ink">
                      {TASKS[row.type].label}
                    </span>
                    <span className="text-ink-soft">
                      {row.completed} of {row.created} completed
                    </span>
                  </div>
                  <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-blue-100">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${(row.completed / maxByTask) * 100}%` }}
                    />
                    <div
                      className="h-full rounded-full bg-blue-500/45"
                      style={{
                        width: `${((row.created - row.completed) / maxByTask) * 100}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <Card>
          <h2 className="mb-3 text-[17px] font-bold text-ink">
            Requests ({requests.length})
          </h2>
          {!hydrated ? null : requests.length === 0 ? (
            <p className="py-8 text-center text-[15px] text-ink-soft">
              No requests match these filters. Run the{" "}
              <Link href="/demo" className="font-semibold text-blue-700 underline">
                presenter demo
              </Link>{" "}
              to generate some.
            </p>
          ) : (
            <div className="-mx-4 overflow-x-auto px-4">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-blue-100 text-[13px] uppercase tracking-wide text-ink-soft">
                    <Th>Request</Th>
                    <Th>Task</Th>
                    <Th>Owner → Helper</Th>
                    <Th>Risk</Th>
                    <Th>Status</Th>
                    <Th>Created</Th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => {
                    const owner = selectUser(db, r.owner_user_id);
                    const helper = selectUser(db, r.helper_user_id);
                    return (
                      <tr key={r.id} className="border-b border-blue-100/70 last:border-0">
                        <Td>
                          <span className="font-mono text-[13px] font-semibold text-ink">
                            {r.id}
                          </span>
                        </Td>
                        <Td>{TASKS[r.task_type].label}</Td>
                        <Td>
                          {owner?.name} → {helper?.name}
                        </Td>
                        <Td>
                          <Pill
                            tone={
                              r.risk_level === "GREEN"
                                ? "success"
                                : r.risk_level === "AMBER"
                                  ? "warn"
                                  : "danger"
                            }
                          >
                            {r.risk_level}
                          </Pill>
                        </Td>
                        <Td>
                          <StatusBadge status={r.status} label={r.status} />
                        </Td>
                        <Td>
                          <span className="text-ink-soft">{timeAgo(r.created_at)}</span>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">
        {label}
      </span>
      {children}
    </label>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="py-2 pr-4 font-semibold">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="py-2.5 pr-4 text-[15px] text-ink">{children}</td>;
}
