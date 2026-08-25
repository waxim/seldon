import { useMemo } from "react";
import { cn } from "../lib/cn.js";

/** Deterministic, so the motif never reshuffles between renders. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface StarfieldProps {
  /** Same seed, same sky. */
  readonly seed?: number;
  readonly stars?: number;
  /** Where the radial hairlines converge, in viewBox fractions. */
  readonly origin?: { x: number; y: number };
  readonly className?: string;
}

/**
 * The Prime Radiant motif: fine radial hairlines and a sparse starfield
 * (docs/09-terminus.md). It appears on the Overview and on empty states
 * only, at 2–4% opacity — texture, never noise, and never behind dense
 * data. Decorative, so it is hidden from assistive technology.
 */
export function Starfield({
  seed = 8_675_309,
  stars = 70,
  origin = { x: 0.5, y: 1 },
  className,
}: StarfieldProps) {
  const { rays, arcs, dots } = useMemo(() => {
    const random = mulberry32(seed);
    const ox = origin.x * 100;
    const oy = origin.y * 100;

    const rayList = Array.from({ length: 32 }, (_, index) => {
      const angle = (Math.PI * (index + 0.5)) / 32;
      return {
        key: index,
        x2: ox - Math.cos(angle) * 180,
        y2: oy - Math.sin(angle) * 180,
      };
    });

    const arcList = [14, 26, 40, 56, 74, 94].map((radius) => ({
      key: radius,
      radius,
    }));

    const dotList = Array.from({ length: stars }, (_, index) => ({
      key: index,
      cx: random() * 100,
      cy: random() * 100,
      r: 0.12 + random() * 0.38,
    }));

    return { rays: rayList, arcs: arcList, dots: dotList };
  }, [seed, stars, origin.x, origin.y]);

  const ox = origin.x * 100;
  const oy = origin.y * 100;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full opacity-(--motif-opacity)",
        className,
      )}
    >
      <title>Prime Radiant motif</title>
      <g stroke="var(--radiant)" strokeWidth={0.18} fill="none">
        {rays.map((ray) => (
          <line key={ray.key} x1={ox} y1={oy} x2={ray.x2} y2={ray.y2} />
        ))}
        {arcs.map((arc) => (
          <circle key={arc.key} cx={ox} cy={oy} r={arc.radius} />
        ))}
      </g>
      <g fill="var(--ink)">
        {dots.map((dot) => (
          <circle key={dot.key} cx={dot.cx} cy={dot.cy} r={dot.r} />
        ))}
      </g>
    </svg>
  );
}
