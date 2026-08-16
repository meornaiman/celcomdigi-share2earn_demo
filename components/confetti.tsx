"use client";

/**
 * The one authored moment in the app: the burst that lands when a Share2Earn
 * task completes. Piece positions are a fixed table rather than random values,
 * so the static export and the hydrated page agree and the burst reads the same
 * every time. The global reduced-motion rule freezes it into a still.
 */

interface Piece {
  /** Percent from the left of the card. */
  x: number;
  /** Degrees of initial rotation. */
  rotate: number;
  delay: number;
  duration: number;
  colour: string;
  /** Rectangles read as paper; circles as sparkle. */
  round?: boolean;
  size: number;
}

const YELLOW = "#FFD400";
const LIGHT = "#EAF3FF";
const BLUE = "#1976F3";
const GREEN = "#32C85A";

const PIECES: Piece[] = [
  { x: 6, rotate: 18, delay: 0.02, duration: 1.5, colour: YELLOW, size: 9 },
  { x: 14, rotate: -32, delay: 0.16, duration: 1.75, colour: LIGHT, size: 7, round: true },
  { x: 22, rotate: 44, delay: 0.0, duration: 1.4, colour: BLUE, size: 8 },
  { x: 30, rotate: -12, delay: 0.24, duration: 1.85, colour: YELLOW, size: 6, round: true },
  { x: 38, rotate: 60, delay: 0.09, duration: 1.55, colour: GREEN, size: 9 },
  { x: 46, rotate: -48, delay: 0.3, duration: 1.7, colour: LIGHT, size: 8 },
  { x: 54, rotate: 24, delay: 0.05, duration: 1.45, colour: YELLOW, size: 10 },
  { x: 62, rotate: -20, delay: 0.2, duration: 1.8, colour: BLUE, size: 7, round: true },
  { x: 70, rotate: 52, delay: 0.12, duration: 1.5, colour: YELLOW, size: 8 },
  { x: 78, rotate: -40, delay: 0.27, duration: 1.65, colour: GREEN, size: 6, round: true },
  { x: 86, rotate: 30, delay: 0.07, duration: 1.9, colour: LIGHT, size: 9 },
  { x: 94, rotate: -56, delay: 0.18, duration: 1.6, colour: YELLOW, size: 7 },
];

export function Confetti() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 1.6,
            background: p.colour,
            borderRadius: p.round ? "999px" : "1.5px",
            animation: `s2e-fall ${p.duration}s cubic-bezier(0.28, 0.6, 0.3, 1) ${p.delay}s both`,
            // The custom property feeds the keyframes so each piece tumbles
            // to a different angle instead of moving as one sheet.
            ["--spin" as string]: `${p.rotate * 8}deg`,
            ["--tilt" as string]: `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
}
