import type { LoaderFunctionArgs } from "react-router"

import type { Lang } from "@/i18n"
import { SUPPORTED_LANGS } from "@/i18n"
import { ensureWorkerStarted, type NewsType, searchNews } from "@/server/news-mirror"
import {
  parseCanonicalTagList,
  parseCsvList,
  parseSourceList,
} from "@/server/news-mirror/query-params"

const TYPE_VALUES: readonly NewsType[] = ["notification", "news"] as const
const RETIRED_VALUES = ["0", "1", "all"] as const

const parseLang = (value: string | null): Lang | undefined => {
  if (!value) return undefined
  if ((SUPPORTED_LANGS as readonly string[]).includes(value)) return value as Lang

  return undefined
}

const parseType = (value: string | null): NewsType | undefined => {
  if (!value) return undefined
  if ((TYPE_VALUES as readonly string[]).includes(value)) return value as NewsType

  return undefined
}

const parseRetired = (value: string | null): "0" | "1" | "all" | undefined => {
  if (!value) return undefined
  if ((RETIRED_VALUES as readonly string[]).includes(value)) return value as "0" | "1" | "all"

  return undefined
}

const parseLimit = (value: string | null): number | undefined => {
  if (!value) return undefined
  const n = Number(value)

  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined
}

export const loader = ({ request }: LoaderFunctionArgs) => {
  ensureWorkerStarted()

  const url = new URL(request.url)
  const params = url.searchParams

  const query: Parameters<typeof searchNews>[0] = {}
  const lang = parseLang(params.get("lang"))
  if (lang) query.lang = lang
  const source = parseSourceList(params.get("source"))
  if (source.length > 0) query.source = source
  const db = parseCsvList(params.get("db"))
  if (db.length > 0) query.db = db
  const tag = parseCanonicalTagList(params.get("tag"))
  if (tag.length > 0) query.tag = tag
  const year = params.get("year")
  if (year) query.year = year
  const type = parseType(params.get("type"))
  if (type) query.type = type
  const retired = parseRetired(params.get("retired"))
  if (retired) query.retired = retired
  const limit = parseLimit(params.get("limit"))
  if (limit !== undefined) query.limit = limit
  const cursor = params.get("cursor")
  if (cursor) query.cursor = cursor

  const result = searchNews(query)

  return Response.json(result, {
    headers: {
      "Cache-Control": "no-store",
    },
  })
}
