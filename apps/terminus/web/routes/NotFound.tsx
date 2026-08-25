import { EmptyState, PageHeader } from "@seldon/ui";
import { SECTIONS } from "../nav.js";

export function NotFound() {
  return (
    <>
      <PageHeader
        title="Nothing at this address"
        lede="Every entity in Seldon has a canonical URL — but this is not one of them."
      />
      <EmptyState
        title="No such page"
        variant="page"
        fills={SECTIONS.map((section) => section.label)}
      >
        <p>
          Press <kbd className="rounded border border-hairline px-1.5">⌘K</kbd>{" "}
          to jump anywhere in the console, or pick a section from the nav.
        </p>
      </EmptyState>
    </>
  );
}
