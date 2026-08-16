"use client";

import { useState } from "react";
import { EmptyState, PageTitle } from "@/components/ui";
import { RequestCard } from "@/components/request-card";
import { IconActivity } from "@/components/icons";
import { useT } from "@/components/providers";
import { useCurrentUser, useDb } from "@/lib/hooks";
import { selectRequestsAsHelper, selectRequestsAsOwner } from "@/lib/store";

type Tab = "OWNER" | "HELPER";

export default function ActivityPage() {
  const t = useT();
  const db = useDb();
  const user = useCurrentUser();
  const [tab, setTab] = useState<Tab>("OWNER");

  if (!user) return null;

  const owned = selectRequestsAsOwner(db, user.id);
  const helped = selectRequestsAsHelper(db, user.id);
  const list = tab === "OWNER" ? owned : helped;

  return (
    <div className="space-y-4">
      <PageTitle>{t("activity.title")}</PageTitle>

      <div
        role="tablist"
        aria-label={t("activity.title")}
        className="flex gap-1 rounded-full bg-blue-100 p-1"
      >
        {(
          [
            ["OWNER", t("activity.asOwner"), owned.length],
            ["HELPER", t("activity.asHelper"), helped.length],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-full px-4 text-[15px] font-semibold transition ${
              tab === key
                ? "bg-surface text-blue-700 shadow-soft"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {label}
            {count > 0 ? (
              <span className="ml-1.5 text-[13px] opacity-70">{count}</span>
            ) : null}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<IconActivity size={22} />} title={t("activity.empty")} />
      ) : (
        <ul className="space-y-2.5">
          {list.map((r) => (
            <li key={r.id}>
              <RequestCard request={r} meId={user.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
