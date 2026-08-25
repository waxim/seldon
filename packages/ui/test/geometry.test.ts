import { describe, expect, it } from "vitest";
import {
  bandPath,
  defaultRows,
  hemicycleLayout,
  ticks,
} from "../src/charts/geometry.js";

describe("hemicycle layout", () => {
  it("places exactly as many seats as the chamber has", () => {
    expect(hemicycleLayout(650).dots).toHaveLength(650);
    expect(hemicycleLayout(1).dots).toHaveLength(1);
    expect(hemicycleLayout(7).dots).toHaveLength(7);
  });

  it("uses about thirteen rows for a 650-seat chamber", () => {
    expect(defaultRows(650)).toBe(13);
    const rows = new Set(hemicycleLayout(650).dots.map((dot) => dot.row));
    expect(rows.size).toBe(13);
  });

  it("orders seats left to right across the whole chamber", () => {
    const { dots, width } = hemicycleLayout(650);
    const first = dots[0];
    const last = dots[dots.length - 1];
    if (!first || !last) throw new Error("expected a populated chamber");
    expect(first.x).toBeLessThan(width / 2);
    expect(last.x).toBeGreaterThan(width / 2);

    const angles = dots.map((dot) => dot.angle);
    expect(angles).toEqual([...angles].sort((a, b) => b - a));
  });

  it("keeps every seat inside the viewBox", () => {
    const layout = hemicycleLayout(650);
    for (const dot of layout.dots) {
      expect(dot.x).toBeGreaterThanOrEqual(0);
      expect(dot.x).toBeLessThanOrEqual(layout.width);
      expect(dot.y).toBeGreaterThanOrEqual(0);
      expect(dot.y).toBeLessThanOrEqual(layout.height);
    }
  });

  it("sizes dots so neighbours cannot overlap", () => {
    const { dots, dotRadius } = hemicycleLayout(650);
    const byRow = new Map<number, typeof dots>();
    for (const dot of dots) {
      byRow.set(dot.row, [...(byRow.get(dot.row) ?? []), dot]);
    }
    for (const row of byRow.values()) {
      for (let index = 1; index < row.length; index += 1) {
        const a = row[index - 1];
        const b = row[index];
        if (!a || !b) continue;
        const gap = Math.hypot(a.x - b.x, a.y - b.y);
        expect(gap).toBeGreaterThan(dotRadius * 2);
      }
    }
  });
});

describe("fan geometry", () => {
  it("closes the band path", () => {
    const path = bandPath(
      [
        { x: 0, low: 1, high: 3 },
        { x: 1, low: 2, high: 4 },
      ],
      (value) => value * 10,
      (value) => value * 2,
    );
    expect(path.startsWith("M0.00,6.00")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
  });

  it("is empty for no points", () => {
    expect(
      bandPath(
        [],
        (v) => v,
        (v) => v,
      ),
    ).toBe("");
  });

  it("spans the domain inclusively", () => {
    expect(ticks(0, 100, 5)).toEqual([0, 25, 50, 75, 100]);
  });
});
