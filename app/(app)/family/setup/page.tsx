"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Avatar,
  Button,
  Card,
  ChoiceCard,
  Pill,
  ScreenHeader,
  SecurityNote,
  SectionTitle,
} from "@/components/ui";
import { IconCard, IconSend } from "@/components/icons";
import { useAppLink, useCurrentUser, useDb } from "@/lib/hooks";
import {
  configureTransfer,
  requestPrincipalApproval,
  selectTransferForMember,
  selectUser,
} from "@/lib/store";
import { INDEPENDENT_PLANS, PAYMENT_METHODS } from "@/lib/family";
import { formatMoney } from "@/lib/tasks";

/**
 * Screen 5 — the move itself: a plan, a payment method, and the account
 * owner's consent. Consent is a required section rather than a footnote, so
 * the demo never implies a line can be taken silently.
 */
export default function SetupPage() {
  const db = useDb();
  const user = useCurrentUser();
  const router = useRouter();
  const link = useAppLink();

  const [planId, setPlanId] = useState(
    INDEPENDENT_PLANS.find((p) => p.recommended)?.id ?? INDEPENDENT_PLANS[0].id
  );
  const [payment, setPayment] = useState(PAYMENT_METHODS[0].id);
  const [sending, setSending] = useState(false);

  if (!user) return null;
  const transfer = selectTransferForMember(db, user.id);
  const principal = selectUser(db, transfer?.principal_user_id ?? "");

  function send() {
    if (!transfer || sending) return;
    setSending(true);
    configureTransfer(transfer.id, planId, payment);
    requestPrincipalApproval(transfer.id);
    router.push(link("/family/success"));
  }

  return (
    <div className="space-y-6">
      <ScreenHeader
        title="Set up your account"
        sub={transfer?.msisdn}
        backLabel="Back"
        onBack={() => router.push(link("/family/identity"))}
      />

      <section>
        <SectionTitle>Choose my plan</SectionTitle>
        <ul className="space-y-2.5">
          {INDEPENDENT_PLANS.map((p) => (
            <li key={p.id}>
              <ChoiceCard
                name="plan"
                selected={planId === p.id}
                onSelect={() => setPlanId(p.id)}
                title={
                  <span className="flex items-baseline justify-between gap-3">
                    {p.name}
                    <span className="shrink-0 text-[18px] font-bold text-blue-700">
                      {formatMoney(p.price)}
                      <span className="text-[13px] font-semibold text-ink-soft">
                        /mo
                      </span>
                    </span>
                  </span>
                }
                subtitle={p.tagline}
                meta={
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    {p.features.map((f) => (
                      <span
                        key={f}
                        className="rounded-full bg-blue-100 px-2 py-0.5 text-[12px] font-semibold text-blue-700"
                      >
                        {f}
                      </span>
                    ))}
                  </span>
                }
              />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle>My billing</SectionTitle>
        <ul className="space-y-2">
          {PAYMENT_METHODS.map((m) => (
            <li key={m.id}>
              <ChoiceCard
                name="payment"
                selected={payment === m.id}
                onSelect={() => setPayment(m.id)}
                leading={
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-blue-100 text-blue-700">
                    <IconCard size={19} />
                  </span>
                }
                title={m.label}
                subtitle={m.detail}
              />
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[13px] text-ink-soft">
          No payment is taken in this prototype.
        </p>
      </section>

      <section>
        <SectionTitle>Family transfer</SectionTitle>
        <Card>
          <div className="flex items-center gap-3">
            <Avatar name={principal?.name ?? "?"} accent={principal?.accent} size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-soft">
                Current principal
              </p>
              <p className="text-[16px] font-bold text-ink">
                {principal?.name} — {principal?.mobile_number}
              </p>
            </div>
            <Pill tone="warn">Approval required</Pill>
          </div>
          <p className="mt-3 border-t border-blue-100 pt-3 text-[14.5px] leading-snug text-ink-soft">
            We&apos;ll ask the current account owner to approve the account
            relationship change. Nothing moves until they do.
          </p>
        </Card>
      </section>

      <SecurityNote tone="lock">
        Your identity is already confirmed for this change. This last step is
        the account owner&apos;s consent, not another check on you.
      </SecurityNote>

      <Button
        onClick={send}
        disabled={sending || !transfer}
        icon={<IconSend size={19} />}
      >
        Send approval request
      </Button>
    </div>
  );
}
