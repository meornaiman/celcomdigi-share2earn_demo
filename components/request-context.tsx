"use client";

import { Card } from "./ui";
import { IconLock } from "./icons";
import { useT } from "./providers";
import { formatMoney } from "@/lib/tasks";
import type { HelpRequest } from "@/lib/types";

/**
 * The only window a helper gets onto the owner's account. It renders strictly
 * from context_json, which is the payload the owner approved at request time —
 * there is no path from here to anything else on the account.
 */
export function RequestContextPanel({
  request,
  ownerName,
}: {
  request: HelpRequest;
  ownerName: string;
}) {
  const t = useT();
  const ctx = request.context_json;

  return (
    <div className="space-y-2.5">
      <Card className="space-y-3">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft">
          {t("request.sharedBy", { name: ownerName })}
        </p>

        <p className="text-[19px] font-bold leading-snug text-ink">{ctx.headline}</p>

        {ctx.destination ? (
          <Row label="Destination" value={ctx.destination} />
        ) : null}
        {ctx.start_date && ctx.end_date ? (
          <Row
            label="Travel dates"
            value={`${new Date(ctx.start_date).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })} – ${new Date(ctx.end_date).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}`}
          />
        ) : null}
        {ctx.current_plan ? (
          <Row
            label="Current plan"
            value={`${ctx.current_plan}${
              ctx.current_plan_price ? ` · ${formatMoney(ctx.current_plan_price)}/mo` : ""
            }`}
          />
        ) : null}
        {ctx.device ? <Row label="Device" value={ctx.device} /> : null}

        {ctx.bill_lines?.length ? (
          <div className="rounded-tile bg-blue-100 p-3.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-medium text-ink-soft">
                {ctx.bill_month}
              </span>
              <span className="text-[13px] text-ink-soft">
                was {formatMoney(ctx.bill_previous ?? 0)}
              </span>
            </div>
            <p className="text-[26px] font-bold tracking-[-0.02em] text-ink">
              {formatMoney(ctx.bill_current ?? 0)}
            </p>
            <ul className="mt-2.5 space-y-1.5">
              {ctx.bill_lines.map((l) => {
                const delta = l.current - l.previous;
                return (
                  <li
                    key={l.label}
                    className="flex items-center justify-between text-[14px]"
                  >
                    <span className="text-ink">{l.label}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-ink">
                        {formatMoney(l.current)}
                      </span>
                      {delta !== 0 ? (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[12px] font-bold ${
                            delta > 0
                              ? "bg-red-500/14 text-red-500"
                              : "bg-green-500/14 text-[#1B8B3C]"
                          }`}
                        >
                          {delta > 0 ? "+" : "−"}
                          {formatMoney(Math.abs(delta))}
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {ctx.note ? (
          <p className="rounded-tile border-2 border-blue-100 px-3.5 py-3 text-[15px] italic text-ink">
            “{ctx.note}”
          </p>
        ) : null}
      </Card>

      <Card>
        <p className="mb-2 flex items-center gap-2 text-[15px] font-bold text-ink">
          <IconLock size={18} className="text-blue-700" />
          {t("request.permissionsTitle")}
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {request.permissions.map((p) => (
            <li
              key={p}
              className="rounded-full bg-blue-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-blue-700"
            >
              {p}
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-[13px] leading-snug text-ink-soft">
          {t("helpers.hiddenTitle")}: {t("helpers.hiddenItems")}.
        </p>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[14px] text-ink-soft">{label}</span>
      <span className="text-right text-[15px] font-semibold text-ink">{value}</span>
    </div>
  );
}
