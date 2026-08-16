"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Pill,
  ScreenHeader,
  SecurityNote,
  SectionTitle,
  Sheet,
} from "@/components/ui";
import { RiskBanner } from "@/components/adaptive-identity";
import {
  IconCheck,
  IconData,
  IconFaceId,
  IconPlus,
  IconSparkle,
} from "@/components/icons";
import { useAppLink, useCurrentUser, useDb } from "@/lib/hooks";
import {
  decideFamilyData,
  requestFamilyData,
  selectDataRequestsFor,
  selectFamilyGroup,
  selectPendingDataRequests,
  setMemberDataLimit,
  toggleMemberDataPause,
  selectUser,
} from "@/lib/store";
import {
  DATA_REQUEST_REASONS,
  DATA_TOPUP_STEPS,
  allocatedGb,
  unallocatedGb,
  usedGb,
  type FamilyGroup,
  type FamilyMember,
} from "@/lib/family";

/**
 * Family data sharing. One pool, sliced between the lines.
 *
 * The principal hands out and reclaims data; a supplementary line can ask for
 * more but cannot take it. Approving a top-up sits at the CHANGE rung of the
 * assurance ladder — confirm it's me — which is the visible contrast with the
 * ownership transfer journey asking for proof.
 */
export default function FamilyDataPage() {
  const db = useDb();
  const user = useCurrentUser();
  const router = useRouter();
  const link = useAppLink();

  if (!user) return null;
  const group = selectFamilyGroup(db, user.id);

  if (!group) {
    return (
      <div className="space-y-5">
        <ScreenHeader
          title="Family data"
          backLabel="Back"
          onBack={() => router.push(link("/family"))}
        />
        <Card>
          <p className="text-[15px] text-ink-soft">
            This line is not part of a family data pool.
          </p>
        </Card>
      </div>
    );
  }

  const isPrincipal = group.principal_user_id === user.id;

  return (
    <div className="space-y-6">
      <ScreenHeader
        title="Family data"
        sub={`${group.shared_pool_gb}GB shared across ${group.members.length} lines`}
        backLabel="Back"
        onBack={() => router.push(link("/family"))}
      />

      <PoolCard group={group} />

      {isPrincipal ? (
        <PrincipalView group={group} principalId={user.id} />
      ) : (
        <MemberView group={group} memberId={user.id} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared pool                                                         */
/* ------------------------------------------------------------------ */

const SHARE_COLOURS = ["#0057D9", "#FFD400", "#32C85A", "#1976F3"];

function PoolCard({ group }: { group: FamilyGroup }) {
  const db = useDb();
  const used = usedGb(group);
  const free = unallocatedGb(group);

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft">
          Used this cycle
        </p>
        <p className="text-[13px] text-ink-soft">of {group.shared_pool_gb}GB</p>
      </div>
      <p className="text-[30px] font-bold leading-none tracking-[-0.02em] text-ink">
        {used.toFixed(1)}
        <span className="text-[18px] font-semibold text-ink-soft">GB</span>
      </p>

      {/* One bar, segmented by line — who is using the family's data, at a glance. */}
      <div className="mt-3 flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-blue-100">
        {group.members.map((m, i) => (
          <span
            key={m.user_id}
            title={`${m.msisdn}: ${m.data_used_gb.toFixed(1)}GB`}
            style={{
              width: `${(m.data_used_gb / group.shared_pool_gb) * 100}%`,
              background: SHARE_COLOURS[i % SHARE_COLOURS.length],
            }}
          />
        ))}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {group.members.map((m, i) => {
          const u = selectUser(db, m.user_id);
          return (
            <li key={m.user_id} className="flex items-center gap-1.5 text-[13px]">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: SHARE_COLOURS[i % SHARE_COLOURS.length] }}
              />
              <span className="font-semibold text-ink">{u?.name}</span>
              <span className="text-ink-soft">{m.data_used_gb.toFixed(1)}GB</span>
            </li>
          );
        })}
        {free > 0 ? (
          <li className="flex items-center gap-1.5 text-[13px]">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full border-2 border-blue-100"
            />
            <span className="text-ink-soft">{free}GB unallocated</span>
          </li>
        ) : null}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Principal                                                           */
/* ------------------------------------------------------------------ */

function PrincipalView({
  group,
  principalId,
}: {
  group: FamilyGroup;
  principalId: string;
}) {
  const db = useDb();
  const pending = selectPendingDataRequests(db, principalId);
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <>
      {pending.length > 0 ? (
        <section>
          <SectionTitle>Requests waiting on you</SectionTitle>
          <ul className="space-y-2.5">
            {pending.map((r) => {
              const member = selectUser(db, r.member_user_id);
              return (
                <li key={r.id}>
                  <Card className="border-2 border-blue-500">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={member?.name ?? "?"}
                        accent={member?.accent}
                        size={42}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[16px] font-bold text-ink">
                          {member?.name} needs {r.requested_gb}GB
                        </p>
                        <p className="text-[13.5px] leading-snug text-ink-soft">
                          {r.reason}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="md"
                        block={false}
                        className="flex-1"
                        onClick={() => setConfirming(r.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="md"
                        variant="ghost"
                        block={false}
                        className="flex-1"
                        onClick={() => decideFamilyData(r.id, principalId, false)}
                      >
                        Decline
                      </Button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section>
        <SectionTitle>Data per line</SectionTitle>
        <ul className="space-y-2.5">
          {group.members.map((m) => (
            <li key={m.user_id}>
              <MemberControl
                member={m}
                principalId={principalId}
                isSelf={m.user_id === principalId}
              />
            </li>
          ))}
        </ul>
      </section>

      <SecurityNote tone="lock">
        Only you can change how the pool is shared. Everyone else can ask, not
        take.
      </SecurityNote>

      {/* Approving a top-up is a commercial change, so it asks for a
          confirmation rather than proof of identity. */}
      <Sheet
        open={!!confirming}
        onClose={() => setConfirming(null)}
        title="Confirm it's you"
      >
        <div className="mb-4">
          <RiskBanner action="Sharing more data" level="CHANGE" />
        </div>
        <p className="mb-4 text-[15px] leading-snug text-ink-soft">
          This changes what your family account is billed for, so it needs a
          quick confirmation — not a full identity check.
        </p>
        <Button
          icon={<IconFaceId size={20} />}
          onClick={() => {
            if (confirming) decideFamilyData(confirming, principalId, true);
            setConfirming(null);
          }}
        >
          Confirm and share
        </Button>
        <div className="mt-2.5">
          <Button variant="ghost" size="md" onClick={() => setConfirming(null)}>
            Cancel
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function MemberControl({
  member,
  principalId,
  isSelf,
}: {
  member: FamilyMember;
  principalId: string;
  isSelf: boolean;
}) {
  const db = useDb();
  const u = selectUser(db, member.user_id);
  const pct = Math.min(100, (member.data_used_gb / member.data_limit_gb) * 100);
  const nearLimit = pct >= 85;

  return (
    <Card>
      <div className="flex items-center gap-3">
        <Avatar name={u?.name ?? "?"} accent={u?.accent} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-bold text-ink">
            {u?.name}
            {isSelf ? <span className="text-ink-soft"> · you</span> : null}
          </p>
          <p className="text-[13px] text-ink-soft">{member.msisdn}</p>
        </div>
        {member.data_paused ? (
          <Pill tone="danger">Paused</Pill>
        ) : nearLimit ? (
          <Pill tone="warn">Near limit</Pill>
        ) : null}
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
          <span className="font-semibold text-ink">
            {member.data_used_gb.toFixed(1)}GB used
          </span>
          <span className="text-ink-soft">{member.data_limit_gb}GB limit</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-blue-100">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              member.data_paused
                ? "bg-ink-soft"
                : nearLimit
                  ? "bg-red-500"
                  : "bg-blue-700"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {DATA_TOPUP_STEPS.map((gb) => (
          <button
            key={gb}
            type="button"
            onClick={() =>
              setMemberDataLimit(principalId, member.user_id, member.data_limit_gb + gb)
            }
            className="inline-flex min-h-[38px] items-center gap-1 rounded-full bg-blue-100 px-3 text-[13px] font-bold text-blue-700 transition hover:bg-blue-500 hover:text-white"
          >
            <IconPlus size={14} />
            {gb}GB
          </button>
        ))}
        {!isSelf ? (
          <button
            type="button"
            onClick={() => toggleMemberDataPause(principalId, member.user_id)}
            className="ml-auto inline-flex min-h-[38px] items-center rounded-full px-3 text-[13px] font-bold text-ink-soft transition hover:bg-blue-100"
          >
            {member.data_paused ? "Resume data" : "Pause data"}
          </button>
        ) : null}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Member                                                             */
/* ------------------------------------------------------------------ */

function MemberView({
  group,
  memberId,
}: {
  group: FamilyGroup;
  memberId: string;
}) {
  const db = useDb();
  const [open, setOpen] = useState(false);
  const [gb, setGb] = useState(DATA_TOPUP_STEPS[0]);
  const [reason, setReason] = useState(DATA_REQUEST_REASONS[0]);

  const mine = group.members.find((m) => m.user_id === memberId);
  const principal = selectUser(db, group.principal_user_id);
  const history = selectDataRequestsFor(db, memberId);
  const pending = history.find((r) => r.status === "PENDING");

  if (!mine) return null;

  const left = Math.max(0, mine.data_limit_gb - mine.data_used_gb);
  const pct = Math.min(100, (mine.data_used_gb / mine.data_limit_gb) * 100);

  return (
    <>
      <Card>
        <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft">
          My share
        </p>
        <p className="mt-0.5 text-[26px] font-bold leading-none tracking-[-0.02em] text-ink">
          {left.toFixed(1)}
          <span className="text-[16px] font-semibold text-ink-soft">
            GB left of {mine.data_limit_gb}GB
          </span>
        </p>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-blue-100">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              pct >= 85 ? "bg-red-500" : "bg-blue-700"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {mine.data_paused ? (
          <p className="mt-2.5 text-[13.5px] font-semibold text-red-500">
            {principal?.name} has paused data on this line.
          </p>
        ) : null}
      </Card>

      {pending ? (
        <Card tone="tint" className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-yellow-500 text-navy-900">
            <IconSparkle size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-navy-900">
              Waiting on {principal?.name}
            </p>
            <p className="text-[13.5px] text-navy-900/70">
              You asked for {pending.requested_gb}GB
            </p>
          </div>
        </Card>
      ) : (
        <Button onClick={() => setOpen(true)} icon={<IconData size={19} />}>
          Ask for more data
        </Button>
      )}

      {history.length > 0 ? (
        <section>
          <SectionTitle>Request history</SectionTitle>
          <ul className="space-y-2">
            {history.map((r) => (
              <li key={r.id}>
                <Card className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15.5px] font-bold text-ink">
                      {r.requested_gb}GB
                    </p>
                    <p className="truncate text-[13px] text-ink-soft">{r.reason}</p>
                  </div>
                  <Pill
                    tone={
                      r.status === "APPROVED"
                        ? "success"
                        : r.status === "DECLINED"
                          ? "danger"
                          : "warn"
                    }
                    icon={
                      r.status === "APPROVED" ? (
                        <IconCheck size={14} strokeWidth={2.6} />
                      ) : null
                    }
                  >
                    {r.status.toLowerCase()}
                  </Pill>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <SecurityNote>
        {principal?.name} owns the family pool. Asking never changes your
        allowance on its own.
      </SecurityNote>

      <Sheet open={open} onClose={() => setOpen(false)} title="Ask for more data">
        <fieldset className="mb-4">
          <legend className="mb-2 text-[15px] font-semibold text-ink">
            How much?
          </legend>
          <div className="flex gap-2">
            {DATA_TOPUP_STEPS.map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => setGb(step)}
                aria-pressed={gb === step}
                className={`min-h-[52px] flex-1 rounded-btn border-2 text-[17px] font-bold transition ${
                  gb === step
                    ? "border-blue-500 bg-blue-100 text-navy-900"
                    : "border-blue-100 bg-surface text-ink"
                }`}
              >
                {step}GB
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mb-4">
          <legend className="mb-2 text-[15px] font-semibold text-ink">Why?</legend>
          <ul className="space-y-2">
            {DATA_REQUEST_REASONS.map((r) => (
              <li key={r}>
                <button
                  type="button"
                  onClick={() => setReason(r)}
                  aria-pressed={reason === r}
                  className={`flex w-full items-center gap-2.5 rounded-btn border-2 px-3.5 py-2.5 text-left text-[15px] transition ${
                    reason === r
                      ? "border-blue-500 bg-blue-100 font-semibold text-navy-900"
                      : "border-blue-100 bg-surface text-ink"
                  }`}
                >
                  {r}
                </button>
              </li>
            ))}
          </ul>
        </fieldset>

        <Button
          onClick={() => {
            requestFamilyData(memberId, gb, reason);
            setOpen(false);
          }}
        >
          Send to {principal?.name}
        </Button>
      </Sheet>
    </>
  );
}
