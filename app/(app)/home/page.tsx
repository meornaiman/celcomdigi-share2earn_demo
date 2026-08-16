"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, Card, SectionTitle } from "@/components/ui";
import { RequestCard } from "@/components/request-card";
import { TaskIcon } from "@/components/task-icon";
import { IconChevronRight, IconUsers } from "@/components/icons";
import { useT } from "@/components/providers";
import { useAppLink, useCurrentUser, useDb } from "@/lib/hooks";
import { selectActionable, selectFamilyGroup, trackEvent } from "@/lib/store";
import { TASK_ORDER, taskSlug } from "@/lib/tasks";
import {
  TASK_SHORTCUT_KEYS,
  TASK_TITLE_KEYS,
  type TranslationKey,
} from "@/lib/i18n";

function greetingKey(): TranslationKey {
  const hour = new Date().getHours();
  if (hour < 12) return "home.goodMorning";
  if (hour < 18) return "home.goodAfternoon";
  return "home.goodEvening";
}

export default function HomePage() {
  const t = useT();
  const db = useDb();
  const user = useCurrentUser();
  const link = useAppLink();

  // Keyed on the id, not the record: a store write must not re-fire this.
  const userId = user?.id;
  useEffect(() => {
    if (userId) trackEvent("share2earn_home_viewed", userId);
  }, [userId]);

  if (!user) return null;

  const { asOwner, asHelper } = selectActionable(db, user.id);
  const family = selectFamilyGroup(db, user.id);
  const myLine = family?.members.find(
    (m) => m.user_id === user.id && m.role === "SUPPLEMENTARY"
  );

  return (
    <div className="space-y-6">
      {/*
        The navy band runs from under the app bar to behind the account card,
        so the brand colour holds the top of the screen and the card reads as
        sitting on it rather than floating on the canvas.
      */}
      <section className="-mx-4 -mt-3 bg-navy-900 px-4 pb-14 pt-4">
        <h1 className="text-[24px] font-bold leading-tight tracking-[-0.02em] text-white">
          {t(greetingKey(), { name: user.name })}
        </h1>
        <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.08em] text-blue-100/70">
          {t("home.accountSummary")}
        </p>
      </section>

      <div className="-mt-[4.25rem]">
        <Card className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-soft">
              {user.account_type}
            </p>
            <p className="mt-0.5 truncate text-[17px] font-bold text-ink">
              {user.mobile_number}
            </p>
          </div>

          <span aria-hidden="true" className="h-11 w-px shrink-0 bg-blue-100" />

          <Link
            href={link("/rewards")}
            className="flex min-w-0 flex-1 items-center gap-1.5 rounded-tile py-1 transition hover:bg-blue-100/60"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold uppercase tracking-wide text-ink-soft">
                {t("home.dataLabel")}
              </span>
              <span className="mt-0.5 block text-[17px] font-bold text-ink">
                {user.data_balance_gb.toFixed(1)} GB
              </span>
              <span className="block truncate text-[12px] text-ink-soft">
                {user.plan_name}
              </span>
            </span>
            <IconChevronRight size={17} className="shrink-0 text-ink-soft" />
          </Link>
        </Card>
      </div>

      {/* The offer, and the only place both paths are presented together. */}
      <Card className="space-y-3.5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-blue-100 text-blue-700">
            <IconUsers size={23} />
          </span>
          <h2 className="text-[19px] font-bold leading-snug tracking-[-0.01em] text-ink">
            {t("home.heroTitle")}
          </h2>
        </div>

        <div className="space-y-2.5">
          <Button
            variant="brand"
            advance
            href={link(`/task/${taskSlug("BILL")}?mode=self`)}
          >
            {t("home.tryMyself")}
          </Button>
          <Button variant="primary" advance href={link("/help")}>
            {t("home.askTrusted")}
          </Button>
        </div>
      </Card>

      {family ? (
        <Link
          href={link("/family")}
          className="flex items-center gap-3 rounded-card bg-surface p-3.5 shadow-soft transition hover:shadow-lift"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-blue-100 text-blue-700">
            <IconUsers size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-bold text-ink">My family</span>
            <span className="block truncate text-[13.5px] text-ink-soft">
              {myLine
                ? `${family.members.length} lines · your line is supplementary`
                : `${family.members.length} lines on this account`}
            </span>
          </span>
          <IconChevronRight size={19} className="shrink-0 text-ink-soft" />
        </Link>
      ) : null}

      {asHelper.length > 0 ? (
        <section>
          <SectionTitle>{t("home.helpingOthers")}</SectionTitle>
          <ul className="space-y-2.5">
            {asHelper.map((r) => (
              <li key={r.id}>
                <RequestCard request={r} meId={user.id} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {asOwner.length > 0 ? (
        <section>
          <SectionTitle>{t("home.needsYou")}</SectionTitle>
          <ul className="space-y-2.5">
            {asOwner.map((r) => (
              <li key={r.id}>
                <RequestCard request={r} meId={user.id} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <SectionTitle>{t("home.quickShortcuts")}</SectionTitle>
        <ul className="grid grid-cols-5 gap-1.5">
          {TASK_ORDER.map((type) => (
            <li key={type}>
              <Link
                href={link(`/task/${taskSlug(type)}`)}
                aria-label={t(TASK_TITLE_KEYS[type])}
                className="flex flex-col items-center gap-1.5 rounded-tile py-2 transition hover:bg-blue-100/70"
              >
                <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-surface text-blue-700 shadow-soft">
                  <TaskIcon type={type} size={21} />
                </span>
                <span className="text-[11.5px] font-semibold text-ink">
                  {t(TASK_SHORTCUT_KEYS[type])}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
