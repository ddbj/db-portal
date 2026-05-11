import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router"

import NewsFacetsView from "@/components/news/NewsFacets"
import NewsList from "@/components/news/NewsList"
import { pickLang } from "@/i18n"
import { resolveMeta } from "@/i18n/server"
import { PORTAL_ORIGIN } from "@/lib/portal-origin"
import { type NewsType, searchNews } from "@/server/news-mirror"

import type { Route } from "./+types/news"

const ARCHIVE_LIMIT = 100
const NEWS_TYPE_VALUES: readonly NewsType[] = ["notification", "news"] as const

const parseList = (value: string | null): string[] => {
  if (!value) return []

  return value.split(",").map((s) => s.trim()).filter((s) => s.length > 0)
}

const parseType = (value: string | null): NewsType | null => {
  if (!value) return null
  if ((NEWS_TYPE_VALUES as readonly string[]).includes(value)) return value as NewsType

  return null
}

export const loader = ({ request }: Route.LoaderArgs) => {
  const lang = pickLang(request.headers.get("Cookie"), request.headers.get("Accept-Language"))
  const resource = resolveMeta(lang)
  const url = new URL(request.url)
  const params = url.searchParams

  const year = params.get("year") ?? null
  const type = parseType(params.get("type"))
  const dbs = parseList(params.get("db"))
  const tags = parseList(params.get("tag"))

  const query: Parameters<typeof searchNews>[0] = { lang, retired: "all", limit: ARCHIVE_LIMIT }
  if (year) query.year = year
  if (type) query.type = type
  if (dbs.length > 0) query.db = dbs
  if (tags.length > 0) query.tag = tags

  const result = searchNews(query)

  return {
    initial: result,
    lang,
    metaTitle: resource.routes.news.meta.title,
    metaDescription: resource.routes.news.meta.description,
  }
}

export const meta = ({ data }: Route.MetaArgs) => [
  { title: data?.metaTitle ?? "News" },
  { name: "description", content: data?.metaDescription ?? "" },
  { name: "robots", content: "index, follow" },
  { tagName: "link", rel: "canonical", href: `${PORTAL_ORIGIN}/news` },
]

const updateMulti = (params: URLSearchParams, key: string, value: string): void => {
  const current = parseList(params.get(key))
  const idx = current.indexOf(value)
  const next = idx >= 0
    ? [...current.slice(0, idx), ...current.slice(idx + 1)]
    : [...current, value]
  if (next.length > 0) params.set(key, next.join(","))
  else params.delete(key)
}

const News = ({ loaderData }: Route.ComponentProps) => {
  const { t } = useTranslation()
  const { initial } = loaderData
  const [searchParams, setSearchParams] = useSearchParams()

  const selectedYear = searchParams.get("year")
  const selectedType = parseType(searchParams.get("type"))
  const selectedDbs = useMemo(() => new Set(parseList(searchParams.get("db"))), [searchParams])
  const selectedTags = useMemo(() => new Set(parseList(searchParams.get("tag"))), [searchParams])

  const handleSelectYear = (year: string | null): void => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (year) next.set("year", year)
      else next.delete("year")

      return next
    })
  }

  const handleSelectType = (type: NewsType | null): void => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (type) next.set("type", type)
      else next.delete("type")

      return next
    })
  }

  const handleToggleDb = (db: string): void => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      updateMulti(next, "db", db)

      return next
    })
  }

  const handleToggleTag = (tag: string): void => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      updateMulti(next, "tag", tag)

      return next
    })
  }

  const handleClearAll = (): void => {
    setSearchParams(new URLSearchParams())
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 pt-10 pb-16">
      <header className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-semibold text-gray-900">
          {t("routes.news.heading")}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {t("routes.news.subheading")}
        </p>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        <NewsFacetsView
          facets={initial.facets}
          selectedYear={selectedYear}
          selectedType={selectedType}
          selectedDbs={selectedDbs}
          selectedTags={selectedTags}
          onSelectYear={handleSelectYear}
          onSelectType={handleSelectType}
          onToggleDb={handleToggleDb}
          onToggleTag={handleToggleTag}
          onClearAll={handleClearAll}
        />

        <main>
          <p className="mb-3 text-xs text-gray-500">
            {t("routes.news.count", { count: initial.total })}
          </p>
          <NewsList items={initial.hits} />
        </main>
      </div>
    </div>
  )
}

export default News
