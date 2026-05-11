import type { LoaderFunctionArgs } from "react-router"

import type { Lang } from "@/i18n"
import { SUPPORTED_LANGS } from "@/i18n"
import { ensureWorkerStarted, type NewsType, searchNews } from "@/server/news-mirror"

const TYPE_VALUES: readonly NewsType[] = ["notification", "news"] as const
const RETIRED_VALUES = ["0", "1", "all"] as const

const parseList = (value: string | null): string[] | undefined => {
  if (!value) return undefined
  const arr = value.split(",").map((s) => s.trim()).filter((s) => s.length > 0)

  return arr.length > 0 ? arr : undefined
}

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
  const db = parseList(params.get("db"))
  if (db) query.db = db
  const tag = parseList(params.get("tag"))
  if (tag) query.tag = tag
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
