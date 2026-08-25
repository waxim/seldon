import { type ReactNode, useId, useMemo } from "react";
import { cn } from "../lib/cn.js";
import { hemicycleLayout } from "./geometry.js";

export interface SeatCall {
  readonly partyCode: string;
  readonly partyName: string;
  readonly colour: string;
  /** Below the 80% call threshold renders hatched, not solid. */
  readonly confident: boolean;
}

export interface HemicycleProps {
  readonly seats: number;
  /** Left-to-right seating order. Omit for the chamber before any answer. */
  readonly calls?: readonly SeatCall[];
  /** Seats needed for a majority; drawn as a hairline through the centre. */
  readonly majority?: number;
  readonly className?: string;
  /** Rendered in the well of the chamber — a headline, or why there is none. */
  readonly centre?: ReactNode;
}

/**
 * The signature visual: 650 seats, party-coloured from `@seldon/parties`,
 * with seats under an 80% call probability hatched rather than solid — an
 * uncertainty fringe rather than a firm claim (docs/09-terminus.md).
 *
 * With no calls it draws the chamber unanswered: every seat an outline.
 * That is the honest picture before a run exists, and it is also the
 * shape the answer will take.
 */
export function Hemicycle({
  seats,
  calls,
  majority,
  className,
  centre,
}: HemicycleProps) {
  const hatchId = useId();
  const layout = useMemo(() => hemicycleLayout(seats), [seats]);

  return (
    <div className={cn("relative w-full", className)}>
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="block w-full"
        role="img"
        aria-label={
          calls
            ? `Hemicycle of ${seats} seats, coloured by party`
            : `An unanswered chamber of ${seats} seats`
        }
      >
        <defs>
          <pattern
            id={hatchId}
            width="4"
            height="4"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="4"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          </pattern>
        </defs>

        {majority ? (
          <line
            x1={layout.width / 2}
            y1={layout.height - layout.height * 0.92}
            x2={layout.width / 2}
            y2={layout.height - 4}
            stroke="var(--hairline-strong)"
            strokeWidth="0.8"
            strokeDasharray="3 3"
          />
        ) : null}

        {layout.dots.map((dot, index) => {
          const call = calls?.[index];
          const key = `${dot.row}:${dot.angle.toFixed(5)}`;
          if (!call) {
            return (
              <circle
                key={key}
                cx={dot.x}
                cy={dot.y}
                r={layout.dotRadius}
                fill="none"
                stroke="var(--hairline-strong)"
                strokeWidth="0.7"
              />
            );
          }
          return (
            <circle
              key={key}
              cx={dot.x}
              cy={dot.y}
              r={layout.dotRadius}
              fill={call.confident ? call.colour : `url(#${hatchId})`}
              color={call.colour}
              stroke={call.colour}
              strokeWidth={call.confident ? 0 : 0.7}
            >
              <title>
                {call.partyName}
                {call.confident ? "" : " — below the 80% call threshold"}
              </title>
            </circle>
          );
        })}
      </svg>

      {centre ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-[6%] mx-auto max-w-[46%] text-center">
          {centre}
        </div>
      ) : null}
    </div>
  );
}
