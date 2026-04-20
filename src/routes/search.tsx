import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  redirect,
  useLoaderData,
  useNavigate,
  useRevalidator,
  useSearchParams,
} from "react-router"

import {
  DbHitCountList,
  Over10kCallout,
  Pagination,
  PartialFailureBanner,
  ResultCardList,
  SearchSummaryChip,
  SearchToolbar,
} from "@/components/search"
import { Callout, Heading, SkeletonCard } from "@/components/ui"
import en from "@/content/locales/en.json"
import ja from "@/content/locales/ja.json"
import { pickLang } from "@/i18n"
import {
  classifyMockQuery,
  DATABASES,
  dbHitCountQueryFn,
  isHardLimitReached,
  MockError,
  type SearchResultsPayload,
  searchResultsQueryFn,
} from "@/lib/mock-data"
import {
  ALL_DB_VALUE,
  buildSearchUrlFull,
  parseSearchUrl,
  type PerPageValue,
  type SearchParams,
  type SortValue,
} from "@/lib/search-url"
import {
  DB_ORDER,
  type DbHitCount,
  type DbId,
  type ErrorKind,
} from "@/types/db"

import type { Route } from "./+types/search"

const ERROR_KINDS: ReadonlySet<string> = new Set<ErrorKind>([
  "timeout",
  "upstream_5xx",
  "connection_refused",
  "unknown",
])

const toErrorKind = (error: unknown): ErrorKind => {
  if (error instanceof MockError) return error.kind
  if (error instanceof Error && ERROR_KINDS.has(error.message)) {
    return error.message as ErrorKind
  }

  return "unknown"
}

const PORTAL_ORIGIN = "https://portal.ddbj.nig.ac.jp"

const DEMO_FALLBACK_URL = "/search?q=human"

const resolveHitCounts = async (
  q: string | null,
  adv: string | null,
): Promise<readonly DbHitCount[]> => {
  const key = q ?? adv ?? ""
  const modality = classifyMockQuery(key)
  if (modality === "loading") {
    return DB_ORDER.map((dbId) => ({ dbId, state: "loading", count: null }))
  }
  const results = await Promise.allSettled(
    DB_ORDER.map((dbId) => dbHitCountQueryFn(dbId, q, adv)),
  )

  return results.map((r, idx) => {
    const dbId = DB_ORDER[idx] as DbId
    if (r.status === "fulfilled") {
      return { dbId, state: "success", count: r.value.count }
    }

    return {
      dbId,
      state: "error",
      count: null,
      error: toErrorKind(r.reason),
    }
  })
}

type DbModeResult =
  | { state: "loading" }
  | { state: "success"; payload: SearchResultsPayload }
  | { state: "error"; error: ErrorKind }

const resolveDbModeResult = async (
  params: SearchParams & { db: DbId },
): Promise<DbModeResult> => {
  const key = params.q ?? params.adv ?? ""
  const modality = classifyMockQuery(key)
  if (modality === "loading") return { state: "loading" }
  try {
    const payload = await searchResultsQueryFn({
      q: params.q,
      adv: params.adv,
      db: params.db,
      page: params.page,
      perPage: params.perPage,
      sort: params.sort,
    })

    return { state: "success", payload }
  } catch (e) {
    return { state: "error", error: toErrorKind(e) }
  }
}

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url)
  const parsed = parseSearchUrl(url.searchParams)

  if (parsed.shouldRedirectToHome) {
    throw redirect(DEMO_FALLBACK_URL)
  }

  const lang = pickLang(
    request.headers.get("Cookie"),
    request.headers.get("Accept-Language"),
  )
  const resource = lang === "ja" ? ja : en

  let metaTitle: string = resource.routes.home.meta.title
  if (parsed.params.q === null && parsed.params.adv !== null) {
    metaTitle = resource.routes.search.meta.titleAdv
  } else if (parsed.params.q !== null) {
    const q = parsed.params.q
    if (parsed.params.db !== ALL_DB_VALUE) {
      const displayName = DATABASES.find((d) => d.id === parsed.params.db)?.displayName
        ?? parsed.params.db
      metaTitle = resource.routes.search.meta.titleDb
        .replace("{{q}}", q)
        .replace("{{db}}", displayName)
    } else {
      metaTitle = resource.routes.search.meta.titleCross.replace("{{q}}", q)
    }
  }

  const canonicalSearch = buildSearchUrlFull({
    adv: parsed.params.adv,
    cursor: parsed.params.cursor,
    db: parsed.params.db,
    page: parsed.params.page,
    perPage: parsed.params.perPage,
    q: parsed.params.q,
    sort: parsed.params.sort,
  })

  const databases = parsed.params.db === ALL_DB_VALUE
    ? await resolveHitCounts(parsed.params.q, parsed.params.adv)
    : null

  const dbModeResult = parsed.params.db !== ALL_DB_VALUE
    ? await resolveDbModeResult({ ...parsed.params, db: parsed.params.db })
    : null

  return {
    lang,
    metaTitle,
    metaDescription: resource.routes.search.meta.description,
    canonicalUrl: `${PORTAL_ORIGIN}${canonicalSearch}`,
    databases,
    dbModeResult,
  }
}

export const meta = ({ data }: Route.MetaArgs) => {
  const fallbackCanonical = `${PORTAL_ORIGIN}/search`

  return [
    { title: data?.metaTitle ?? "DDBJ Portal" },
    { name: "description", content: data?.metaDescription ?? "DDBJ 検索" },
    { name: "robots", content: "noindex, follow" },
    {
      tagName: "link",
      rel: "canonical",
      href: data?.canonicalUrl ?? fallbackCanonical,
    },
  ]
}

