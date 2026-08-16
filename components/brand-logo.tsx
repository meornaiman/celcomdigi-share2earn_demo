"use client";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Intrinsic sizes, used to reserve space and avoid layout shift. */
const WORDMARK_RATIO = 382 / 132;

/**
 * The AIdealist brand mark.
 *
 * Two cuts of the same artwork. The lockup is nearly 3:1, so squeezing it into
 * a square slot would shrink the lettering to nothing — square slots get the
 * "AI" glyph on its own, which the artwork already reads as.
 *
 * Both cuts are blue and yellow on transparency, so on the navy app bar the
 * blue would sink into the background. `plate` sets the mark on a white card,
 * which keeps the brand colours accurate instead of recolouring them.
 */
export function BrandLogo({
  variant = "wordmark",
  height = 22,
  plate = false,
  className = "",
}: {
  variant?: "wordmark" | "mark";
  height?: number;
  plate?: boolean;
  className?: string;
}) {
  const isMark = variant === "mark";
  const width = isMark ? height : Math.round(height * WORDMARK_RATIO);

  const img = (
    <img
      src={`${BASE}/${isMark ? "logo-mark.png" : "logo-aidealist.png"}`}
      alt="AIdealist"
      width={width}
      height={height}
      style={{ height, width }}
      className="block"
    />
  );

  if (!plate) return <span className={className}>{img}</span>;

  return (
    <span
      className={`inline-grid place-items-center bg-white shadow-soft ${
        isMark ? "rounded-[11px] p-1.5" : "rounded-[10px] px-2.5 py-1.5"
      } ${className}`}
    >
      {img}
    </span>
  );
}
