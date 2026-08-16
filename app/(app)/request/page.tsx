"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  ChoiceCard,
  Divider,
  EmptyState,
  Field,
  PageTitle,
  RiskBadge,
  SecurityNote,
  Sheet,
  StatusBadge,
  TextArea,
} from "@/components/ui";
import { RequestContextPanel } from "@/components/request-context";
import {
  FeatureList,
  OptionBadge,
  OptionSummary,
} from "@/components/option-card";
import {
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconLock,
  IconSend,
  IconShield,
  IconSparkle,
} from "@/components/icons";
import { useLang, useT } from "@/components/providers";
import {
  timeAgo,
  timeUntil,
  useAppLink,
  useCurrentUser,
  useDb,
  useHydrated,
  useQueryParam,
} from "@/lib/hooks";
import {
  acceptRequest,
  approveRecommendation,
  cancelRequest,
  completeRequest,
  declineRequest,
  markNotificationsRead,
  markOwnerReviewing,
  markRequestViewed,
  rejectRecommendation,
  levelFromXp,
  selectAuditForRequest,
  selectOptions,
  selectProgress,
  selectRecommendation,
  selectRequest,
  selectUser,
  sendRecommendation,
  XP_PER_LEVEL,
} from "@/lib/store";
import { TASKS, formatMoney, formatReward } from "@/lib/tasks";
import type { HelpRequest, User } from "@/lib/types";

