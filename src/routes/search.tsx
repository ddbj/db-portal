import { useQueries, useQuery } from "@tanstack/react-query"
import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  redirect,
  useNavigate,
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
  SidebarFilter,
} from "@/components/search"
import { Callout, Heading, SkeletonCard } from "@/components/ui"
import { pickLang } from "@/i18n"
import { resolveMeta } from "@/i18n/server"
import {
  apiCountsToHitCounts,
  ApiError,
  crossSearch,
  dbSearch,
  type FacetsDbType,
  fetchFacets,
  parseAdv,
} from "@/lib/api"
import { DATABASES } from "@/lib/mock-data"
import { PORTAL_ORIGIN } from "@/lib/portal-origin"
import {
  mergeAdvWithSidebar,
  type SidebarState,
  sidebarStateToDsl,
} from "@/lib/search-dsl-builder"
import {
  ALL_DB_VALUE,
  buildSearchUrlFull,
  parseSearchUrl,
  type PerPageValue,
  type SearchParams,
  type SortValue,
} from "@/lib/search-url"
import { sidebarFieldsForDb } from "@/lib/sidebar-fields"
import { astToDsl, astToSidebarState } from "@/lib/sidebar-from-ast"
import {
  DB_ORDER,
  type DbHitCount,
  type DbId,
  type ErrorKind,
} from "@/types/db"

import type { Route } from "./+types/search"

const toErrorKind = (error: unknown): ErrorKind => {
  if (error instanceof ApiError) {
    if (error.status === 502) return "upstream_5xx"
    if (error.status === 504) return "timeout"
    if (error.status >= 500) return "upstream_5xx"

    return "unknown"
  }
  if (error instanceof TypeError) {
    return "connection_refused"
  }

  return "unknown"
}

const KNOWN_ERROR_SLUGS: ReadonlySet<string> = new Set([
  "unexpected-parameter",
  "missing-db",
  "cursor-not-supported",
  "unexpected-token",
  "unknown-field",
  "field-not-available-in-cross-db",
  "invalid-date-format",
  "invalid-operator-for-field",
  "nest-depth-exceeded",
  "missing-value",
])

const getErrorMessage = (
  error: unknown,
  t: (key: string) => string,
): { headline: string; detail: string | null } => {
  if (error instanceof ApiError) {
    const slug = error.slug
    if (slug !== null && KNOWN_ERROR_SLUGS.has(slug)) {
      return {
        headline: t(`routes.search.errors.${slug}`),
        detail: error.problem?.detail ?? null,
      }
    }
  }

  return {
    headline: t("routes.search.errors.default"),
    detail: error instanceof ApiError ? error.problem?.detail ?? null : null,
  }
}

const SORT_TO_API: Record<
  SortValue,
  "datePublished:asc" | "datePublished:desc" | undefined
> = {
  relevance: undefined,
  date_desc: "datePublished:desc",
  date_asc: "datePublished:asc",
}

const SOLR_BACKED_DBS: ReadonlySet<DbId> = new Set<DbId>(["trad", "taxonomy"])
const isSolrBackedDb = (db: DbId): boolean => SOLR_BACKED_DBS.has(db)

const DEMO_FALLBACK_URL = "/search?q=human"

export const loader = ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url)
  const parsed = parseSearchUrl(url.searchParams)

  if (parsed.shouldRedirectToHome) {
    throw redirect(DEMO_FALLBACK_URL)
  }

  const lang = pickLang(
    request.headers.get("Cookie"),
    request.headers.get("Accept-Language"),
  )
  const resource = resolveMeta(lang)

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

  return {
    lang,
    metaTitle,
    metaDescription: resource.routes.search.meta.description,
    canonicalUrl: `${PORTAL_ORIGIN}${canonicalSearch}`,
  }
}

export const meta = ({ data }: Route.MetaArgs) => {
  const fallbackCanonical = `${PORTAL_ORIGIN}/search`

  return [
    { title: data?.metaTitle ?? "DB ポータル (仮)" },
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
    return <CrossModeView params={parsed.params} />
  }

  return (
    <DbModeView
      params={parsed.params}
      db={parsed.params.db}
    />
  )
}

export default Search

interface ModeViewProps {
  params: SearchParams
}

