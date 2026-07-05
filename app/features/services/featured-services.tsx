import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import {
  fetchServices,
  serviceDescription,
  type ServiceItem,
  type ServiceList,
  serviceName,
  SERVICES_QUERY_KEY,
  serviceUrl,
} from "~/lib/api"
import { type Lang, useLang, useT } from "~/lib/i18n"
import { SectionHeading, TextLink } from "~/ui"

type FeaturedServicesProps = {
  lang?: Lang
}

const FeaturedRow = ({ item, lang }: { item: ServiceItem; lang: Lang }) => {
  const t = useT()
  const name = serviceName(item, lang)
  const description = serviceDescription(item, lang)
  const url = serviceUrl(item, lang)

  return (
    <li className="flex items-baseline gap-3 py-2 border-b border-border-soft last:border-b-0">
      <span className="shrink-0">
        {url !== undefined
          ? (
            <TextLink href={url} external externalSrLabel={t("a11y.externalLink")} weight="bold">
              <span className="text-ink text-fs-body leading-snug">{name}</span>
            </TextLink>
          )
          : <span className="text-ink text-fs-body font-semibold leading-snug">{name}</span>}
      </span>
      {description !== undefined && description !== "" && (
        <span className="flex-1 min-w-0 truncate text-ink-soft text-fs-meta">
          {description}
        </span>
      )}
    </li>
  )
}

export const FeaturedServices = ({ lang: explicitLang }: FeaturedServicesProps = {}) => {
  const hookLang = useLang()
  const lang = explicitLang ?? hookLang
  const t = useT()
  const query = useQuery({
    queryKey: SERVICES_QUERY_KEY,
    queryFn: () => fetchServices(),
    staleTime: 5 * 60_000,
  })
  const items = useMemo<ServiceList>(() => {
    const all = query.data ?? []

    return [...all]
      .filter((service) => service.featuredTop)
      .sort((a, b) =>
        serviceName(a, lang).localeCompare(serviceName(b, lang), "en", { sensitivity: "base" }))
  }, [query.data, lang])

  return (
    <section>
      <SectionHeading
        as="h2"
        action={<TextLink to="/services" arrow>{t("top.services.viewAll")}</TextLink>}
      >
        {t("top.services.heading")}
      </SectionHeading>
      {items.length > 0 && (
        <ul className="list-none p-0 m-0">
          {items.map((item) => (
            <FeaturedRow key={item.id} item={item} lang={lang} />
          ))}
        </ul>
      )}
    </section>
  )
}
