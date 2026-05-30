import { useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router"

import {
  FacetPanel,
  parseServicesFacetState,
  serializeServicesFacetState,
  ServiceList,
  type ServicesFacetState,
  useServicesList,
} from "~/features/services"
import { useLang, useT } from "~/lib/i18n"
import { PageTitle, Section } from "~/ui"

const ServicesRoute = () => {
  const t = useT()
  const lang = useLang()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const facet = parseServicesFacetState(searchParams.toString())
  const result = useServicesList(lang, facet)

  const handleFacetChange = useCallback(
    (next: ServicesFacetState) => {
      const qs = serializeServicesFacetState(next)
      void navigate(`/services${qs}`, { replace: true, preventScrollReset: true })
    },
    [navigate],
  )

  const handlePagingChange = useCallback(
    (next: ServicesFacetState) => {
      const qs = serializeServicesFacetState(next)
      void navigate(`/services${qs}`, { replace: true })
    },
    [navigate],
  )

  return (
    <>
      <PageTitle title={t("services.pageTitle")} />
      <Section padTop="sm" padBottom="lg">
        <div className="grid gap-8 sm:grid-cols-[var(--spacing-sidebar)_1fr] items-start">
          <FacetPanel
            facet={facet}
            options={result.options}
            counts={result.counts}
            onChange={handleFacetChange}
          />
          <ServiceList
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

export const handle = { i18n: { en: "complete" } } as const

export default ServicesRoute