export default function RequestPage() {
  const id = useQueryParam("id");
  const justSent = useQueryParam("sent") === "1";
  const hydrated = useHydrated();
  const db = useDb();
  const user = useCurrentUser();
  const t = useT();
  const link = useAppLink();
  const router = useRouter();

  const request = selectRequest(db, id);

  // Opening a request clears its notifications for whoever is reading it.
  const userId = user?.id;
  const openRequestId = request?.id;
  useEffect(() => {
    if (userId && openRequestId) markNotificationsRead(userId, openRequestId);
  }, [userId, openRequestId]);

  if (!hydrated || !user) return null;

  if (!request) {
    return (
      <div className="space-y-4 pt-6">
        <EmptyState
          title="Request not found"
          body="It may have been reset or belongs to a different account."
          action={<Button href={link("/home")}>Back to home</Button>}
        />
      </div>
    );
  }

  const isOwner = request.owner_user_id === user.id;
  const isHelper = request.helper_user_id === user.id;

  if (!isOwner && !isHelper) {
    return (
      <div className="pt-6">
        <EmptyState
          icon={<IconLock size={22} />}
          title="You don't have access to this request"
          body="Only the account owner and the chosen helper can open it."
          action={<Button href={link("/home")}>Back to home</Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => router.push(link("/home"))}
        className="-ml-1 inline-flex items-center gap-1.5 text-[15px] font-semibold text-blue-700"
      >
        <IconArrowLeft size={18} />
        {t("common.back")}
      </button>

      {isOwner ? (
        <OwnerView request={request} user={user} justSent={justSent} />
      ) : (
        <HelperView request={request} user={user} />
      )}

      <AuditTrail requestId={request.id} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Owner                                                               */
/* ------------------------------------------------------------------ */

function OwnerView({
  request,
  user,
  justSent,
}: {
  request: HelpRequest;
  user: User;
  justSent: boolean;
}) {
  const db = useDb();
  const t = useT();
  const { lang } = useLang();
  const link = useAppLink();
  const helper = selectUser(db, request.helper_user_id);
  const def = TASKS[request.task_type];
  const recommendation = selectRecommendation(db, request.id);
  const options = selectOptions(db, request.id);
  const chosen = options.find((o) => o.id === recommendation?.selected_option_id);

  const [confirmOpen, setConfirmOpen] = useState(false);

  // Marks the recommendation as under review the moment the owner opens it.
  useEffect(() => {
    if (request.status === "RECOMMENDATION_SENT") {
      markOwnerReviewing(request.id, user.id);
    }
  }, [request.status, request.id, user.id]);

  // Approval hands off to a short execution step before the task completes, so
  // the owner sees the action being applied rather than an instant jump.
  useEffect(() => {
    if (request.status !== "EXECUTING") return;
    const timer = window.setTimeout(() => completeRequest(request.id), 1600);
    return () => window.clearTimeout(timer);
  }, [request.status, request.id]);

  if (request.status === "COMPLETED") {
    return <SuccessView request={request} user={user} />;
  }

  if (request.status === "EXECUTING" || request.status === "OWNER_APPROVED") {
    return (
      <Card className="py-10 text-center">
        <span className="animate-pulse-ring mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-blue-100 text-blue-700">
          <IconSparkle size={26} />
        </span>
        <p className="text-[19px] font-bold text-ink">Applying your approval</p>
        <p className="mt-1 text-[15px] text-ink-soft">
          {chosen ? chosen.title : def.label} · {request.id}
        </p>
      </Card>
    );
  }

  const terminal = [
    "DECLINED_BY_HELPER",
    "DECLINED_BY_OWNER",
    "EXPIRED",
    "CANCELLED",
    "FAILED",
  ].includes(request.status);

  if (terminal) {
    return (
      <>
        <RequestHeader request={request} counterpart={helper} label={def.label} />
        <EmptyState
          title={t(`status.${request.status}`)}
          body="Nothing was changed on your account."
          action={
            <Button href={link(`/task/${request.task_type.toLowerCase()}`)}>
              Start again
            </Button>
          }
        />
      </>
    );
  }

  // Recommendation is in — this is the approval screen (DESIGN.md §8).
  if (recommendation && chosen) {
    return (
      <>
        <div className="flex items-center gap-3">
          <Avatar name={helper?.name ?? "?"} accent={helper?.accent} size={52} />
          <div>
            <h1 className="text-[24px] font-bold leading-tight tracking-[-0.02em] text-ink">
              {t("approve.title", { name: helper?.name ?? "Your helper" })}
            </h1>
            <p className="text-[14px] text-ink-soft">
              {timeAgo(recommendation.created_at, lang)} · {request.id}
            </p>
          </div>
        </div>

        <OptionSummary option={chosen} highlight />

        {recommendation.message ? (
          <Card>
            <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft">
              {t("approve.note", { name: helper?.name ?? "Helper" })}
            </p>
            <p className="mt-1 text-[16px] italic leading-snug text-ink">
              “{recommendation.message}”
            </p>
          </Card>
        ) : null}

        <SecurityNote tone="lock">
          {def.risk === "GREEN" ? t("approve.securityGreen") : t("approve.security")}
        </SecurityNote>

        <div className="space-y-2.5">
          {def.risk === "GREEN" ? (
            <Button
              variant="success"
              onClick={() => approveRecommendation(request.id, user.id)}
              icon={<IconCheck size={20} strokeWidth={2.6} />}
            >
              {t("approve.gotIt")}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => setConfirmOpen(true)}
              icon={<IconCheck size={20} strokeWidth={2.6} />}
            >
              {t("approve.approve")}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => rejectRecommendation(request.id, user.id, "ASK_AGAIN")}
          >
            {t("approve.askAgain")}
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => rejectRecommendation(request.id, user.id, "DECLINE")}
          >
            {t("approve.reject")}
          </Button>
        </div>

        <Sheet
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title={t("approve.confirmTitle")}
        >
          <p className="mb-4 text-[16px] leading-snug text-ink-soft">
            {t("approve.confirmBody", {
              title: chosen.title,
              price: chosen.price > 0 ? formatMoney(chosen.price) : "no charge",
            })}
          </p>
          <div className="space-y-2.5">
            <Button
              variant="primary"
              onClick={() => {
                setConfirmOpen(false);
                approveRecommendation(request.id, user.id);
              }}
            >
              {t("approve.confirmCta")}
            </Button>
            <Button variant="ghost" size="md" onClick={() => setConfirmOpen(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </Sheet>
      </>
    );
  }

  // Still waiting on the helper.
  return (
    <>
      {justSent ? (
        <Card className="animate-pop flex items-center gap-3 border-2 border-green-500/35">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-green-500/14 text-green-500">
            <IconCheck size={22} strokeWidth={2.6} />
          </span>
          <div>
            <p className="text-[17px] font-bold text-ink">{t("request.sentTitle")}</p>
            <p className="text-[14px] text-ink-soft">
              {t("request.sentBody", { name: helper?.name ?? "your helper" })}
            </p>
          </div>
        </Card>
      ) : null}

      <RequestHeader request={request} counterpart={helper} label={def.label} />

      <Card className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700">
          <IconClock size={22} />
        </span>
        <div className="flex-1">
          <p className="text-[17px] font-bold text-ink">
            {t("request.waiting", { name: helper?.name ?? "your helper" })}
          </p>
          <p className="text-[14px] text-ink-soft">
            {t("request.expires", { time: timeUntil(request.expires_at, lang) })}
          </p>
        </div>
      </Card>

      <RequestContextPanel request={request} ownerName={user.name} />

      <Button variant="ghost" size="md" onClick={() => cancelRequest(request.id, user.id)}>
        {t("common.cancel")}
      </Button>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Helper                                                              */
/* ------------------------------------------------------------------ */

function HelperView({ request, user }: { request: HelpRequest; user: User }) {
  const db = useDb();
  const t = useT();
  const { lang } = useLang();
  const owner = selectUser(db, request.owner_user_id);
  const def = TASKS[request.task_type];
  const options = selectOptions(db, request.id);
  const recommendation = selectRecommendation(db, request.id);

  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  useEffect(() => {
    markRequestViewed(request.id, user.id);
  }, [request.id, user.id]);

  if (request.status === "COMPLETED") {
    return <SuccessView request={request} user={user} />;
  }

  if (["RECOMMENDATION_SENT", "OWNER_REVIEWING", "OWNER_APPROVED", "EXECUTING"].includes(
    request.status
  )) {
    const chosen = options.find((o) => o.id === recommendation?.selected_option_id);
    return (
      <>
        <RequestHeader request={request} counterpart={owner} label={def.label} />
        <Card className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700">
            <IconClock size={22} />
          </span>
          <div>
            <p className="text-[17px] font-bold text-ink">
              {t("request.waiting", { name: owner?.name ?? "them" })}
            </p>
            <p className="text-[14px] text-ink-soft">
              You recommended {chosen?.title ?? "an option"}
              {recommendation ? ` · ${timeAgo(recommendation.created_at, lang)}` : ""}
            </p>
          </div>
        </Card>
        <SecurityNote tone="lock">
          {t("request.riskAmber", { name: owner?.name ?? "They" })}
        </SecurityNote>
      </>
    );
  }

  if (
    ["DECLINED_BY_HELPER", "DECLINED_BY_OWNER", "EXPIRED", "CANCELLED", "FAILED"].includes(
      request.status
    )
  ) {
    return (
      <>
        <RequestHeader request={request} counterpart={owner} label={def.label} />
        <EmptyState
          title={t(`status.${request.status}`)}
          body="No further action is needed."
        />
      </>
    );
  }

  const accepted = request.status === "HELPER_ACCEPTED";

  return (
    <>
      <div className="flex items-center gap-3">
        <Avatar name={owner?.name ?? "?"} accent={owner?.accent} size={52} />
        <div>
          <h1 className="text-[24px] font-bold leading-tight tracking-[-0.02em] text-ink">
            {t("request.helperTitle", { name: owner?.name ?? "Someone" })}
          </h1>
          <p className="text-[15px] text-ink-soft">{t("request.helperSubtitle")}</p>
          <p className="text-[13px] text-ink-soft">
            {def.label} · {timeAgo(request.created_at, lang)} · {request.id}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <RiskBadge risk={def.risk} />
        <StatusBadge status={request.status} label={t(`status.${request.status}`)} />
      </div>

      <RequestContextPanel request={request} ownerName={owner?.name ?? "the owner"} />

      <SecurityNote tone="lock">
        {def.risk === "GREEN"
          ? t("request.riskGreen")
          : t("request.riskAmber", { name: owner?.name ?? "They" })}
      </SecurityNote>

      {accepted ? (
        <>
          <PageTitle>{t("request.recommendTitle")}</PageTitle>
          <ul className="space-y-2.5">
            {options.map((o) => (
              <li key={o.id}>
                <ChoiceCard
                  name="option"
                  selected={selected === o.id}
                  onSelect={() => setSelected(o.id)}
                  leading={
                    o.badge ? (
                      <OptionBadge
                        label={o.badge}
                        tone={selected === o.id ? "brand" : "muted"}
                      />
                    ) : undefined
                  }
                  title={
                    <span className="flex items-baseline justify-between gap-3">
                      {o.title}
                      {o.price > 0 ? (
                        <span className="shrink-0 text-[18px] font-bold text-blue-700">
                          {formatMoney(o.price)}
                        </span>
                      ) : null}
                    </span>
                  }
                  subtitle={o.subtitle}
                  meta={<FeatureList features={o.features} />}
                />
              </li>
            ))}
          </ul>

          <Field label={t("request.recommendNote")} htmlFor="rec-note">
            <TextArea
              id="rec-note"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("request.recommendNotePlaceholder")}
              maxLength={200}
            />
          </Field>

          <Button
            variant="primary"
            disabled={!selected}
            onClick={() =>
              selected && sendRecommendation(request.id, user.id, selected, message)
            }
            icon={<IconSend size={19} />}
          >
            {def.risk === "GREEN"
              ? t("request.explainCta", { name: owner?.name ?? "them" })
              : t("request.recommendCta", { name: owner?.name ?? "them" })}
          </Button>
        </>
      ) : (
        <div className="space-y-2.5">
          <Button
            variant="primary"
            onClick={() => acceptRequest(request.id, user.id)}
            icon={<IconShield size={20} />}
          >
            {t("request.accept")}
          </Button>
          <Button variant="ghost" size="md" onClick={() => setDeclineOpen(true)}>
            {t("request.decline")}
          </Button>
        </div>
      )}

      <Sheet
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        title={t("request.decline")}
      >
        <Field label={t("request.declineReason")} htmlFor="decline-reason">
          <TextArea
            id="decline-reason"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            maxLength={160}
          />
        </Field>
        <div className="mt-4 space-y-2.5">
          <Button
            variant="danger"
            onClick={() => {
              setDeclineOpen(false);
              declineRequest(request.id, user.id, declineReason);
            }}
          >
            {t("request.declineSend")}
          </Button>
          <Button variant="ghost" size="md" onClick={() => setDeclineOpen(false)}>
            {t("common.cancel")}
          </Button>
        </div>
      </Sheet>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

function RequestHeader({
  request,
  counterpart,
  label,
}: {
  request: HelpRequest;
  counterpart: User | null;
  label: string;
}) {
  const t = useT();
  const { lang } = useLang();
  return (
    <div className="flex items-center gap-3">
      <Avatar name={counterpart?.name ?? "?"} accent={counterpart?.accent} size={48} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[19px] font-bold text-ink">
          {label} · {counterpart?.name}
        </p>
        <p className="text-[13px] text-ink-soft">
          {request.id} · {timeAgo(request.created_at, lang)}
        </p>
      </div>
      <StatusBadge status={request.status} label={t(`status.${request.status}`)} />
    </div>
  );
}

/** DESIGN.md §8 success screen — both sides are rewarded, and both are shown. */
function SuccessView({ request, user }: { request: HelpRequest; user: User }) {
  const db = useDb();
  const t = useT();
  const link = useAppLink();
  const isOwner = request.owner_user_id === user.id;
  const other = selectUser(db, isOwner ? request.helper_user_id : request.owner_user_id);

  const mine = db.rewards.find(
    (r) => r.help_request_id === request.id && r.user_id === user.id
  );
  const theirs = db.rewards.find(
    (r) => r.help_request_id === request.id && r.user_id === other?.id
  );

  return (
    <div className="space-y-5">
      <div className="animate-pop rounded-card bg-navy-900 p-6 text-center text-white shadow-lift">
        <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-green-500 text-white">
          <IconCheck size={32} strokeWidth={2.8} />
        </span>
        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em]">
          {t("success.title")}
        </h1>
        <p className="mt-1.5 text-[15px] text-white/70">{t("success.thanks")}</p>
        <p className="mt-0.5 text-[13px] text-white/45">
          {TASKS[request.task_type].label} · {request.id}
        </p>

        <div className="mt-6 space-y-2.5 text-left">
          <RewardRow
            name={user.name}
            accent={user.accent}
            label={t("success.youEarned")}
            reward={mine}
            fallback={TASKS[request.task_type].reward}
          />
          <RewardRow
            name={other?.name ?? "Helper"}
            accent={other?.accent}
            label={t("success.helperEarned", { name: other?.name ?? "They" })}
            reward={theirs}
            fallback={TASKS[request.task_type].reward}
          />
          <HelperLevelRow userId={isOwner ? request.helper_user_id : user.id} />
        </div>
      </div>

      <div className="space-y-2.5">
        <Button variant="primary" href={link("/help")}>
          {t("success.helpSomeone")}
        </Button>
        <Button variant="outline" href={link("/rewards")}>
          {t("rewards.title")}
        </Button>
        <Button variant="ghost" size="md" href={link("/home")}>
          {t("success.backHome")}
        </Button>
      </div>
    </div>
  );
}

function RewardRow({
  name,
  accent,
  label,
  reward,
  fallback,
}: {
  name: string;
  accent?: string;
  label: string;
  reward:
    | { reward_type: "DATA_MB" | "POINTS"; reward_value: number; status: string }
    | undefined;
  fallback: { type: "DATA_MB" | "POINTS"; value: number };
}) {
  const t = useT();
  const type = reward?.reward_type ?? fallback.type;
  const value = reward?.reward_value ?? fallback.value;
  const blocked = reward && reward.status !== "ISSUED";

  return (
    <div className="flex items-center gap-3 rounded-tile bg-white/10 p-3">
      <Avatar name={name} accent={accent} size={40} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-white/70">{label}</p>
        {blocked ? (
          <p className="text-[13px] font-semibold text-white/60">
            {reward!.status === "BLOCKED_CAP"
              ? t("rewards.blockedCap")
              : t("rewards.blockedDuplicate")}
          </p>
        ) : null}
      </div>
      <p className="shrink-0 text-[22px] font-bold leading-none tracking-[-0.02em] text-yellow-500">
        {formatReward(type, value)}
      </p>
    </div>
  );
}

/** The helper's standing after the assist — the reason to come back. */
function HelperLevelRow({ userId }: { userId: string }) {
  const db = useDb();
  const t = useT();
  const progress = selectProgress(db, userId);
  const { level, intoLevel } = levelFromXp(progress.xp);

  return (
    <div className="flex items-center gap-3 rounded-tile bg-white/10 p-3">
      <span
        aria-hidden="true"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-yellow-500 text-[16px] font-bold text-navy-900"
      >
        {level}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold">
          {t("rewards.progressTitle", { level })}
        </p>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-yellow-500 transition-[width] duration-700"
            style={{ width: `${(intoLevel / XP_PER_LEVEL) * 100}%` }}
          />
        </div>
      </div>
      <p className="shrink-0 text-[13px] font-semibold text-white/70">
        {t("rewards.progressXp", { into: intoLevel, total: XP_PER_LEVEL })}
      </p>
    </div>
  );
}

/** DESIGN.md §24 — the audit log is visible to the people in the request. */
function AuditTrail({ requestId }: { requestId: string }) {
  const db = useDb();
  const t = useT();
  const { lang } = useLang();
  const entries = selectAuditForRequest(db, requestId);
  const [open, setOpen] = useState(false);

  if (entries.length === 0) return null;

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      className="rounded-card bg-surface p-4 shadow-soft"
    >
      <summary className="cursor-pointer list-none text-[15px] font-bold text-ink marker:hidden">
        {t("activity.auditTitle")} ({entries.length})
      </summary>
      <div className="mt-3">
        <Divider />
        <ol className="mt-3 space-y-3">
          {entries.map((e) => (
            <li key={e.id} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500"
              />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[12px] font-semibold text-blue-700">
                  {e.event}
                </p>
                <p className="text-[14px] leading-snug text-ink">{e.detail}</p>
                <p className="text-[12px] text-ink-soft">
                  {e.actor_user_id} · {timeAgo(e.created_at, lang)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}
