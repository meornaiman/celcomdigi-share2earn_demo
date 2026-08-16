"use client";

import Link from "next/link";
import { Avatar, StatusBadge } from "./ui";
import { IconChevronRight } from "./icons";
import { useT, useLang } from "./providers";
import { useAppLink, useDb, timeAgo } from "@/lib/hooks";
import { selectUser } from "@/lib/store";
import { TASKS } from "@/lib/tasks";
import type { HelpRequest } from "@/lib/types";

/**
 * One row in every list of requests. It always shows the other person, because
 * "who is this with" is the first thing either side needs to know.
 */
export function RequestCard({
  request,
  meId,
}: {
  request: HelpRequest;
  meId: string;
}) {
  const db = useDb();
  const t = useT();
  const { lang } = useLang();
  const link = useAppLink();

  const iAmOwner = request.owner_user_id === meId;
  const other = selectUser(db, iAmOwner ? request.helper_user_id : request.owner_user_id);
  const def = TASKS[request.task_type];

  // Highlights the rows the signed-in user can act on right now.
  const needsMe = iAmOwner
    ? ["RECOMMENDATION_SENT", "OWNER_REVIEWING"].includes(request.status)
    : ["SENT", "HELPER_VIEWED", "HELPER_ACCEPTED"].includes(request.status);

  return (
    <Link
      href={link(`/request?id=${request.id}`)}
      className={`flex items-center gap-3 rounded-card bg-surface p-3.5 shadow-soft transition hover:shadow-lift ${
        needsMe ? "ring-2 ring-blue-500/45" : ""
      }`}
    >
      <Avatar name={other?.name ?? "?"} accent={other?.accent} size={44} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[16px] font-bold text-ink">
            {iAmOwner ? other?.name : `${other?.name} asked`}
          </p>
          <span className="shrink-0 text-[13px] text-ink-soft">
            · {timeAgo(request.created_at, lang)}
          </span>
        </div>
        <p className="truncate text-[14px] text-ink-soft">
          {def.label} · {request.context_json.headline}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <StatusBadge status={request.status} label={t(`status.${request.status}`)} />
          <span className="text-[12px] font-mono text-ink-soft">{request.id}</span>
        </div>
      </div>

      <IconChevronRight size={20} className="shrink-0 text-ink-soft" />
    </Link>
  );
}
