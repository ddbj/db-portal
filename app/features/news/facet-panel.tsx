import { useMemo, useState } from "react"

import { NewsCategory, NewsSource } from "~/lib/api"
import { categoryLabelKey, useT } from "~/lib/i18n"
import type { AppliedFilter } from "~/ui"
import { AppliedFilters, FacetGroup, FacetRow, SidebarHeading } from "~/ui"

import {
  clearFacet,
  emptyNewsFacetState,
  type NewsFacetState,
  toggleCategory,
  toggleService,
  toggleSource,
  toggleYear,
} from "./facet-url-state"
import type { NewsFacetOptions } from "./use-news-list"

type FacetPanelProps = {
  facet: NewsFacetState
  options: NewsFacetOptions
  onChange: (next: NewsFacetState) => void
}

const sourceDisplayLabel = (source: NewsSource): string =>
  source === "ddbj" ? "DDBJ" : "DBCLS"

const YEAR_INITIAL_COUNT = 5

export const FacetPanel = ({ facet, options, onChange }: FacetPanelProps) => {
  const t = useT()
  const [yearsExpanded, setYearsExpanded] = useState(false)
  const visibleYears = useMemo(() => {
    if (yearsExpanded) return options.years
    const recent = options.years.slice(0, YEAR_INITIAL_COUNT)
    const recentSet = new Set(recent)
    const extras = options.years.filter((y) => facet.year.includes(y) && !recentSet.has(y))
    return [...recent, ...extras]
  }, [yearsExpanded, options.years, facet.year])
  const yearToggleVisible = yearsExpanded || visibleYears.length < options.years.length

  const applied: AppliedFilter[] = [
    ...facet.source.map((source) => ({
      label: t("news.facet.source"),
      value: sourceDisplayLabel(source),
      onClear: () => onChange(toggleSource(facet, source)),
    })),
    ...facet.category.map((category) => ({
      label: t("news.facet.category"),
      value: t(categoryLabelKey(category)),
      onClear: () => onChange(toggleCategory(facet, category)),
    })),
    ...facet.year.map((year) => ({
      label: t("news.facet.year"),
      value: `${year}`,
      onClear: () => onChange(toggleYear(facet, year)),
    })),
    ...facet.service.map((service) => ({
      label: t("news.facet.service"),
      value: service,
      onClear: () => onChange(toggleService(facet, service)),
    })),
  ]
  const isEmpty = applied.length === 0

  return (
    <section
      aria-label={t("news.facet.heading")}
      className="flex flex-col gap-4 w-sidebar shrink-0"
    >
      <SidebarHeading withDivider>{t("news.facet.heading")}</SidebarHeading>
      {!isEmpty && (
        <AppliedFilters
          applied={applied}
          onClearAll={() =>
            onChange({ ...emptyNewsFacetState(), sort: facet.sort })}
        />
      )}
      <FacetGroup
        label={t("news.facet.category")}
        appliedCount={facet.category.length}
        {...(facet.category.length > 0
          ? { onClear: () => onChange(clearFacet(facet, "category")) }
          : {})}
      >
        {NewsCategory.options.map((category) => (
          <FacetRow
            key={category}
            label={t(categoryLabelKey(category))}
            checked={facet.category.includes(category)}
            onChange={() => onChange(toggleCategory(facet, category))}
          />
        ))}
      </FacetGroup>
      <FacetGroup
        label={t("news.facet.source")}
        appliedCount={facet.source.length}
        {...(facet.source.length > 0
          ? { onClear: () => onChange(clearFacet(facet, "source")) }
          : {})}
      >
        {NewsSource.options.map((source) => (
          <FacetRow
            key={source}
            label={sourceDisplayLabel(source)}
            checked={facet.source.includes(source)}
            onChange={() => onChange(toggleSource(facet, source))}
          />
        ))}
      </FacetGroup>
      {options.years.length > 0 && (
        <FacetGroup
          label={t("news.facet.year")}
          appliedCount={facet.year.length}
          showMore={yearToggleVisible}
          showMoreLabel={yearsExpanded
            ? t("news.facet.yearCollapse")
            : t("news.facet.yearShowMore")}
          onShowMore={() => setYearsExpanded((prev) => !prev)}
          {...(facet.year.length > 0
            ? { onClear: () => onChange(clearFacet(facet, "year")) }
            : {})}
        >
          {visibleYears.map((year) => (
            <FacetRow
              key={year}
              label={`${year}`}
              checked={facet.year.includes(year)}
              onChange={() => onChange(toggleYear(facet, year))}
              mono
            />
          ))}
        </FacetGroup>
      )}
      {options.services.length > 0 && (
        <FacetGroup
          label={t("news.facet.service")}
          appliedCount={facet.service.length}
          {...(facet.service.length > 0
            ? { onClear: () => onChange(clearFacet(facet, "service")) }
            : {})}
        >
          {options.services.map((service) => (
            <FacetRow
              key={service}
              label={service}
              checked={facet.service.includes(service)}
              onChange={() => onChange(toggleService(facet, service))}
              mono
            />
          ))}
        </FacetGroup>
      )}
    </section>
  )
}
