import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { bandPath, type FanPoint, ticks } from "./geometry.js";

export interface FanBand {
  /** "90%", "50%" — shown in the legend and the accessible label. */
  readonly label: string;
  readonly points: readonly FanPoint[];
  readonly opacity?: number;
}

export interface FanChartProps {
  readonly bands?: readonly FanBand[];
  readonly median?: readonly { x: number; y: number }[];
  readonly domainX?: readonly [number, number];
  readonly domainY?: readonly [number, number];
  readonly xLabel?: string;
  readonly yLabel?: string;
  /** Shown over the plot when there is nothing to draw. */
  readonly empty?: ReactNode;
  readonly className?: string;
}

const WIDTH = 320;
const HEIGHT = 150;
const PAD = { top: 8, right: 8, bottom: 20, left: 30 };

/**
 * The converging headline: a fan that narrows as iterations accumulate,
 * uncertainty visibly collapsing (docs/09-terminus.md). A point estimate
 * without its interval is a design-review failure, so this chart draws
 * the interval first and the median second.
 */
export function FanChart({
  bands,
  median,
  domainX = [0, 1],
  domainY = [0, 1],
  xLabel,
  yLabel,
  empty,
  className,
}: FanChartProps) {
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;

  const scaleX = (value: number) =>
    PAD.left +
    ((value - domainX[0]) / (domainX[1] - domainX[0] || 1)) * plotWidth;
  const scaleY = (value: number) =>
    PAD.top +
    plotHeight -
    ((value - domainY[0]) / (domainY[1] - domainY[0] || 1)) * plotHeight;

  const hasData = (bands?.length ?? 0) > 0 || (median?.length ?? 0) > 0;

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block w-full"
        role="img"
        aria-label={
          hasData
            ? `Fan chart of ${yLabel ?? "the estimate"} against ${xLabel ?? "iterations"}`
            : "An empty fan chart, waiting for a run"
        }
      >
        <g stroke="var(--hairline)" strokeWidth="0.6">
          {ticks(domainY[0], domainY[1], 5).map((value) => (
            <line
              key={value}
              x1={PAD.left}
              y1={scaleY(value)}
              x2={WIDTH - PAD.right}
              y2={scaleY(value)}
            />
          ))}
        </g>

        <g
          fill="var(--ink-faint)"
          fontSize="7"
          textAnchor="end"
          fontFamily="var(--font-mono)"
        >
          {ticks(domainY[0], domainY[1], 5).map((value) => (
            <text key={value} x={PAD.left - 5} y={scaleY(value) + 2.5}>
              {Math.round(value)}
            </text>
          ))}
        </g>

        {bands?.map((band) => (
          <path
            key={band.label}
            d={bandPath(band.points, scaleX, scaleY)}
            fill="var(--radiant)"
            opacity={band.opacity ?? 0.18}
          />
        ))}

        {median && median.length > 0 ? (
          <path
            d={median
              .map(
                (point, index) =>
                  `${index === 0 ? "M" : "L"}${scaleX(point.x).toFixed(2)},${scaleY(point.y).toFixed(2)}`,
              )
              .join(" ")}
            fill="none"
            stroke="var(--radiant)"
            strokeWidth="1.4"
          />
        ) : null}

        <line
          x1={PAD.left}
          y1={HEIGHT - PAD.bottom}
          x2={WIDTH - PAD.right}
          y2={HEIGHT - PAD.bottom}
          stroke="var(--hairline-strong)"
          strokeWidth="0.8"
        />

        {xLabel ? (
          <text
            x={WIDTH - PAD.right}
            y={HEIGHT - 6}
            textAnchor="end"
            fontSize="7"
            fill="var(--ink-faint)"
          >
            {xLabel}
          </text>
        ) : null}
      </svg>

      {!hasData && empty ? (
        <div className="absolute inset-0 grid place-items-center px-4 text-center">
          {empty}
        </div>
      ) : null}
    </div>
  );
}
