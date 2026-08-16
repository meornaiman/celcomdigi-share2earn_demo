"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";
import {
  IconArrowLeft,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconClose,
  IconLock,
  IconShield,
} from "./icons";
import { useT } from "./providers";
import type { RequestStatus, RiskLevel } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

type Variant = "primary" | "brand" | "outline" | "ghost" | "danger" | "success";

const VARIANTS: Record<Variant, string> = {
  // Yellow is the highlight colour and carries the single most important
  // action on a screen — "Ask someone I trust".
  primary:
    "bg-yellow-500 text-navy-900 shadow-soft hover:bg-yellow-300 active:bg-yellow-300",
  brand: "bg-blue-700 text-white shadow-soft hover:bg-blue-500 active:bg-blue-500",
  outline:
    "bg-surface text-blue-700 border-2 border-blue-100 hover:border-blue-500 hover:bg-blue-100/60",
  ghost: "bg-transparent text-ink-soft hover:bg-blue-100/70 hover:text-ink",
  danger: "bg-surface text-red-500 border-2 border-red-500/25 hover:bg-red-500/8",
  // Green is reserved for success states only (DESIGN.md §6).
  success: "bg-green-500 text-white shadow-soft hover:brightness-105",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "lg";
  block?: boolean;
  href?: string;
  icon?: ReactNode;
  /** Pins a trailing chevron to the right edge: this button moves you onward. */
  advance?: boolean;
}

