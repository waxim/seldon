/**
 * Chart maths, kept out of the components so it can be tested without a
 * DOM. The visuals are signature enough to own, so every chart in
 * `@seldon/ui` is hand-rolled SVG over these primitives
 * (docs/09-terminus.md).
 */

export interface SeatDot {
  readonly x: number;
  readonly y: number;
  /** 0 is the innermost arc. */
  readonly row: number;
  /** Radians, π at the left of the chamber, 0 at the right. */
  readonly angle: number;
}

export interface HemicycleLayout {
  readonly dots: readonly SeatDot[];
  readonly dotRadius: number;
  readonly width: number;
  readonly height: number;
}

export interface HemicycleOptions {
  readonly rows?: number;
  readonly outerRadius?: number;
  /** As a fraction of the outer radius. */
  readonly innerRatio?: number;
  readonly padding?: number;
}

/** Rows that keep the arcs readable: ~13 for a 650-seat chamber. */
export function defaultRows(seats: number): number {
  return Math.max(1, Math.round(Math.sqrt(seats / 4)));
}

/** Largest-remainder apportionment, so the row counts sum to `total`. */
function apportion(weights: readonly number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const exact = weights.map((weight) => (weight / sum) * total);
  const counts = exact.map((value) => Math.floor(value));
  let remaining = total - counts.reduce((a, b) => a + b, 0);

  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (const entry of order) {
    if (remaining <= 0) break;
    counts[entry.index] = (counts[entry.index] ?? 0) + 1;
    remaining -= 1;
  }
  return counts;
}

/**
 * Seat positions for a hemicycle, ordered left to right across the whole
 * chamber so a caller can paint parties in seating order.
 */
export function hemicycleLayout(
  seats: number,
  options: HemicycleOptions = {},
): HemicycleLayout {
  const outer = options.outerRadius ?? 100;
  const rows = Math.max(1, Math.min(options.rows ?? defaultRows(seats), seats));
  const inner = outer * (options.innerRatio ?? 0.45);
  const padding = options.padding ?? 6;

  const radii = Array.from({ length: rows }, (_, row) =>
    rows === 1
      ? (inner + outer) / 2
      : inner + ((outer - inner) * row) / (rows - 1),
  );
  const counts = apportion(radii, seats);

  const width = 2 * outer + 2 * padding;
  const height = outer + 2 * padding;
  const cx = width / 2;
  const cy = height - padding;

  const dots: SeatDot[] = [];
  radii.forEach((radius, row) => {
    const count = counts[row] ?? 0;
    for (let index = 0; index < count; index += 1) {
      const angle = Math.PI * (1 - (index + 0.5) / count);
      dots.push({
        x: cx + radius * Math.cos(angle),
        y: cy - radius * Math.sin(angle),
        row,
        angle,
      });
    }
  });

  dots.sort((a, b) => b.angle - a.angle || a.row - b.row);

  const rowGap = rows > 1 ? (outer - inner) / (rows - 1) : outer - inner;
  const tightestArc = Math.min(
    ...radii.map(
      (radius, row) => (Math.PI * radius) / Math.max(1, counts[row] ?? 1),
    ),
  );
  const dotRadius = 0.42 * Math.min(rowGap, tightestArc);

  return { dots, dotRadius, width, height };
}

export interface FanPoint {
  readonly x: number;
  readonly low: number;
  readonly high: number;
}

/** A closed band path: along the highs, back along the lows. */
export function bandPath(
  points: readonly FanPoint[],
  scaleX: (value: number) => number,
  scaleY: (value: number) => number,
): string {
  if (points.length === 0) return "";
  const forward = points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${scaleX(point.x).toFixed(2)},${scaleY(point.high).toFixed(2)}`;
    })
    .join(" ");
  const back = [...points]
    .reverse()
    .map(
      (point) =>
        `L${scaleX(point.x).toFixed(2)},${scaleY(point.low).toFixed(2)}`,
    )
    .join(" ");
  return `${forward} ${back} Z`;
}

/** Evenly spaced ticks across a domain, inclusive of both ends. */
export function ticks(min: number, max: number, count: number): number[] {
  if (count < 2) return [min, max];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, index) => min + step * index);
}
