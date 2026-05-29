import { type ServiceItem, ServiceList } from "~/schemas/api-bff/service"

import type { Lang } from "../i18n/use-lang"
import { buildRequestInit, joinUrl } from "./client"
import { toAPIError } from "./errors"

export {
  ServiceCache,
  ServiceCategory,
  ServiceItem,
  ServiceList,
  ServiceSource,
} from "~/schemas/api-bff/service"

export const serviceName = (item: ServiceItem, lang: Lang): string =>
  item.name[lang] || item.name.ja || item.name.en

export const serviceDescription = (item: ServiceItem, lang: Lang): string | undefined => {
  const picked = item.description[lang]
  if (picked) return picked

  return item.description.ja || item.description.en || undefined
}

export const serviceUrl = (item: ServiceItem, lang: Lang): string | undefined => {
  if (!item.url) return undefined

  return item.url[lang] ?? item.url.ja ?? item.url.en
}

export type FetchServicesQuery = {
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

export type FetchServicesOptions = {
  baseUrl?: string
  signal?: AbortSignal
  headers?: HeadersInit
  query?: FetchServicesQuery
}

export const fetchServices = async (
  options: FetchServicesOptions = {},
): Promise<ServiceList> => {
  const init = buildRequestInit({
    method: "GET",
    baseUrl: options.baseUrl,
    signal: options.signal,
    headers: options.headers,
  })
  const response = await fetch(joinUrl(options.baseUrl, buildServicesPath(options.query)), init)
  if (!response.ok) throw await toAPIError(response)

  return ServiceList.parse(await response.json())
}
