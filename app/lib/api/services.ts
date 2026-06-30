import { type ServiceItem, ServiceList } from "~/schemas/api-bff/service"

import type { Lang } from "../i18n/use-lang"
import { fetchBffJson } from "./client"

export {
  ServiceCategory,
  ServiceItem,
  ServiceList,
  ServiceSource,
} from "~/schemas/api-bff/service"

export const SERVICES_QUERY_KEY = ["services"] as const

export const serviceName = (item: ServiceItem, lang: Lang): string =>
  item.name[lang] || item.name.ja || item.name.en

const SENTENCE_TERMINATED = /[。．.！？!?…]$/
const TRAILING_PUNCTUATION: Record<Lang, string> = { ja: "。", en: "." }

const withTrailingPunctuation = (text: string, lang: Lang): string =>
  SENTENCE_TERMINATED.test(text) ? text : text + TRAILING_PUNCTUATION[lang]

export const serviceDescription = (item: ServiceItem, lang: Lang): string | undefined => {
  const picked = item.description[lang]
  if (picked) return withTrailingPunctuation(picked, lang)
  if (item.description.ja) return withTrailingPunctuation(item.description.ja, "ja")
  if (item.description.en) return withTrailingPunctuation(item.description.en, "en")

  return undefined
}

export const serviceUrl = (item: ServiceItem, lang: Lang): string | undefined => {
  if (!item.url) return undefined

  return item.url[lang] ?? item.url.ja ?? item.url.en
}

type FetchServicesQuery = {
  source?: readonly string[]
  category?: readonly string[]
  featured?: boolean
}

const buildServicesPath = (query: FetchServicesQuery | undefined): string => {
  const base = "/api/services"
  if (!query) return base
  const params = new URLSearchParams()
  if (query.source && query.source.length > 0) {
    params.set("source", [...query.source].sort().join(","))
  }
  if (query.category && query.category.length > 0) {
    params.set("category", [...query.category].sort().join(","))
  }
  if (query.featured) params.set("featured", "true")
  const qs = params.toString()

  return qs ? `${base}?${qs}` : base
}

type FetchServicesOptions = {
  baseUrl?: string
  signal?: AbortSignal
  headers?: HeadersInit
  query?: FetchServicesQuery
}

export const fetchServices = ({ query, ...rest }: FetchServicesOptions = {}): Promise<ServiceList> =>
  fetchBffJson(buildServicesPath(query), rest, ServiceList)
