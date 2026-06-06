import type { ServiceSource } from "~/lib/api"
import { serviceCategoryLabelKey, useT } from "~/lib/i18n"
import type { AppliedFilter } from "~/ui"
import { AppliedFilters, FacetGroup, FacetRow, SidebarHeading } from "~/ui"

import {
  clearFacet,
  emptyServicesFacetState,
  type ServicesFacetState,
  toggleCategory,
  toggleSource,
} from "./facet-url-state"
import type { ServicesFacetCounts, ServicesFacetOptions } from "./use-services-list"

type FacetPanelProps = {
  facet: ServicesFacetState
  options: ServicesFacetOptions
  counts: ServicesFacetCounts
  onChange: (next: ServicesFacetState) => void
}

const sourceDisplayLabel = (source: ServiceSource): string =>
  source === "ddbj" ? "DDBJ" : "DBCLS"

const sourceSwatch = (source: ServiceSource): string =>
  source === "ddbj" ? "var(--color-src-ddbj)" : "var(--color-src-dbcls)"

export const FacetPanel = ({ facet, options, counts, onChange }: FacetPanelProps) => {
  const t = useT()

  const applied: AppliedFilter[] = [
    ...facet.category.map((category) => ({
      label: t("services.facet.category"),
      value: t(serviceCategoryLabelKey(category)),
      onClear: () => onChange(toggleCategory(facet, category)),
    })),
    ...facet.source.map((source) => ({
      label: t("services.facet.source"),
      value: sourceDisplayLabel(source),
      onClear: () => onChange(toggleSource(facet, source)),
    })),
  ]
  const isEmpty = applied.length === 0

  return (
    <section
      aria-label={t("services.facet.heading")}
      className="flex flex-col gap-4 w-sidebar shrink-0"
    >
      <SidebarHeading withDivider>{t("services.facet.heading")}</SidebarHeading>
      {!isEmpty && (
        <AppliedFilters
          applied={applied}
          onClearAll={() =>
            onChange({ ...emptyServicesFacetState(), sort: facet.sort })}
          appliedLabel={t("common.facet.applied")}
          clearAllLabel={t("common.facet.clearAll")}
          removeFilterLabel={t("common.facet.removeFilter")}
        />
      )}
      {options.categories.length > 0 && (
        <FacetGroup
          label={t("services.facet.category")}
          appliedCount={facet.category.length}
          clearLabel={t("common.facet.clear")}
          {...(facet.category.length > 0
            ? { onClear: () => onChange(clearFacet(facet, "category")) }
            : {})}
        >
          {options.categories.map((category) => (
            <FacetRow
              key={category}
              label={t(serviceCategoryLabelKey(category))}
              count={counts.category[category] ?? 0}
              checked={facet.category.includes(category)}
              onChange={() => onChange(toggleCategory(facet, category))}
            />
          ))}
        </FacetGroup>
      )}
      {options.sources.length > 0 && (
        <FacetGroup
          label={t("services.facet.source")}
          appliedCount={facet.source.length}
          clearLabel={t("common.facet.clear")}
          {...(facet.source.length > 0
            ? { onClear: () => onChange(clearFacet(facet, "source")) }
            : {})}
        >
          {options.sources.map((source) => (
            <FacetRow
              key={source}
              label={sourceDisplayLabel(source)}
              swatch={sourceSwatch(source)}
              count={counts.source[source] ?? 0}
              checked={facet.source.includes(source)}
              onChange={() => onChange(toggleSource(facet, source))}
            />
          ))}
        </FacetGroup>
      )}
    </section>
  )
}
