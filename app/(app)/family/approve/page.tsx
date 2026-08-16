"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ScreenHeader,
  SecurityNote,
  Sheet,
} from "@/components/ui";
import { RiskBanner } from "@/components/adaptive-identity";
import { IconCheck, IconFaceId, IconUsers } from "@/components/icons";
import { useAppLink, useCurrentUser, useDb } from "@/lib/hooks";
import {
  completeTransfer,
  principalDecide,
  selectTransfersAwaiting,
  selectUser,
} from "@/lib/store";
import { INDEPENDENT_PLANS } from "@/lib/family";
import { formatMoney } from "@/lib/tasks";

/**
 * Screen 5B — the account owner's side. The principal authenticates before
 * approving, because consent to move a line is itself an ownership-level
 * action, and they are shown exactly what changes for them.
 */
export default function ApprovePage() {
  const db = useDb();
  const user = useCurrentUser();
  const router = useRouter();
  const link = useAppLink();

  const [authOpen, setAuthOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (!user) return null;
  const pending = selectTransfersAwaiting(db, user.id);
  const transfer = pending[0] ?? null;

  if (!transfer) {
    return (
      <div className="space-y-5">
        <ScreenHeader
          title="Transfer requests"
          backLabel="Back"
          onBack={() => router.push(link("/family"))}
        />
        <EmptyState
          icon={<IconUsers size={22} />}
          title="No requests waiting"
          body="If someone on your family account asks to move their line out, it appears here."
        />
      </div>
    );
  }

  const member = selectUser(db, transfer.member_user_id);
  const plan = INDEPENDENT_PLANS.find((p) => p.id === transfer.chosen_plan_id);

  function approve() {
    if (approving) return;
    setApproving(true);
    setAuthOpen(false);
    principalDecide(transfer!.id, user!.id, true);
    // Provisioning is simulated; the customer-facing result is what matters.
    window.setTimeout(() => completeTransfer(transfer!.id), 1200);
  }

  return (
    <div className="space-y-5">
      <ScreenHeader
        title={`${member?.name ?? "A family member"} wants to become independent`}
        backLabel="Back"
        onBack={() => router.push(link("/family"))}
      />

      <Card>
        <div className="flex items-center gap-3">
          <Avatar name={member?.name ?? "?"} accent={member?.accent} size={46} />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[19px] font-bold tracking-tight text-ink">
              {transfer.msisdn}
            </p>
            <p className="text-[14px] text-ink-soft">
              {member?.name} wants to move this line from your family account
              into her own CelcomDigi account.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <p className="mb-2.5 text-[13px] font-bold uppercase tracking-wide text-ink-soft">
          After transfer
        </p>
        <ul className="space-y-2">
          {[
            `${member?.name ?? "She"} keeps the number`,
            `${member?.name ?? "She"} manages her own plan`,
            `${member?.name ?? "She"} manages her own billing`,
            "Your family account will no longer be billed for this line",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-green-500 text-white"
              >
                <IconCheck size={12} strokeWidth={3.2} />
              </span>
              <span className="text-[15px] leading-snug text-ink">{line}</span>
            </li>
          ))}
        </ul>
      </Card>

      <RiskBanner action="Approving an ownership change" level="OWNERSHIP" />

      <div className="space-y-2.5">
        <Button onClick={() => setAuthOpen(true)} disabled={approving}>
          {approving ? "Transferring…" : "Approve transfer"}
        </Button>
        <Button variant="outline" size="md" onClick={() => setDetailsOpen(true)}>
          Review details
        </Button>
        <Button
          variant="ghost"
          size="md"
          disabled={approving}
          onClick={() => principalDecide(transfer.id, user.id, false)}
        >
          Not now
        </Button>
      </div>

      <SecurityNote tone="lock">
        You are approving a change of account ownership. Confirm it&apos;s you
        before this goes through.
      </SecurityNote>

      <Sheet
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        title="Confirm it's you"
      >
        <p className="mb-4 text-[15.5px] leading-snug text-ink-soft">
          Releasing a line from your family account needs the same level of
          confirmation as any ownership change.
        </p>
        <Button onClick={approve} icon={<IconFaceId size={21} />}>
          Confirm with Face ID
        </Button>
        <div className="mt-2.5">
          <Button variant="ghost" size="md" onClick={() => setAuthOpen(false)}>
            Cancel
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="Transfer details"
      >
        <dl className="space-y-2.5">
          {[
            ["Reference", transfer.id],
            ["Line", transfer.msisdn],
            ["Moving to", `${member?.name ?? "—"}'s own account`],
            ["New plan", plan ? `${plan.name} · ${formatMoney(plan.price)}/mo` : "—"],
            ["Identity", transfer.stepped_up_with ?? "Confirmed"],
            ["Signals reused", `${transfer.reused_signals.length} existing checks`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3">
              <dt className="text-[14px] text-ink-soft">{k}</dt>
              <dd className="text-right text-[15px] font-semibold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4">
          <Button variant="outline" size="md" onClick={() => setDetailsOpen(false)}>
            Close
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