const Search = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const parsed = useMemo(() => parseSearchUrl(searchParams), [searchParams])

  useEffect(() => {
    if (parsed.canonicalUrl !== null) {
      void navigate(parsed.canonicalUrl, { replace: true })
    }
  }, [parsed.canonicalUrl, navigate])

  if (parsed.params.db === ALL_DB_VALUE) {
    return <CrossModeView params={parsed.params} softErrors={parsed.softErrors} />
  }

  return (
    <DbModeView
      params={parsed.params}
      softErrors={parsed.softErrors}
      db={parsed.params.db}
    />
  )
}

export default Search

interface ModeViewProps {
  params: SearchParams
  softErrors: readonly "both_q_and_adv"[]
}

const CrossModeView = ({ params, softErrors }: ModeViewProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const revalidator = useRevalidator()
  const loaderData = useLoaderData<typeof loader>()
  const databases: readonly DbHitCount[] = loaderData.databases ?? DB_ORDER.map((dbId) => ({
    dbId,
    state: "loading",
    count: null,
  }))

  const handleRetry = (_dbId?: DbId) => {
    void revalidator.revalidate()
  }

  const handleClear = () => {
    void navigate("/", { replace: true })
  }

  const editHref = params.adv !== null
    ? `/advanced-search?adv=${encodeURIComponent(params.adv)}`
    : undefined

  const summaryProps = params.adv !== null
    ? {
      mode: "advanced" as const,
      adv: params.adv,
      db: params.db,
      onClear: handleClear,
      ...(editHref !== undefined && { editHref }),
    }
    : {
      mode: "simple" as const,
      q: params.q ?? "",
      db: params.db,
      onClear: handleClear,
    }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
      <SearchSummaryChip {...summaryProps} />
      {softErrors.includes("both_q_and_adv") && (
        <Callout type="warning">
          {t("routes.search.crossMode.bothQAdvWarning")}
        </Callout>
      )}
      <div>
        <Heading level={2} className="mb-3">
          {t("routes.search.crossMode.heading")}
        </Heading>
        <PartialFailureBanner databases={databases} onRetryAll={() => handleRetry()} />
        <div className="mt-3">
          <DbHitCountList
            databases={databases}
            query={params.q}
            adv={params.adv}
            onRetry={handleRetry}
          />
        </div>
      </div>
    </section>
  )
}

interface DbModeViewProps extends ModeViewProps {
  db: DbId
}

const DbModeView = ({ params, softErrors, db }: DbModeViewProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const revalidator = useRevalidator()
  const loaderData = useLoaderData<typeof loader>()
  const dbModeResult: DbModeResult = loaderData.dbModeResult ?? { state: "loading" }

  const updateParams = (changes: Partial<SearchParams>) => {
    const merged = { ...params, ...changes }
    const url = buildSearchUrlFull({
      adv: merged.adv,
      cursor: merged.cursor,
      db: merged.db,
      page: merged.page,
      perPage: merged.perPage,
      q: merged.q,
      sort: merged.sort,
    })
    void navigate(url)
  }

  const handleSortChange = (sort: SortValue) => updateParams({ sort, page: 1 })
  const handlePerPageChange = (perPage: PerPageValue) =>
    updateParams({ perPage, page: 1 })
  const handlePageChange = (page: number) => updateParams({ page })

  const handleClear = () => {
    void navigate("/", { replace: true })
  }

  const handleRetry = () => {
    void revalidator.revalidate()
  }

  const editHref = params.adv !== null
    ? `/advanced-search?db=${db}&adv=${encodeURIComponent(params.adv)}`
    : undefined

  const summaryProps = params.adv !== null
    ? {
      mode: "advanced" as const,
      adv: params.adv,
      db: params.db,
      onClear: handleClear,
      ...(editHref !== undefined && { editHref }),
    }
    : {
      mode: "simple" as const,
      q: params.q ?? "",
      db: params.db,
      onClear: handleClear,
    }

  const displayName = DATABASES.find((d) => d.id === db)?.displayName ?? db
  const hardLimit = isHardLimitReached(db, params.page, params.perPage)

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
      <SearchSummaryChip {...summaryProps} />
      {softErrors.includes("both_q_and_adv") && (
        <Callout type="warning">
          {t("routes.search.crossMode.bothQAdvWarning")}
        </Callout>
      )}
      <Heading level={2} className="mb-0">
        {displayName}
      </Heading>

      {dbModeResult.state === "loading" && (
        <div className="flex flex-col gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {dbModeResult.state === "error" && (
        <Callout type="error">
          <div className="flex items-center justify-between gap-3">
            <p>{t("routes.search.crossMode.partialFailure.allError")}</p>
            <button
              type="button"
              className="text-primary-700 hover:text-primary-800 text-sm font-medium underline"
              onClick={handleRetry}
            >
              {t("routes.search.crossMode.retryAll")}
            </button>
          </div>
        </Callout>
      )}

      {dbModeResult.state === "success" && (
        <>
          <SearchToolbar
            total={dbModeResult.payload.total}
            page={params.page}
            perPage={params.perPage}
            sort={params.sort}
            onSortChange={handleSortChange}
            onPerPageChange={handlePerPageChange}
            isOver10kLimit={dbModeResult.payload.hardLimitReached || hardLimit}
          />
          <ResultCardList results={dbModeResult.payload.hits} />
          <Pagination
            page={params.page}
            totalPages={Math.max(
              1,
              Math.ceil(dbModeResult.payload.total / params.perPage),
            )}
            onChange={handlePageChange}
            hardLimitReached={dbModeResult.payload.hardLimitReached}
          />
          {dbModeResult.payload.hardLimitReached && <Over10kCallout db={db} />}
        </>
      )}
    </section>
  )
}
