"use client";

import { useRouter } from "next/navigation";
import { Button, Card, ScreenHeader, SecurityNote } from "@/components/ui";
import { Confetti } from "@/components/confetti";
import { IconCheck, IconClock } from "@/components/icons";
import { useAppLink, useCurrentUser, useDb } from "@/lib/hooks";
import { selectTransferForMember, selectUser } from "@/lib/store";
import { CUSTOMER_LINE, INDEPENDENT_PLANS } from "@/lib/family";
import { formatMoney } from "@/lib/tasks";

/**
 * Screen 6 — the payoff, and the waiting room before it. Until the principal
 * approves, this screen shows the request as pending rather than pretending
 * the move already happened.
 */
export default function FamilySuccessPage() {
  const db = useDb();
  const user = useCurrentUser();
  const router = useRouter();
  const link = useAppLink();

  if (!user) return null;
  const transfer = selectTransferForMember(db, user.id);

  if (!transfer) {
    return (
      <div className="space-y-5">
        <ScreenHeader
          title="Nothing in progress"
          backLabel="Back"
          onBack={() => router.push(link("/family"))}
        />
        <Button href={link("/family")}>Back to my family</Button>
      </div>
    );
  }

  const principal = selectUser(db, transfer.principal_user_id);
  const plan = INDEPENDENT_PLANS.find((p) => p.id === transfer.chosen_plan_id);
  const done = transfer.status === "COMPLETED";
  const declined = transfer.status === "PRINCIPAL_DECLINED";

  if (declined) {
    return (
      <div className="space-y-5">
        <ScreenHeader
          title="Not approved this time"
          backLabel="Back"
          onBack={() => router.push(link("/family"))}
        />
        <Card>
          <p className="text-[16px] leading-snug text-ink">
            {principal?.name} didn&apos;t approve the transfer. Nothing changed
            on your line, and you can ask again whenever you&apos;re ready.
          </p>
        </Card>
        <Button href={link("/family/manage")}>Back to my line</Button>
      </div>
    );
  }

  if (!done) {
    return (
      <div className="space-y-5">
        <ScreenHeader
          title="Waiting for approval"
          sub={transfer.id}
          backLabel="Back"
          onBack={() => router.push(link("/family"))}
        />

        <Card className="flex items-center gap-3">
          <span className="animate-pulse-ring grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700">
            <IconClock size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-bold text-ink">
              Sent to {principal?.name}
            </p>
            <p className="text-[14px] leading-snug text-ink-soft">
              {transfer.msisdn} moves to your own account as soon as they
              approve.
            </p>
          </div>
        </Card>

        <Card>
          <p className="mb-2.5 text-[13px] font-bold uppercase tracking-wide text-ink-soft">
            Already done
          </p>
          <ul className="space-y-2">
            {[
              "Eligibility checked",
              `Identity confirmed with ${transfer.stepped_up_with ?? "biometrics"}`,
              plan ? `${plan.name} selected` : "Plan selected",
              "Billing method added",
            ].map((s) => (
              <li key={s} className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-green-500 text-white"
                >
                  <IconCheck size={12} strokeWidth={3.2} />
                </span>
                <span className="text-[15px] leading-snug text-ink">{s}</span>
              </li>
            ))}
          </ul>
        </Card>

        <SecurityNote tone="lock">
          Your line keeps working normally while this is pending.
        </SecurityNote>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="animate-pop relative overflow-hidden rounded-card bg-navy-900 p-6 text-center text-white shadow-lift">
        <Confetti />
        <span className="animate-pop relative mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-green-500 text-white">
          <IconCheck size={32} strokeWidth={2.8} />
        </span>
        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em]">
          You&apos;re independent
        </h1>
        <p className="mt-1.5 text-[15px] text-white/70">{CUSTOMER_LINE}</p>

        <p className="mt-5 inline-block rounded-full bg-white/12 px-5 py-2 font-mono text-[22px] font-bold tracking-tight text-yellow-500">
          {transfer.msisdn}
        </p>

        <ul className="mt-5 space-y-2 text-left">
          {[
            "Same number",
            "Own CelcomDigi account",
            "Own billing",
            "Identity secured",
            "Family transition completed",
          ].map((s) => (
            <li key={s} className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-green-500 text-white"
              >
                <IconCheck size={12} strokeWidth={3.2} />
              </span>
              <span className="text-[15px] text-white/90">{s}</span>
            </li>
          ))}
        </ul>
      </div>

      <Card tone="tint">
        <p className="text-[16px] font-bold leading-snug text-navy-900">
          Your CelcomDigi relationship changed.
          <br />
          Your connection didn&apos;t.
        </p>
        {plan ? (
          <p className="mt-2 text-[14px] text-navy-900/75">
            Now on {plan.name} · {formatMoney(plan.price)} a month, billed to you.
          </p>
        ) : null}
      </Card>

      <div className="space-y-2.5">
        <Button variant="primary" advance href={link("/home")}>
          Go to my account
        </Button>
        <Button variant="outline" href={link("/family")}>
          Explore my plan
        </Button>
      </div>
    </div>
  );
}
