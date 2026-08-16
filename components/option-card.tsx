"use client";

import {
  IconBolt,
  IconCheck,
  IconClock,
  IconData,
  IconHeart,
  IconPhoneCall,
  IconTag,
} from "./icons";
import { formatMoney } from "@/lib/tasks";
import type { OptionHighlight, TaskOption } from "@/lib/types";

const HIGHLIGHT_ICON = {
  data: IconData,
  social: IconHeart,
  time: IconClock,
  calls: IconPhoneCall,
  save: IconTag,
} as const;

/**
 * The three deciding facts, side by side. This is the last thing the owner
 * reads before approving, so it carries numbers rather than prose.
 */
export function HighlightRow({
  highlights,
}: {
  highlights: OptionHighlight[];
}) {
  if (highlights.length === 0) return null;
  return (
    <ul className="mt-4 grid grid-cols-3 gap-2 border-t border-blue-500/20 pt-3.5">
      {highlights.map((h) => {
        const Icon = HIGHLIGHT_ICON[h.icon] ?? IconBolt;
        return (
          <li key={h.caption} className="text-center">
            <span className="mx-auto mb-1.5 grid h-8 w-8 place-items-center rounded-full bg-blue-700/10 text-blue-700">
              <Icon size={17} />
            </span>
            <p className="text-[14px] font-bold leading-tight text-ink">{h.title}</p>
            <p className="text-[11.5px] leading-tight text-ink-soft">{h.caption}</p>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Scannable anchor on the left of an option — "3 DAY", "70GB", "+RM42.50".
 * Deliberately the loudest thing on the card so a glance is enough to tell the
 * options apart before any reading happens.
 */
export function OptionBadge({
  label,
  tone = "brand",
}: {
  label: string;
  tone?: "brand" | "muted";
}) {
  const [head, ...rest] = label.split(" ");
  return (
    <span
      aria-hidden="true"
      className={`grid h-[58px] w-[58px] shrink-0 place-content-center rounded-tile text-center leading-none ${
        tone === "brand" ? "bg-blue-700 text-white" : "bg-blue-100 text-blue-700"
      }`}
    >
      <span className="text-[20px] font-bold tracking-[-0.02em]">{head}</span>
      {rest.length > 0 ? (
        <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wide opacity-80">
          {rest.join(" ")}
        </span>
      ) : null}
    </span>
  );
}

export function FeatureList({
  features,
  tone = "ink",
}: {
  features: string[];
  tone?: "ink" | "invert";
}) {
  if (features.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1">
      {features.map((f) => (
        <li
          key={f}
          className={`flex items-start gap-1.5 text-[13px] ${
            tone === "invert" ? "text-white/75" : "text-ink-soft"
          }`}
        >
          <IconCheck
            size={14}
            strokeWidth={3}
            className={`mt-0.5 shrink-0 ${
              tone === "invert" ? "text-yellow-500" : "text-green-500"
            }`}
          />
          {f}
        </li>
      ))}
    </ul>
  );
}

/**
 * Read-only presentation of a single option, used on approval and self-serve.
 * Takes only the display fields so it works for both a stored TaskOption and a
 * freshly generated seed that has no id yet.
 */
export function OptionSummary({
  option,
  highlight = false,
}: {
  option: Pick<
    TaskOption,
    "title" | "subtitle" | "price" | "badge" | "features" | "highlights"
  >;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-card p-4 ${
        highlight ? "border-2 border-blue-500 bg-blue-100/55" : "bg-surface shadow-soft"
      }`}
    >
      <div className="flex items-start gap-3.5">
        {option.badge ? <OptionBadge label={option.badge} /> : null}
        <div className="min-w-0 flex-1">
          <p className="text-[19px] font-bold leading-snug text-ink">{option.title}</p>
          <p className="text-[14px] text-ink-soft">{option.subtitle}</p>
        </div>
        {option.price > 0 ? (
          <p className="shrink-0 text-[22px] font-bold leading-tight text-blue-700">
            {formatMoney(option.price)}
          </p>
        ) : null}
      </div>
      {/* Highlights replace the checklist when present — the approval screen
          wants three facts, not a paragraph of ticks. */}
      {option.highlights?.length ? (
        <HighlightRow highlights={option.highlights} />
      ) : (
        <FeatureList features={option.features} />
      )}
    </div>
  );
}
