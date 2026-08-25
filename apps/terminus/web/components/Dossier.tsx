import { type FieldLayer, fieldRegistryFor } from "@seldon/dsl";
import {
  Chip,
  DefinitionList,
  EmptyState,
  Note,
  ProbabilityBar,
} from "@seldon/ui";
import type { ReactNode } from "react";

/**
 * The dossier's structure, ahead of there being a household to put in it.
 *
 * The attribute names are not invented: they are the world's typed field
 * registry (`@seldon/dsl`), grouped by the layer semantics of
 * docs/04-population.md. Every value is pending, because no epoch has
 * been synthesised — the shape is real, the numbers are honestly absent.
 */
const LAYER_LABEL: Record<FieldLayer, string> = {
  census: "base",
  modelled: "modelled",
  contextual: "contextual",
  spine: "spine",
  derived: "derived",
  reference: "reference",
};

const LAYER_BLURB: Record<string, string> = {
  base: "Census-derived — matched to published aggregate statistics.",
  modelled: "Modelled — inferred, with its own uncertainty.",
  contextual: "Contextual — joined from the area, not the household.",
  spine: "Spine — the geography this household hangs from.",
  derived: "Derived — computed from other sources, versioned with them.",
  reference: "Reference — a committed list, not fetched data.",
};

export function Dossier({ worldId = "uk" }: { readonly worldId?: string }) {
  const registry = fieldRegistryFor(worldId);
  const fields = [...registry.fields.values()];

  const household = fields.filter((field) => field.axis === "household");
  const person = fields.filter((field) => field.axis === "person");
  const area = fields.filter((field) => field.axis === "area");

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="outline">synthetic household</Chip>
          <Chip tone="outline">no epoch</Chip>
        </div>
        <p className="mt-3 mb-0 text-sm text-ink-muted">
          Clicking a household at street zoom opens this panel: an address-ish
          header, its attributes with their provenance, the people in it, their
          modelled leanings, and what touched them in the run being viewed.
        </p>
      </div>

      <Section title="Household attributes" count={household.length}>
        <AttributeList fields={household} />
      </Section>

      <Section title="Area context" count={area.length}>
        <AttributeList fields={area} />
      </Section>

      <Section title="Persons" count={person.length}>
        <p className="mt-0 mb-3 text-sm text-ink-muted">
          One card per adult, carrying these attributes:
        </p>
        <AttributeList fields={person} />
      </Section>

      <Section title="Leanings">
        <ProbabilityBar
          label="Modelled vote intent"
          emptyNote="A probability bar, never a single party label — joined from the standing run's cell probabilities, with the cell signature shown so the aggregation is honest."
        />
      </Section>

      <LayerLegend
        layers={[
          ...new Set(
            [...household, ...area, ...person].map(
              (field) => LAYER_LABEL[field.layer],
            ),
          ),
        ]}
      />

      <Section title="Question history">
        <EmptyState title="Nothing has been asked" phase="P3">
          <p>
            What this household's cell answered, run by run. There are no runs.
          </p>
        </EmptyState>
      </Section>

      <Section title="What touched this household">
        <EmptyState title="No effect chain" phase="P3">
          <p>
            Which scenario rules and Mule events matched this household in the
            run being viewed — the effect chain made legible.
          </p>
        </EmptyState>
      </Section>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  readonly title: string;
  readonly count?: number;
  readonly children: ReactNode;
}) {
  return (
    <section>
      <h3 className="m-0 mb-2 flex items-baseline gap-2 text-sm font-semibold text-ink">
        {title}
        {typeof count === "number" ? (
          <span className="font-mono text-xs font-normal text-ink-faint">
            {count}
          </span>
        ) : null}
      </h3>
      {children}
    </section>
  );
}

function AttributeList({
  fields,
}: {
  readonly fields: readonly { name: string; layer: FieldLayer }[];
}) {
  return (
    <DefinitionList
      columns={2}
      items={fields.map((field) => ({
        term: field.name,
        value: (
          <span className="flex items-center gap-2">
            <span>—</span>
            <Chip tone="outline">{LAYER_LABEL[field.layer]}</Chip>
          </span>
        ),
        pending: true,
      }))}
    />
  );
}

/** The layer legend, said once at the foot rather than under every group. */
function LayerLegend({ layers }: { readonly layers: readonly string[] }) {
  return (
    <Note>
      <p className="m-0">
        Each value wears its layer badge and expands to its provenance chain —
        source id → data version → transform — one click from any number to the
        dataset that fed it.
      </p>
      <ul className="mt-2 mb-0 space-y-1 pl-4 text-xs">
        {layers.map((layer) => (
          <li key={layer}>
            <span className="text-ink">{layer}</span> — {LAYER_BLURB[layer]}
          </li>
        ))}
      </ul>
    </Note>
  );
}
