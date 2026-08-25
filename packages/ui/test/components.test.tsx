/** @vitest-environment happy-dom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartFrame } from "../src/charts/ChartFrame.js";
import { Hemicycle } from "../src/charts/Hemicycle.js";
import { ProbabilityBar } from "../src/charts/ProbabilityBar.js";
import { CommandPalette } from "../src/components/CommandPalette.js";
import { DataTable } from "../src/components/DataTable.js";
import { DslFilterBar, diagnose } from "../src/components/DslFilterBar.js";
import { EmptyState } from "../src/components/EmptyState.js";
import { PHASES } from "../src/components/PhaseChip.js";

afterEach(cleanup);

describe("EmptyState", () => {
  it("names the phase that fills the screen", () => {
    render(
      <EmptyState
        title="Nothing yet"
        phase="P2"
        fills={["The map", "Dossiers"]}
      >
        <p>No population has been synthesised.</p>
      </EmptyState>,
    );
    expect(screen.getByText("Nothing yet")).toBeTruthy();
    expect(screen.getByText(PHASES.P2)).toBeTruthy();
    expect(screen.getByText("Dossiers")).toBeTruthy();
  });
});

describe("DataTable", () => {
  it("renders its columns even with no rows, and says why", () => {
    render(
      <DataTable
        caption="Sources"
        columns={[
          { key: "id", header: "Source", render: () => null },
          { key: "tier", header: "Tier", render: () => null, numeric: true },
        ]}
        rows={[]}
        rowKey={() => ""}
        empty="No source has been ingested yet."
      />,
    );
    expect(screen.getByText("Source")).toBeTruthy();
    expect(screen.getByText("Tier")).toBeTruthy();
    expect(screen.getByText("No source has been ingested yet.")).toBeTruthy();
  });
});

describe("Hemicycle", () => {
  it("draws an unanswered chamber when there are no calls", () => {
    const { container } = render(<Hemicycle seats={650} />);
    expect(container.querySelectorAll("circle")).toHaveLength(650);
    expect(
      screen.getByLabelText("An unanswered chamber of 650 seats"),
    ).toBeTruthy();
  });

  it("hatches seats below the call threshold rather than filling them", () => {
    const calls = Array.from({ length: 3 }, (_, index) => ({
      partyCode: "lab",
      partyName: "Labour",
      colour: "#E4003B",
      confident: index === 0,
    }));
    const { container } = render(<Hemicycle seats={3} calls={calls} />);
    const fills = [...container.querySelectorAll("circle")].map((node) =>
      node.getAttribute("fill"),
    );
    expect(fills[0]).toBe("#E4003B");
    expect(fills[1]).toMatch(/^url\(#/);
  });
});

describe("ProbabilityBar", () => {
  it("shows an empty track rather than a zeroed bar", () => {
    render(<ProbabilityBar label="Leanings" emptyNote="No standing run." />);
    expect(screen.getByLabelText("Leanings: no distribution yet")).toBeTruthy();
    expect(screen.getByText("No standing run.")).toBeTruthy();
  });

  it("labels every segment with a name as well as a colour", () => {
    render(
      <ProbabilityBar
        label="Leanings"
        segments={[
          { label: "Labour", share: 0.6, colour: "#E4003B" },
          { label: "Reform UK", share: 0.4, colour: "#12B6CF" },
        ]}
      />,
    );
    expect(screen.getByText("Labour")).toBeTruthy();
    expect(screen.getByText("60.0%")).toBeTruthy();
  });
});

describe("ChartFrame", () => {
  it("offers every chart as a table", () => {
    render(
      <ChartFrame title="Seats" chart={<p>chart</p>} table={<p>table</p>} />,
    );
    expect(screen.getByText("chart")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "View as table" }));
    expect(screen.getByText("table")).toBeTruthy();
  });
});

describe("DslFilterBar", () => {
  it("flags an unknown field with a suggestion", () => {
    expect(diagnose("uk", "incom > 50000")).toEqual([
      expect.objectContaining({ suggestion: "income" }),
    ]);
    expect(diagnose("uk", "income > 50000")).toEqual([]);
  });

  it("says out loud that nobody can count yet", () => {
    render(<DslFilterBar worldId="uk" value="" onChange={() => {}} />);
    expect(screen.getByText("— no population to count —")).toBeTruthy();
  });

  it("offers typed completions from the field registry", () => {
    render(<DslFilterBar worldId="uk" value="ten" onChange={() => {}} />);
    const input = screen.getByLabelText("Predicate filter");
    fireEvent.select(input, { target: { selectionStart: 3 } });
    expect(screen.getByRole("option", { name: /tenure/ })).toBeTruthy();
  });
});

describe("CommandPalette", () => {
  const commands = [
    {
      id: "population",
      label: "Population",
      group: "Go to",
      href: "/population",
    },
    { id: "datasets", label: "Datasets", group: "Go to", href: "/datasets" },
  ];

  function open(onNavigate = vi.fn(), onExplore = vi.fn()) {
    render(
      <CommandPalette
        open
        onOpenChange={() => {}}
        commands={commands}
        worldId="uk"
        onNavigate={onNavigate}
        onExplore={onExplore}
      />,
    );
    return { onNavigate, onExplore };
  }

  it("navigates to the highlighted command on Enter", () => {
    const { onNavigate } = open();
    const input = screen.getByLabelText("Search or jump to");
    fireEvent.change(input, { target: { value: "data" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onNavigate).toHaveBeenCalledWith("/datasets");
  });

  it("offers a typed predicate to explore instead of fuzzy-matching it", () => {
    const { onExplore } = open();
    const input = screen.getByLabelText("Search or jump to");
    fireEvent.change(input, { target: { value: "age > 65" } });
    expect(screen.getByText(/Explore this filter/)).toBeTruthy();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onExplore).toHaveBeenCalledWith("age > 65");
  });

  it("flags an unknown field in a typed predicate", () => {
    open();
    fireEvent.change(screen.getByLabelText("Search or jump to"), {
      target: { value: "incom > 50000" },
    });
    expect(screen.getByText(/did you mean income/)).toBeTruthy();
  });
});