const CrossModeView = ({ params }: ModeViewProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const hasQuery = params.q !== null || params.adv !== null

  const query = useQuery({
    queryKey: ["crossSearch", params.q, params.adv] as const,
    queryFn: ({ signal }) =>
      crossSearch(
        {
          ...(params.q !== null && { q: params.q }),
          ...(params.adv !== null && { adv: params.adv }),
          topHits: 5,
        },
        signal,
      ),
    enabled: hasQuery,
  })

  const databases: readonly DbHitCount[] = useMemo(() => {
    if (!hasQuery || query.isPending) {
      return DB_ORDER.map((dbId) => ({
        dbId,
        state: "loading" as const,
        count: null,
      }))
    }
    if (query.isError) {
      const errorKind = toErrorKind(query.error)

      return DB_ORDER.map((dbId) => ({
        dbId,
        state: "error" as const,
        count: null,
        error: errorKind,
      }))
    }

    return apiCountsToHitCounts(query.data.databases)
  }, [hasQuery, query.isPending, query.isError, query.error, query.data])

  const handleRetry = (_dbId?: DbId) => {
    void query.refetch()
  }

  const handleClear = () => {
    void navigate("/", { replace: true })
  }

  const editHref = params.adv !== null
    ? `/advanced-search?adv=${encodeURIComponent(params.adv)}`
    : undefined

  const summaryProps = params.q !== null && params.adv !== null
    ? {
      mode: "combined" as const,
      q: params.q,
      adv: params.adv,
      db: params.db,
      onClear: handleClear,
      ...(editHref !== undefined && { editHref }),
    }
    : params.adv !== null
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
      <div>
        <Heading level={2} className="mb-3">
          {t("routes.search.crossMode.heading")}
        </Heading>
        {query.isError ? (() => {
          const tDynamic = t as unknown as (key: string) => string
          const { headline, detail } = getErrorMessage(query.error, tDynamic)

          return (
            <Callout type="error">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p>{headline}</p>
                  {detail !== null && (
                    <p className="mt-1 text-xs text-gray-600">{detail}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="text-primary-700 hover:text-primary-800 shrink-0 text-sm font-medium underline"
                  onClick={() => handleRetry()}
                >
                  {t("routes.search.crossMode.retryAll")}
                </button>
              </div>
            </Callout>
          )
        })() : (
          <PartialFailureBanner databases={databases} onRetryAll={() => handleRetry()} />
        )}
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

const resolveFacetsDbType = (
  db: DbId,
  subtype: string | null,
): FacetsDbType | null => {
  if (db === "trad" || db === "taxonomy") return null
  if (subtype !== null) return subtype as FacetsDbType
  if (db === "sra") return "sra-experiment"
  if (db === "jga") return "jga-study"

  return db as FacetsDbType
}

const DbModeView = ({ params, db }: DbModeViewProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const parseQuery = useQuery({
    queryKey: ["parseAdv", db, params.adv] as const,
    queryFn: ({ signal }) =>
      parseAdv({ adv: params.adv ?? "", db }, signal),
    enabled: params.adv !== null,
  })

  const { sidebar: derivedSidebar, residual } = useMemo(() => {
    const ast = parseQuery.data?.ast ?? null

    return astToSidebarState(ast, db)
  }, [parseQuery.data, db])

  const residualDsl = useMemo(
    () => (residual !== null ? astToDsl(residual) : null),
    [residual],
  )

  const facetsDbType = useMemo(
    () => resolveFacetsDbType(db, derivedSidebar.subtype),
    [db, derivedSidebar.subtype],
  )

  const sidebarFields = useMemo(
    () => sidebarFieldsForDb(db, derivedSidebar.subtype),
    [db, derivedSidebar.subtype],
  )

  const showSidebar = sidebarFields.facets.length > 0
    || sidebarFields.keywords.length > 0
    || sidebarFields.dateAxes.length > 0
    || sidebarFields.subtype

  const facetsParam = useMemo(() => {
    if (facetsDbType === null) return ""

    return sidebarFields.facets.map((f) => f.facetKey).join(",")
  }, [facetsDbType, sidebarFields])

  const hasQuery = params.q !== null || params.adv !== null

  const subtypeList: readonly string[] = useMemo(
    () =>
      db === "sra"
        ? ["sra-submission", "sra-study", "sra-experiment", "sra-run", "sra-sample", "sra-analysis"]
        : db === "jga"
          ? ["jga-study", "jga-dataset", "jga-dac", "jga-policy"]
          : [],
    [db],
  )

  const baseAdvForSubtypeCount = useMemo(() => {
    const baseSidebarState = { ...derivedSidebar, subtype: null }
    const baseSidebarDsl = sidebarStateToDsl(baseSidebarState)

    return mergeAdvWithSidebar(residualDsl, baseSidebarDsl)
  }, [derivedSidebar, residualDsl])

  const subtypeCountQueries = useQueries({
    queries: subtypeList.map((subtype) => ({
      queryKey: [
        "subtypeCount",
        db,
        subtype,
        params.q,
        baseAdvForSubtypeCount,
      ] as const,
      queryFn: ({ signal }: { signal: AbortSignal }) => {
        const subtypeAdv = baseAdvForSubtypeCount === null
          ? `type:${subtype}`
          : `(${baseAdvForSubtypeCount}) AND type:${subtype}`

        return dbSearch(
          {
            db,
            ...(params.q !== null && { q: params.q }),
            adv: subtypeAdv,
            page: 1,
            perPage: 20,
          },
          signal,
        )
      },
      enabled: subtypeList.length > 0 && hasQuery,
    })),
  })

  const subtypeCounts = useMemo(() => {
    const result: Record<string, number | null> = {}
    subtypeList.forEach((subtype, i) => {
      const q = subtypeCountQueries[i]
      result[subtype] = q?.data?.total ?? null
    })

    return result
  }, [subtypeList, subtypeCountQueries])

  const query = useQuery({
    queryKey: [
      "dbSearch",
      db,
      params.q,
      params.adv,
      params.page,
      params.perPage,
      params.sort,
      params.cursor,
    ] as const,
    queryFn: ({ signal }) => {
      const apiSort = SORT_TO_API[params.sort]
      if (params.cursor !== null) {
        return dbSearch(
          {
            db,
            cursor: params.cursor,
            perPage: params.perPage,
          },
          signal,
        )
      }

      return dbSearch(
        {
          db,
          ...(params.q !== null && { q: params.q }),
          ...(params.adv !== null && { adv: params.adv }),
          page: params.page,
          perPage: params.perPage,
          ...(apiSort !== undefined && { sort: apiSort }),
        },
        signal,
      )
    },
  })

  const facetsQuery = useQuery({
    queryKey: ["facets", facetsDbType, params.q, params.adv, facetsParam] as const,
    queryFn: ({ signal }) =>
      fetchFacets(
        facetsDbType,
        {
          ...(params.q !== null && { keywords: params.q }),
          ...(facetsParam !== "" && { facets: facetsParam }),
        },
        signal,
      ),
    enabled: facetsDbType !== null && hasQuery,
  })

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

  const handleSidebarChange = (next: SidebarState) => {
    const sidebarDsl = sidebarStateToDsl(next)
    const newAdv = mergeAdvWithSidebar(residualDsl, sidebarDsl)
    updateParams({ adv: newAdv, page: 1, cursor: null })
  }

  const handleSortChange = (sort: SortValue) =>
    updateParams({ sort, page: 1, cursor: null })
  const handlePerPageChange = (perPage: PerPageValue) =>
    updateParams({ perPage, page: 1, cursor: null })
  const handlePageChange = (page: number) => {
    const nextOffset = page * params.perPage
    const apiNextCursor = query.data?.nextCursor ?? null
    if (
      !isSolrBackedDb(db)
      && nextOffset > 10_000
      && apiNextCursor !== null
      && apiNextCursor !== ""
    ) {
      updateParams({ cursor: apiNextCursor, page: 1 })

      return
    }
    updateParams({ page, cursor: null })
  }
  const handleCursorNext = (cursor: string) => updateParams({ cursor, page: 1 })

  const handleClear = () => {
    void navigate("/", { replace: true })
  }

  const handleRetry = () => {
    void query.refetch()
  }

  const advancedSearchHref = `/advanced-search?db=${db}${
    params.adv !== null ? `&adv=${encodeURIComponent(params.adv)}` : ""
  }`

  const editHref = params.adv !== null
    ? `/advanced-search?db=${db}&adv=${encodeURIComponent(params.adv)}`
    : undefined

  const summaryProps = params.q !== null && params.adv !== null
    ? {
      mode: "combined" as const,
      q: params.q,
      adv: params.adv,
      db: params.db,
      onClear: handleClear,
      ...(editHref !== undefined && { editHref }),
    }
    : params.adv !== null
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

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8">
      <SearchSummaryChip {...summaryProps} />
      <Heading level={2} className="mb-0">
        {displayName}
      </Heading>

      <div className="flex gap-6">
        {showSidebar && (
          <SidebarFilter
            db={db}
            state={derivedSidebar}
            residualDsl={residualDsl}
            facetsData={facetsQuery.data ?? null}
            loading={facetsDbType !== null && facetsQuery.isPending}
            onChange={handleSidebarChange}
            advancedSearchHref={advancedSearchHref}
            subtypeCounts={subtypeCounts}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {query.isPending && (
            <div className="flex flex-col gap-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {query.isError && (() => {
            const tDynamic = t as unknown as (key: string) => string
            const { headline, detail } = getErrorMessage(query.error, tDynamic)

            return (
              <Callout type="error">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p>{headline}</p>
                    {detail !== null && (
                      <p className="mt-1 text-xs text-gray-600">{detail}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-primary-700 hover:text-primary-800 shrink-0 text-sm font-medium underline"
                    onClick={handleRetry}
                  >
                    {t("routes.search.crossMode.retryAll")}
                  </button>
                </div>
              </Callout>
            )
          })()}

          {query.isSuccess && (
            <>
              <SearchToolbar
                total={query.data.total}
                page={params.page}
                perPage={params.perPage}
                sort={params.sort}
                onSortChange={handleSortChange}
                onPerPageChange={handlePerPageChange}
                isOver10kLimit={query.data.hardLimitReached}
              />
              <ResultCardList hits={query.data.hits} />
              <Pagination
                page={params.page}
                totalPages={Math.max(
                  1,
                  Math.ceil(query.data.total / params.perPage),
                )}
                onChange={handlePageChange}
                hardLimitReached={query.data.hardLimitReached && isSolrBackedDb(db)}
                cursorMode={params.cursor !== null && !isSolrBackedDb(db)}
                nextCursor={query.data.nextCursor ?? null}
                onCursorNext={handleCursorNext}
              />
              {query.data.hardLimitReached && isSolrBackedDb(db) && (
                <Over10kCallout db={db} />
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
