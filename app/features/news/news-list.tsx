import type { NewsItem } from "~/lib/api"
import { useT } from "~/lib/i18n"
import type { Lang } from "~/lib/i18n/use-lang"
import { NativeSelect, Pagination } from "~/ui"

import {
  type FacetState,
  setPage,
  setSort,
} from "./facet-url-state"
import { NewsRow } from "./news-row"

export type NewsListProps = {
  lang: Lang
  facet: FacetState
  onChange: (next: FacetState) => void
  loading: boolean
  error: boolean
  total: number
  visibleItems: readonly NewsItem[]
  totalPages: number
}

export const NewsList = ({
  lang,
  facet,
  onChange,
  loading,
  error,
  total,
  visibleItems,
  totalPages,
}: NewsListProps) => {
  const t = useT()

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-4">
      <header className="flex items-center justify-between gap-4 border-b border-border-soft pb-2">
        <p className="text-fs-body text-ink-mid m-0">
          {t("news.toolbar.count", { count: total })}
        </p>
        <NativeSelect
          ariaLabel={t("news.toolbar.sort")}
          value={facet.sort}
          onChange={(event) =>
            onChange(setSort(facet, event.currentTarget.value as FacetState["sort"]))}
          options={[
            { value: "newest", label: t("news.toolbar.sortNewest") },
            { value: "oldest", label: t("news.toolbar.sortOldest") },
          ]}
        />
      </header>
      {loading && (
        <p className="text-ink-soft text-fs-body" role="status">
          {t("common.loading")}
        </p>
      )}
      {!loading && error && (
        <p className="text-fail text-fs-body" role="alert">
          {t("news.list.error")}
        </p>
      )}
      {!loading && !error && visibleItems.length === 0 && (
        <p className="text-ink-soft text-fs-body">{t("news.list.empty")}</p>
      )}
      {visibleItems.length > 0 && (
        <ul className="list-none p-0 m-0">
          {visibleItems.map((item) => (
            <NewsRow key={item.id} item={item} lang={lang} />
          ))}
        </ul>
      )}
      {totalPages > 1 && (
        <footer className="flex items-center justify-end pt-2">
          <Pagination
            page={facet.page}
            totalPages={totalPages}
            onPageChange={(page) => onChange(setPage(facet, page))}
          />
        </footer>
      )}
    </div>
  )
}
