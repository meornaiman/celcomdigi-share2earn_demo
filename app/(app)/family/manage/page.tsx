"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Pill, ScreenHeader } from "@/components/ui";
import {
  IconChevronRight,
  IconEsim,
  IconPlan,
  IconSparkle,
  IconTag,
} from "@/components/icons";
import { useAppLink, useCurrentUser, useDb } from "@/lib/hooks";
import { selectFamilyMember } from "@/lib/store";

/**
 * Screen 2 — independence sits in the same list as changing a plan, because
 * the product treats it as a normal lifecycle action rather than as
 * "terminate supplementary line". It is emphasised, not hidden.
 */
export default function ManageLinePage() {
  const db = useDb();
  const user = useCurrentUser();
  const router = useRouter();
  const link = useAppLink();

  if (!user) return null;
  const mine = selectFamilyMember(db, user.id);

  const routine = [
    {
      label: "Change my plan",
      detail: "Move to a different postpaid plan",
      Icon: IconPlan,
    },
    {
      label: "Manage SIM / eSIM",
      detail: "Replace a SIM or switch to eSIM",
      Icon: IconEsim,
    },
    {
      label: "Payment & spending",
      detail: "Limits, add-ons and spending controls",
      Icon: IconTag,
    },
  ];

  return (
    <div className="space-y-5">
      <ScreenHeader
        title="Manage my line"
        sub={mine ? `${mine.msisdn} · ${mine.plan_name}` : undefined}
        backLabel="Back"
        onBack={() => router.push(link("/family"))}
      />

      <ul className="space-y-2">
        {routine.map(({ label, detail, Icon }) => (
          <li key={label}>
            <Link
              href={link("/family/manage")}
              className="flex items-center gap-3 rounded-card bg-surface p-3.5 shadow-soft transition hover:shadow-lift"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-blue-100 text-blue-700">
                <Icon size={21} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-bold text-ink">{label}</span>
                <span className="block truncate text-[13.5px] text-ink-soft">
                  {detail}
                </span>
              </span>
              <IconChevronRight size={19} className="shrink-0 text-ink-soft" />
            </Link>
          </li>
        ))}
      </ul>

      {/* The fourth option carries the journey, so it is given its own weight. */}
      <Link
        href={link("/family/independence")}
        className="block rounded-card border-2 border-yellow-500 bg-surface p-4 shadow-soft transition hover:shadow-lift"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-yellow-500 text-navy-900">
            <IconSparkle size={21} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[17px] font-bold text-ink">Become independent</p>
              <Pill tone="warn">New</Pill>
            </div>
            <p className="mt-0.5 text-[14px] leading-snug text-ink-soft">
              Move your current number to your own CelcomDigi account.
            </p>
          </div>
          <IconChevronRight size={19} className="mt-1 shrink-0 text-ink-soft" />
        </div>
      </Link>

      <Card tone="tint">
        <p className="text-[14px] leading-snug text-navy-900/80">
          Your number, your usage history and your CelcomDigi relationship stay
          with you. Only who pays the bill changes.
        </p>
      </Card>
    </div>
  );
}
