import { useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router"

import {
  FacetPanel,
  type NewsFacetState,
  NewsList,
  parseNewsFacetState,
  serializeNewsFacetState,
  useNewsList,
} from "~/features/news"
import { useLang, useT } from "~/lib/i18n"
import { PageTitle, Section } from "~/ui"

const NewsRoute = () => {
  const t = useT()
  const lang = useLang()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const facet = parseNewsFacetState(searchParams.toString())
  const result = useNewsList(lang, facet)

  const handleChange = useCallback(
    (next: NewsFacetState) => {
      const qs = serializeNewsFacetState(next)
      void navigate(`/news${qs}`, { replace: true })
    },
    [navigate],
  )

  return (
    <>
      <PageTitle title={t("news.pageTitle")} />
      <Section padTop="sm" padBottom="lg">
        <div className="grid gap-8 sm:grid-cols-[var(--spacing-sidebar)_1fr] items-start">
          <FacetPanel facet={facet} options={result.options} onChange={handleChange} />
          <NewsList
            lang={lang}
            facet={facet}
            onChange={handleChange}
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

export const handle = { i18n: { en: "complete" } } as const

export default NewsRoute
