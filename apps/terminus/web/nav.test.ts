import { describe, expect, it } from "vitest";
import {
  NAV_ITEMS,
  SECTIONS,
  sectionById,
  sectionIdForPath,
  tabIdForPath,
  VERBS,
} from "./nav.js";

describe("the information architecture", () => {
  it("is eight sections, one level deep", () => {
    // docs/09-terminus.md: "The left nav is fixed and shallow — eight
    // sections, one level deep."
    expect(SECTIONS).toHaveLength(8);
    expect(NAV_ITEMS.map((item) => item.id)).toEqual([
      "overview",
      "population",
      "datasets",
      "scenarios",
      "questions",
      "runs",
      "outcomes",
      "second-foundation",
    ]);
  });

  it("gives every section a href and every tab a distinct one", () => {
    const hrefs = SECTIONS.flatMap((section) => [
      section.href,
      ...(section.tabs ?? []).map((tab) => tab.href),
    ]);
    expect(new Set(hrefs).size).toBe(hrefs.length - countSharedFirstTabs());
  });

  it("starts each tab rail on the section's own href", () => {
    for (const section of SECTIONS) {
      if (!section.tabs) continue;
      expect(section.tabs[0]?.href, section.id).toBe(section.href);
    }
  });

  it("resolves a path to its section", () => {
    expect(sectionIdForPath("/")).toBe("overview");
    expect(sectionIdForPath("/population")).toBe("population");
    expect(sectionIdForPath("/population/explore")).toBe("population");
    expect(sectionIdForPath("/datasets/ge-results-2024")).toBe("datasets");
    expect(sectionIdForPath("/second-foundation/drift")).toBe(
      "second-foundation",
    );
  });

  it("keeps the household deep link inside Population", () => {
    // The dossier's canonical URL is /worlds/:worldId/households/:id, but it
    // is a Population screen and the nav has to say so.
    expect(
      sectionIdForPath("/worlds/uk/households/uk:E14001279:hh:00b3c1"),
    ).toBe("population");
  });

  it("resolves a path to its tab, falling back to the first", () => {
    expect(tabIdForPath("/population/epochs")).toBe("epochs");
    expect(tabIdForPath("/population")).toBe("map");
    // A detail route under a section shows that section's first tab.
    expect(tabIdForPath("/datasets/ge-results-2024")).toBe("catalogue");
    expect(tabIdForPath("/outcomes")).toBeUndefined();
  });

  it("points every palette verb at a real screen", () => {
    const hrefs = new Set(
      SECTIONS.flatMap((section) => [
        section.href,
        ...(section.tabs ?? []).map((tab) => tab.href),
      ]),
    );
    for (const verb of VERBS) {
      expect(hrefs.has(verb.href), verb.id).toBe(true);
    }
  });

  it("throws on a section that does not exist", () => {
    expect(() => sectionById("nowhere")).toThrow(/no such section/);
  });
});

/** Each section's first tab intentionally shares the section's own href. */
function countSharedFirstTabs(): number {
  return SECTIONS.filter((section) => section.tabs).length;
}
