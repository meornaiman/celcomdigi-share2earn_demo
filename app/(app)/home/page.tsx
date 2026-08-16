"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Card, SectionTitle } from "@/components/ui";
import { RequestCard } from "@/components/request-card";
import { TaskIcon } from "@/components/task-icon";
import { IconChevronRight, IconData, IconPlan } from "@/components/icons";
import { useT } from "@/components/providers";
import { useAppLink, useCurrentUser, useDb } from "@/lib/hooks";
import { selectActionable, trackEvent } from "@/lib/store";
import { TASK_ORDER, taskSlug } from "@/lib/tasks";
import { TASK_BLURB_KEYS, TASK_TITLE_KEYS } from "@/lib/i18n";

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

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-[26px] font-bold tracking-[-0.02em] text-ink">
          {t("home.greeting", { name: user.name })}
        </h1>
        <Card className="mt-3 flex items-center gap-4">
          <div className="flex-1">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
              <IconPlan size={15} />
              {t("home.planLabel")}
            </p>
            <p className="mt-0.5 text-[18px] font-bold text-ink">{user.plan_name}</p>
          </div>
          <span aria-hidden="true" className="h-10 w-px bg-blue-100" />
          <div className="flex-1">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
              <IconData size={15} />
              {t("home.dataLabel")}
            </p>
            <p className="mt-0.5 text-[18px] font-bold text-ink">
              {user.data_balance_gb.toFixed(1)} GB
            </p>
          </div>
        </Card>
      </section>

      {/* Hero — the single most important choice on the app. */}
      <section className="overflow-hidden rounded-card bg-navy-900 p-5 text-white shadow-lift">
        <h2 className="max-w-[18rem] text-[24px] font-bold leading-[1.15] tracking-[-0.02em]">
          {t("home.heroTitle")}
        </h2>
        {/* DESIGN.md §8 orders self-service first; yellow still carries the
            trusted-help action as the highlight. */}
        <div className="mt-5 grid gap-2.5">
          <Link
            href={link(`/task/${taskSlug("BILL")}?mode=self`)}
            className="inline-flex min-h-[50px] w-full items-center justify-center rounded-btn border-2 border-white/25 px-6 text-[16px] font-semibold text-white transition hover:bg-white/10"
          >
            {t("home.tryMyself")}
          </Link>
          <Link
            href={link("/help")}
            className="inline-flex min-h-[54px] w-full items-center justify-center rounded-btn bg-yellow-500 px-6 text-[17px] font-bold text-navy-900 shadow-soft transition hover:bg-yellow-300 active:scale-[0.985]"
          >
            {t("home.askTrusted")}
          </Link>
        </div>
      </section>

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
        <SectionTitle>{t("home.quickTasks")}</SectionTitle>
        <ul className="grid grid-cols-2 gap-2.5">
          {TASK_ORDER.map((type) => (
            <li key={type}>
              <Link
                href={link(`/task/${taskSlug(type)}`)}
                className="flex h-full flex-col gap-2 rounded-card bg-surface p-3.5 shadow-soft transition hover:shadow-lift"
              >
                <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-blue-100 text-blue-700">
                  <TaskIcon type={type} />
                </span>
                <span className="text-[16px] font-bold leading-snug text-ink">
                  {t(TASK_TITLE_KEYS[type])}
                </span>
                <span className="mt-auto flex items-center gap-1 text-[13px] text-ink-soft">
                  {t(TASK_BLURB_KEYS[type])}
                  <IconChevronRight size={14} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
