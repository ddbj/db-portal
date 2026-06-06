import { useCallback, useMemo } from "react"
import { useNavigate, useSearchParams } from "react-router"

import {
  FacetPanel,
  type NewsFacetState,
  NewsList,
  parseNewsFacetState,
  serializeNewsFacetState,
  useNewsList,
} from "~/features/news"
import { pageTitleMeta } from "~/lib/content"
import { useLang, useT } from "~/lib/i18n"
import { PageTitle, Section } from "~/ui"

const NewsRoute = () => {
  const t = useT()
  const lang = useLang()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  // Keep facet identity stable across renders so the filter/sort/count memos in
  // useNewsList only recompute when the query string actually changes.
  const qs = searchParams.toString()
  const facet = useMemo(() => parseNewsFacetState(qs), [qs])
  const result = useNewsList(lang, facet)

  const handleFacetChange = useCallback(
    (next: NewsFacetState) => {
      const qs = serializeNewsFacetState(next)
      void navigate(`/news${qs}`, { replace: true, preventScrollReset: true })
    },
    [navigate],
  )

  const handlePagingChange = useCallback(
    (next: NewsFacetState) => {
      const qs = serializeNewsFacetState(next)
      void navigate(`/news${qs}`, { replace: true })
    },
    [navigate],
  )

  return (
    <>
      <PageTitle title={t("news.pageTitle")} />
      <Section padTop="none" padBottom="lg">
        <div className="grid gap-8 sm:grid-cols-[var(--spacing-sidebar)_1fr] items-start">
          <FacetPanel
            facet={facet}
            options={result.options}
            counts={result.counts}
            onChange={handleFacetChange}
          />
          <NewsList
            lang={lang}
            facet={facet}
            onChange={handlePagingChange}
            loading={result.loading}
            error={result.error}
            total={result.total}
            visibleItems={result.visibleItems}
            totalPages={result.totalPages}
          />
        </div>
      </Section>
    </>
  )
}

export const handle = { i18n: { en: "complete" }, titleSegments: ["News"] } as const

export const meta = pageTitleMeta

export default NewsRoute
