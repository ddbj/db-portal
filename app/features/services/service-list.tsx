import type { ServiceItem } from "~/lib/api"
import { useT } from "~/lib/i18n"
import type { Lang } from "~/lib/i18n/use-lang"
import { Pagination, Select } from "~/ui"

import {
  type ServicesFacetState,
  setPage,
  setSort,
} from "./facet-url-state"
import { ServiceRow } from "./service-row"

export type ServiceListProps = {
  lang: Lang
  facet: ServicesFacetState
  onChange: (next: ServicesFacetState) => void
  loading: boolean
  error: boolean
  total: number
  visibleItems: readonly ServiceItem[]
  totalPages: number
  pageSize?: number
}

export const ServiceList = ({
  lang,
  facet,
  onChange,
  loading,
  error,
  total,
  visibleItems,
  totalPages,
  pageSize = 30,
}: ServiceListProps) => {
  const t = useT()
  const rangeStart = total === 0 ? 0 : (facet.page - 1) * pageSize + 1
  const rangeEnd = Math.min(facet.page * pageSize, total)
  const showFooter = total > 0

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border-soft py-2.5 min-h-heading-row">
        <p className="text-fs-meta text-ink-soft m-0">
          {t("services.toolbar.count", { count: total })}
        </p>
        <label className="flex items-center gap-2 text-fs-meta text-ink-soft">
          <span>{t("services.toolbar.sort")}</span>
          <Select
            ariaLabel={t("services.toolbar.sort")}
            value={facet.sort}
            onChange={(next) => onChange(setSort(facet, next as ServicesFacetState["sort"]))}
            options={[
              { value: "asc", label: t("services.toolbar.sortAsc") },
              { value: "desc", label: t("services.toolbar.sortDesc") },
            ]}
          />
        </label>
      </header>
      {loading && (
        <p className="text-ink-soft text-fs-body py-4" role="status">
          {t("common.loading")}
        </p>
      )}
      {!loading && error && (
        <p className="text-red text-fs-body py-4" role="alert">
          {t("services.list.error")}
        </p>
      )}
      {!loading && !error && visibleItems.length === 0 && (
        <p className="text-ink-soft text-fs-body py-4">{t("services.list.empty")}</p>
      )}
      {visibleItems.length > 0 && (
        <ul className="list-none p-0 m-0">
          {visibleItems.map((item) => (
            <ServiceRow key={item.id} item={item} lang={lang} />
          ))}
        </ul>
      )}
      {showFooter && (
        <footer className="flex items-center justify-between gap-4 border-t border-border-soft py-4">
          <p className="text-fs-meta text-ink-soft m-0 font-mono">
            {`${rangeStart}–${rangeEnd} / ${total.toLocaleString()} ${t("common.countSuffix")}`}
          </p>
          {totalPages > 1 && (
            <Pagination
              page={facet.page}
              totalPages={totalPages}
              onPageChange={(page) => onChange(setPage(facet, page))}
              ariaLabel={t("a11y.paginationNav")}
              prevLabel={t("a11y.paginationPrev")}
              nextLabel={t("a11y.paginationNext")}
              jumpToLastLabel={(n) => t("a11y.paginationJumpToLast", { n })}
            />
          )}
        </footer>
      )}
    </div>
  )
}
