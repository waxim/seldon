/** @vitest-environment happy-dom */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SECTIONS } from "./nav.js";
import { createAppRouter } from "./router.js";

afterEach(cleanup);

async function renderAt(path: string) {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [path] }),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  await router.load();
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

/** Every URL the nav offers, plus one deep link per entity kind. */
const PATHS = [
  ...SECTIONS.flatMap((section) => [
    section.href,
    ...(section.tabs ?? []).map((tab) => tab.href),
  ]),
  "/worlds/uk/households/uk:E14001279:hh:00b3c1",
  "/datasets/ge-results-2024",
  "/scenarios/reform-surge",
  "/questions/general-election-today",
  "/runs/run_01",
  "/outcomes/oc_01",
];

describe("every route renders", () => {
  it.each([...new Set(PATHS)])("%s", async (path) => {
    await renderAt(path);
    // The shell is present…
    expect(screen.getByRole("navigation", { name: "Sections" })).toBeTruthy();
    // …and the screen itself has a heading rather than a blank well.
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  it("marks the section that owns the URL as the current nav item", async () => {
    await renderAt("/datasets/ge-results-2024");
    const nav = screen.getByRole("navigation", { name: "Sections" });
    const current = nav.querySelector('[aria-current="page"]');
    expect(current?.textContent).toContain("Datasets");
  });

  it("keeps a household deep link inside Population", async () => {
    await renderAt("/worlds/uk/households/uk:E14001279:hh:00b3c1");
    const nav = screen.getByRole("navigation", { name: "Sections" });
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toContain(
      "Population",
    );
  });

  it("says something honest for an address that does not exist", async () => {
    await renderAt("/nowhere");
    expect(screen.getByText("No such page")).toBeTruthy();
  });
});

describe("the console shell", () => {
  it("offers a skip link before anything else", async () => {
    await renderAt("/");
    expect(screen.getByRole("link", { name: "Skip to content" })).toBeTruthy();
  });

  it("renders without a working gateway", async () => {
    await renderAt("/");
    expect(
      screen.getByRole("heading", { name: "The First Crisis" }),
    ).toBeTruthy();
  });
});
