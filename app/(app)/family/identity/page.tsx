"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, ScreenHeader, Sheet } from "@/components/ui";
import {
  AssuranceLadder,
  RiskBanner,
  TrustSignalList,
  WhyThisCheck,
} from "@/components/adaptive-identity";
import { IconFaceId, IconCheck } from "@/components/icons";
import { useAppLink, useCurrentUser, useDb } from "@/lib/hooks";
import { confirmTransferIdentity, selectTransferForMember } from "@/lib/store";
import { TRUST_SIGNALS } from "@/lib/family";

/**
 * Screen 4 — the concept's centre of gravity.
 *
 * The screen exists to show what is NOT being asked for: no document scan, no
 * selfie, no onboarding form. Three signals CelcomDigi already holds are
 * reused, and exactly one confirmation is added because this action changes
 * who owns the account.
 */
export default function IdentityPage() {
  const db = useDb();
  const user = useCurrentUser();
  const router = useRouter();
  const link = useAppLink();

  const [confirming, setConfirming] = useState(false);
  const [altOpen, setAltOpen] = useState(false);

  if (!user) return null;
  const transfer = selectTransferForMember(db, user.id);

  const established = TRUST_SIGNALS.filter((s) => s.state === "ESTABLISHED");

  function confirm(method: string) {
    if (!transfer || confirming) return;
    setConfirming(true);
    setAltOpen(false);
    window.setTimeout(() => {
      confirmTransferIdentity(
        transfer.id,
        method,
        established.map((s) => s.id)
      );
      router.push(link("/family/setup"));
    }, 900);
  }

  return (
    <div className="space-y-5">
      <ScreenHeader
        title="Identity check"
        backLabel="Back"
        onBack={() => router.push(link("/family/independence"))}
      />

      <Card>
        <p className="text-[20px] font-bold leading-snug tracking-[-0.01em] text-ink">
          We already know you.
        </p>
        <p className="mt-1 text-[15.5px] leading-snug text-ink-soft">
          We only need one additional confirmation for this account change.
        </p>

        <div className="mt-4 border-t border-blue-100 pt-4">
          <TrustSignalList signals={TRUST_SIGNALS} />
        </div>
      </Card>

      <RiskBanner action="Account ownership change" level="OWNERSHIP" />

      <Card>
        <p className="mb-3 text-[15px] font-bold text-ink">
          Security matches the action
        </p>
        <AssuranceLadder active="OWNERSHIP" />
      </Card>

      <div className="space-y-2.5">
        <Button
          onClick={() => confirm("Face ID")}
          disabled={confirming || !transfer}
          icon={<IconFaceId size={21} />}
        >
          {confirming ? "Confirming…" : "Confirm with Face ID"}
        </Button>
        <Button variant="outline" size="md" onClick={() => setAltOpen(true)}>
          Verify another way
        </Button>
      </div>

      <WhyThisCheck level="OWNERSHIP" />

      <Sheet
        open={altOpen}
        onClose={() => setAltOpen(false)}
        title="Verify another way"
      >
        <p className="mb-4 text-[15px] leading-snug text-ink-soft">
          Any of these gives the same level of assurance for this change.
        </p>
        <ul className="space-y-2">
          {[
            { label: "Fingerprint", detail: "Use this device's sensor" },
            { label: "One-time code", detail: `Sent to ${transfer?.msisdn ?? "your number"}` },
            { label: "Full identity check", detail: "Scan your ID and take a selfie" },
          ].map((o) => (
            <li key={o.label}>
              <button
                type="button"
                onClick={() => confirm(o.label)}
                className="flex w-full items-center gap-3 rounded-card border-2 border-blue-100 p-3.5 text-left transition hover:border-blue-500"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700">
                  <IconCheck size={17} strokeWidth={2.6} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-bold text-ink">
                    {o.label}
                  </span>
                  <span className="block text-[13.5px] text-ink-soft">{o.detail}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13px] leading-snug text-ink-soft">
          A full identity check is only required when what we hold is out of
          date — not by default.
        </p>
      </Sheet>
    </div>
  );
}
