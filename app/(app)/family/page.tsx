"use client";

import Link from "next/link";
import { Avatar, Button, Card, Pill, SectionTitle } from "@/components/ui";
import {
  IconChevronRight,
  IconData,
  IconEsim,
  IconPlan,
} from "@/components/icons";
import { useAppLink, useCurrentUser, useDb } from "@/lib/hooks";
import { selectFamilyGroup, selectTransferForMember, selectUser } from "@/lib/store";
import { formatMoney } from "@/lib/tasks";

/**
 * Screen 1 — establishes the relationship Aina is currently in, before the
 * journey offers to change it. Her own line is the hero; the rest of the
 * family is context.
 */
export default function FamilyPage() {
  const db = useDb();
  const user = useCurrentUser();
  const link = useAppLink();

  if (!user) return null;

  const group = selectFamilyGroup(db, user.id);
  const transfer = selectTransferForMember(db, user.id);

  if (!group) {
    return (
      <Card>
        <p className="text-[16px] font-bold text-ink">No family account</p>
        <p className="mt-1 text-[14px] text-ink-soft">
          This line is not part of a CelcomDigi family account.
        </p>
      </Card>
    );
  }

  const principal = selectUser(db, group.principal_user_id);
  const mine = group.members.find((m) => m.user_id === user.id);
  const others = group.members.filter(
    (m) => m.user_id !== user.id && m.user_id !== group.principal_user_id
  );
  const isPrincipal = group.principal_user_id === user.id;

  return (
    <div className="space-y-6">
      <section className="-mx-4 -mt-3 bg-navy-900 px-4 pb-14 pt-4">
        <h1 className="text-[24px] font-bold leading-tight tracking-[-0.02em] text-white">
          My Family
        </h1>
        <p className="mt-1 text-[14px] text-blue-100/75">
          {group.members.length} lines · {formatMoney(group.monthly_total)} a month
        </p>
      </section>

      <div className="-mt-[3.5rem] space-y-2.5">
        <Card className="flex items-center gap-3">
          <Avatar name={principal?.name ?? "?"} accent={principal?.accent} size={46} />
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-bold text-ink">{principal?.name}</p>
            <p className="text-[14px] text-ink-soft">{principal?.mobile_number}</p>
          </div>
          <Pill tone="info">Account owner</Pill>
        </Card>

        {mine && !isPrincipal ? (
          <Card className="border-2 border-blue-500">
            <div className="flex items-center gap-3">
              <Avatar name={user.name} accent={user.accent} size={46} />
              <div className="min-w-0 flex-1">
                <p className="text-[17px] font-bold text-ink">
                  {user.name} <span className="text-ink-soft">· My line</span>
                </p>
                <p className="text-[14px] text-ink-soft">
                  {mine.msisdn} · {mine.plan_name}
                </p>
              </div>
              <Pill tone="neutral">Supplementary</Pill>
            </div>

            <dl className="mt-3.5 grid grid-cols-3 gap-2 border-t border-blue-100 pt-3.5">
              <Metric
                label="Data used"
                value={`${mine.data_used_gb.toFixed(1)}GB`}
                hint={`of ${mine.data_quota_gb}GB`}
              />
              <Metric label="Plan" value={mine.plan_name} hint="Current" />
              <Metric
                label="Bill share"
                value={formatMoney(mine.bill_contribution)}
                hint="Billed to Mum"
              />
            </dl>

            <div className="mt-4 space-y-2">
              <Button href={link("/family/manage")} advance>
                Manage my line
              </Button>
              <Button href={link("/family/data")} variant="outline" size="md">
                Family data sharing
              </Button>
            </div>

            {transfer && transfer.status !== "COMPLETED" ? (
              <p className="mt-2.5 text-center text-[13px] font-semibold text-blue-700">
                Transfer {transfer.id} in progress
              </p>
            ) : null}
          </Card>
        ) : null}

        {others.length > 0 ? (
          <section className="pt-2">
            <SectionTitle>Other lines</SectionTitle>
            <ul className="space-y-2">
              {others.map((m) => {
                const u = selectUser(db, m.user_id);
                return (
                  <li key={m.user_id}>
                    <Card className="flex items-center gap-3">
                      <Avatar name={u?.name ?? "?"} accent={u?.accent} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[16px] font-bold text-ink">{u?.name}</p>
                        <p className="text-[13px] text-ink-soft">
                          {m.msisdn} · {formatMoney(m.bill_contribution)}
                        </p>
                      </div>
                      <Pill tone="neutral">Supplementary</Pill>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>

      <section>
        <SectionTitle>Quick actions</SectionTitle>
        <ul className="grid grid-cols-3 gap-2">
          {[
            { label: "Family data", Icon: IconData, href: "/family/data" },
            { label: "Add-ons", Icon: IconPlan, href: "/family/manage" },
            { label: "SIM / eSIM", Icon: IconEsim, href: "/family/manage" },
          ].map(({ label, Icon, href }) => (
            <li key={label}>
              <Link
                href={link(href)}
                className="flex h-full flex-col items-center gap-2 rounded-card bg-surface p-3 text-center shadow-soft transition hover:shadow-lift"
              >
                <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-blue-100 text-blue-700">
                  <Icon size={20} />
                </span>
                <span className="text-[13px] font-semibold leading-tight text-ink">
                  {label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {isPrincipal ? (
        <Card tone="tint">
          <p className="text-[15px] font-bold text-navy-900">
            You own this family account
          </p>
          <p className="mt-1 text-[14px] leading-snug text-navy-900/75">
            Any request to move a line out of the account comes to you for
            approval first.
          </p>
          <div className="mt-3">
            <Link
              href={link("/family/approve")}
              className="inline-flex items-center gap-1 text-[15px] font-bold text-blue-700"
            >
              View requests
              <IconChevronRight size={16} />
            </Link>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div>
      <dt className="text-[12px] font-medium text-ink-soft">{label}</dt>
      <dd className="text-[15px] font-bold leading-tight text-ink">{value}</dd>
      <dd className="text-[11.5px] text-ink-soft">{hint}</dd>
    </div>
  );
}
