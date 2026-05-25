import { NewsCategory } from "~/lib/api"
import { useT } from "~/lib/i18n"
import type { AppliedFilter } from "~/ui"
import { AppliedFilters, FacetGroup, FacetRow, SidebarHeading } from "~/ui"

import {
  clearFacet,
  emptyNewsFacetState,
  type NewsFacetState,
  toggleCategory,
  toggleService,
  toggleYear,
} from "./facet-url-state"
import type { NewsFacetOptions } from "./use-news-list"

type CategoryLabelKey =
  | "news.category.announcement"
  | "news.category.release"
  | "news.category.maintenance"
  | "news.category.event"
  | "news.category.news"

const categoryLabelKey = (category: NewsCategory): CategoryLabelKey =>
  `news.category.${category}` as CategoryLabelKey

type FacetPanelProps = {
  facet: NewsFacetState
  options: NewsFacetOptions
  onChange: (next: NewsFacetState) => void
}

export const FacetPanel = ({ facet, options, onChange }: FacetPanelProps) => {
  const t = useT()

  const applied: AppliedFilter[] = [
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
      <SidebarHeading>{t("news.facet.heading")}</SidebarHeading>
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
      {options.years.length > 0 && (
        <FacetGroup
          label={t("news.facet.year")}
          appliedCount={facet.year.length}
          {...(facet.year.length > 0
            ? { onClear: () => onChange(clearFacet(facet, "year")) }
            : {})}
        >
          {options.years.map((year) => (
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