export function Button({
  variant = "brand",
  size = "lg",
  block = true,
  href,
  icon,
  advance = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const sizing =
    size === "lg" ? "min-h-[54px] px-6 text-[17px]" : "min-h-[44px] px-4 text-[15px]";
  const classes = [
    "relative inline-flex items-center justify-center gap-2 rounded-btn font-semibold",
    "transition-[background-color,border-color,transform,filter] duration-150 active:scale-[0.985]",
    "disabled:pointer-events-none disabled:opacity-45",
    sizing,
    VARIANTS[variant],
    block ? "w-full" : "",
    className,
  ].join(" ");

  const body = (
    <>
      {icon}
      {children}
      {advance ? (
        <IconChevronRight
          size={18}
          strokeWidth={2.4}
          className="absolute right-4 opacity-70"
        />
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} role="button">
        {body}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} {...rest}>
      {body}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  return (
    <Tag className={`rounded-card bg-surface p-4 shadow-soft ${className}`}>
      {children}
    </Tag>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-[19px] font-bold tracking-[-0.01em] text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function PageTitle({
  children,
  sub,
}: {
  children: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <header className="mb-5">
      <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink">
        {children}
      </h1>
      {sub ? <p className="mt-1.5 text-[15px] text-ink-soft">{sub}</p> : null}
    </header>
  );
}

/**
 * Back control and title on one line, subtitle beneath. Every screen below Home
 * opens this way, so the way out is always in the same place under the thumb.
 */
export function ScreenHeader({
  title,
  sub,
  onBack,
  backLabel,
  trailing,
}: {
  title: ReactNode;
  sub?: ReactNode;
  onBack: () => void;
  backLabel: string;
  trailing?: ReactNode;
}) {
  return (
    <header className="mb-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="-ml-2.5 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink transition hover:bg-blue-100"
        >
          <IconArrowLeft size={21} />
        </button>
        <h1 className="min-w-0 flex-1 text-[20px] font-bold leading-tight tracking-[-0.015em] text-ink">
          {title}
        </h1>
        {trailing}
      </div>
      {sub ? (
        <p className="mt-0.5 pl-[34px] text-[15px] leading-snug text-ink-soft">
          {sub}
        </p>
      ) : null}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

export function Avatar({
  name,
  accent = "#0057D9",
  size = 44,
}: {
  name: string;
  accent?: string;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(140deg, ${accent}, ${accent}bb)`,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {initials}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

type Tone = "neutral" | "info" | "success" | "warn" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-blue-100 text-ink-soft",
  info: "bg-blue-100 text-blue-700",
  success: "bg-green-500/12 text-[#1B8B3C]",
  warn: "bg-yellow-500/22 text-[#7A5A00]",
  danger: "bg-red-500/12 text-red-500",
};

export function Pill({
  children,
  tone = "neutral",
  icon,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold ${TONES[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

const STATUS_TONE: Record<RequestStatus, Tone> = {
  DRAFT: "neutral",
  SENT: "info",
  HELPER_VIEWED: "info",
  HELPER_ACCEPTED: "info",
  RECOMMENDATION_SENT: "warn",
  OWNER_REVIEWING: "warn",
  OWNER_APPROVED: "success",
  EXECUTING: "info",
  COMPLETED: "success",
  DECLINED_BY_HELPER: "danger",
  DECLINED_BY_OWNER: "danger",
  EXPIRED: "neutral",
  CANCELLED: "neutral",
  FAILED: "danger",
};

/**
 * Status is always spelled out in words as well as colour, so it stays readable
 * without relying on hue (DESIGN.md §20).
 */
export function StatusBadge({
  status,
  label,
}: {
  status: RequestStatus;
  label: string;
}) {
  const tone = STATUS_TONE[status];
  const icon =
    status === "COMPLETED" || status === "OWNER_APPROVED" ? (
      <IconCheck size={14} strokeWidth={2.6} />
    ) : tone === "warn" ? (
      <IconClock size={14} strokeWidth={2.4} />
    ) : null;
  return (
    <Pill tone={tone} icon={icon}>
      {label}
    </Pill>
  );
}

const RISK_TONE: Record<RiskLevel, Tone> = {
  GREEN: "success",
  AMBER: "warn",
  RED: "danger",
};

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const t = useT();
  return (
    <Pill tone={RISK_TONE[risk]} icon={<IconShield size={14} />}>
      {t(`risk.${risk}`)}
    </Pill>
  );
}

/** The recurring "here is the safety boundary" line. */
export function SecurityNote({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "lock";
}) {
  return (
    <p className="flex items-start gap-2.5 rounded-tile bg-blue-100 px-3.5 py-3 text-[14px] font-medium leading-snug text-navy-900">
      <span className="mt-px shrink-0 text-blue-700">
        {tone === "lock" ? <IconLock size={18} /> : <IconShield size={18} />}
      </span>
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Form controls                                                       */
/* ------------------------------------------------------------------ */

const FIELD_BASE =
  "w-full rounded-btn border-2 border-blue-100 bg-surface px-4 py-3 text-[16px] text-ink " +
  "placeholder:text-ink-soft/70 transition focus:border-blue-500 focus:outline-none";

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-[15px] font-semibold text-ink"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="text-[13px] text-ink-soft">{hint}</p> : null}
    </div>
  );
}

export function TextInput({
  className = "",
  ...rest
}: ComponentPropsWithRef<"input">) {
  return <input className={`${FIELD_BASE} min-h-[52px] ${className}`} {...rest} />;
}

export function TextArea({
  className = "",
  ...rest
}: ComponentPropsWithRef<"textarea">) {
  return <textarea className={`${FIELD_BASE} min-h-[92px] ${className}`} {...rest} />;
}

export function Select({
  className = "",
  ...rest
}: ComponentPropsWithRef<"select">) {
  return (
    <select
      className={`${FIELD_BASE} min-h-[52px] appearance-none ${className}`}
      {...rest}
    />
  );
}

/** Large radio-style choice card used for options and helper picking. */
export function ChoiceCard({
  selected,
  onSelect,
  title,
  subtitle,
  meta,
  leading,
  name,
}: {
  selected: boolean;
  onSelect: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  leading?: ReactNode;
  name: string;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-center gap-3 rounded-card border-2 p-3.5 transition ${
        selected
          ? "border-blue-500 bg-blue-100/70 shadow-soft"
          : "border-blue-100 bg-surface hover:border-blue-500/50"
      }`}
    >
      <input
        id={id}
        type="radio"
        name={name}
        checked={selected}
        onChange={onSelect}
        className="sr-only"
      />
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-bold leading-snug text-ink">
          {title}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block text-[14px] text-ink-soft">{subtitle}</span>
        ) : null}
        {meta}
      </span>
      <span
        aria-hidden="true"
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${
          selected ? "border-blue-700 bg-blue-700 text-white" : "border-blue-100"
        }`}
      >
        {selected ? <IconCheck size={14} strokeWidth={3} /> : null}
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Feedback                                                            */
/* ------------------------------------------------------------------ */

export function ProgressBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className="h-2.5 w-full overflow-hidden rounded-full bg-blue-100"
    >
      <div
        className="h-full rounded-full bg-blue-700 transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border-2 border-dashed border-blue-100 px-5 py-9 text-center">
      {icon ? (
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-blue-100 text-blue-700">
          {icon}
        </span>
      ) : null}
      <p className="text-[16px] font-semibold text-ink">{title}</p>
      {body ? <p className="mx-auto mt-1 max-w-xs text-[14px] text-ink-soft">{body}</p> : null}
      {action ? <div className="mx-auto mt-4 max-w-xs">{action}</div> : null}
    </div>
  );
}

/** Bottom sheet used for confirmations, so the primary action stays thumb-reachable. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-navy-900/45 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-rise relative w-full max-w-md rounded-t-[26px] bg-surface p-5 shadow-lift sm:rounded-[26px]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-[20px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-blue-100"
          >
            <IconClose size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Divider() {
  return <hr className="border-t border-blue-100" />;
}

/** Compact figure + caption used on the admin dashboard and rewards screen. */
export function Stat({
  label,
  value,
  hint,
  tone = "ink",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "ink" | "brand" | "success";
}) {
  const colour =
    tone === "brand" ? "text-blue-700" : tone === "success" ? "text-green-500" : "text-ink";
  return (
    <div className="rounded-tile bg-surface p-3.5 shadow-soft">
      <p className="text-[13px] font-medium text-ink-soft">{label}</p>
      <p className={`mt-1 text-[24px] font-bold leading-none tracking-[-0.02em] ${colour}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-[12px] text-ink-soft">{hint}</p> : null}
    </div>
  );
}
