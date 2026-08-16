"use client";

import Link from "next/link";
import { Card, EmptyState, PageTitle, SectionTitle } from "@/components/ui";
import { RequestCard } from "@/components/request-card";
import { TaskIcon } from "@/components/task-icon";
import { IconChevronRight, IconHelp, IconUsers } from "@/components/icons";
import { useT } from "@/components/providers";
import { useAppLink, useCurrentUser, useDb } from "@/lib/hooks";
import { selectRequestsAsHelper, selectRequestsAsOwner } from "@/lib/store";
import { TASK_ORDER, taskSlug } from "@/lib/tasks";
import { TERMINAL_STATUSES } from "@/lib/types";
import { TASK_BLURB_KEYS, TASK_TITLE_KEYS } from "@/lib/i18n";

export default function HelpPage() {
  const t = useT();
  const db = useDb();
  const user = useCurrentUser();
  const link = useAppLink();

  if (!user) return null;

  const inbox = selectRequestsAsHelper(db, user.id).filter(
    (r) => !TERMINAL_STATUSES.includes(r.status)
  );
  const outbox = selectRequestsAsOwner(db, user.id).filter(
    (r) => !TERMINAL_STATUSES.includes(r.status)
  );

  return (
    <div className="space-y-6">
      <PageTitle sub={t("help.startSubtitle")}>{t("help.title")}</PageTitle>

      <section>
        <SectionTitle>{t("help.startTitle")}</SectionTitle>
        <ul className="space-y-2">
          {TASK_ORDER.map((type) => (
            <li key={type}>
              <Link
                href={link(`/task/${taskSlug(type)}`)}
                className="flex items-center gap-3 rounded-card bg-surface p-3.5 shadow-soft transition hover:shadow-lift"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-blue-100 text-blue-700">
                  <TaskIcon type={type} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-bold text-ink">
                    {t(TASK_TITLE_KEYS[type])}
                  </span>
                  <span className="block truncate text-[14px] text-ink-soft">
                    {t(TASK_BLURB_KEYS[type])}
                  </span>
                </span>
                <IconChevronRight size={20} className="shrink-0 text-ink-soft" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle>{t("help.inboxTitle")}</SectionTitle>
        {inbox.length === 0 ? (
          <EmptyState icon={<IconUsers size={22} />} title={t("help.inboxEmpty")} />
        ) : (
          <ul className="space-y-2.5">
            {inbox.map((r) => (
              <li key={r.id}>
                <RequestCard request={r} meId={user.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle>{t("help.outboxTitle")}</SectionTitle>
        {outbox.length === 0 ? (
          <EmptyState icon={<IconHelp size={22} />} title={t("help.outboxEmpty")} />
        ) : (
          <ul className="space-y-2.5">
            {outbox.map((r) => (
              <li key={r.id}>
                <RequestCard request={r} meId={user.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Card tone="tint">
        <p className="text-[15px] leading-snug">
          <strong className="font-bold">The helper recommends. You approve.</strong>{" "}
          Nothing changes on an account until its owner says yes.
        </p>
      </Card>
    </div>
  );
}
