import { useQueries, useQuery } from "@tanstack/react-query"
import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  redirect,
  useNavigate,
  useSearchParams,
} from "react-router"

import { QueryPreview } from "@/components/advanced-search"
import { LlmAssistBox } from "@/components/llm"
import {
  ActiveFilterChips,
  CrossSidebarFilter,
  DbHitCountList,
  Pagination,
  PartialFailureBanner,
  ResultCardList,
  SearchToolbar,
  SidebarFilter,
} from "@/components/search"
import {
  Callout,
  Heading,
  SearchBox,
  type SelectOption,
  SkeletonCard,
} from "@/components/ui"
import { pickLang } from "@/i18n"
import { resolveMeta } from "@/i18n/server"
import {
  apiCountsToHitCounts,
  ApiError,
  crossSearch,
  dbSearch,
  type FacetsDbType,
  fetchFacets,
  parseQ,
} from "@/lib/api"
import { DATABASES } from "@/lib/mock-data"
import { PORTAL_ORIGIN } from "@/lib/portal-origin"
import {
  astToDsl,
  extractFreeText,
  fieldEq,
  mergeAstAnd,
  parseAstToSearchAst,
  type SearchAstNode,
  sidebarStateToAst,
  splitAstForCrossSidebar,
  splitAstForSidebar,
} from "@/lib/search-ast"
import {
  ALL_DB_VALUE,
  buildSearchUrlFull,
  parseSearchUrl,
  type PerPageValue,
  type SearchParams,
  type SortValue,
} from "@/lib/search-url"
import { CROSS_SIDEBAR_FIELDS, sidebarFieldsForDb } from "@/lib/sidebar-fields"
import type { SidebarState } from "@/lib/sidebar-state-types"
import {
  DB_ORDER,
  type DbHitCount,
  type DbId,
  type ErrorKind,
} from "@/types/db"

import type { Route } from "./+types/search.results"

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
  "invalid-freetext-position",
  "duplicate-freetext",
])

const getErrorMessage = (
  error: unknown,
  t: (key: string) => string,
): { headline: string; detail: string | null } => {
  if (error instanceof ApiError) {
    const slug = error.slug
    if (slug !== null && KNOWN_ERROR_SLUGS.has(slug)) {
      return {
        headline: t(`routes.searchResults.errors.${slug}`),
        detail: error.problem?.detail ?? null,
      }
    }
  }

  return {
    headline: t("routes.searchResults.errors.default"),
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

export const loader = ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url)
  const parsed = parseSearchUrl(url.searchParams)

  if (parsed.shouldRedirectToHome) {
    throw redirect("/")
  }

  const lang = pickLang(
    request.headers.get("Cookie"),
    request.headers.get("Accept-Language"),
  )
  const resource = resolveMeta(lang)

  let metaTitle: string = resource.routes.home.meta.title
  if (parsed.params.db !== ALL_DB_VALUE) {
    const displayName = DATABASES.find((d) => d.id === parsed.params.db)?.displayName
      ?? parsed.params.db
    if (parsed.params.q !== null) {
      metaTitle = resource.routes.searchResults.meta.titleDb
        .replace("{{q}}", parsed.params.q)
        .replace("{{db}}", displayName)
    } else {
      metaTitle = resource.routes.searchResults.meta.titleDbNoQuery
        .replace("{{db}}", displayName)
    }
  } else if (parsed.params.q !== null) {
    metaTitle = resource.routes.searchResults.meta.titleCross.replace("{{q}}", parsed.params.q)
  }

  const canonicalSearch = buildSearchUrlFull({
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
    metaDescription: resource.routes.searchResults.meta.description,
    canonicalUrl: `${PORTAL_ORIGIN}${canonicalSearch}`,
  }
}

export const meta = ({ data }: Route.MetaArgs) => {
  const fallbackCanonical = `${PORTAL_ORIGIN}/search/results`

  return [
    { title: data?.metaTitle ?? "DDBJ 刷新 (仮)" },
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

  const hasQuery = params.q !== null

  const parseQuery = useQuery({
    queryKey: ["parseQCross", params.q] as const,
    queryFn: ({ signal }) =>
      parseQ({ q: params.q ?? "" }, signal),
    enabled: params.q !== null && params.q !== "",
    staleTime: Infinity,
  })

  const parsedAst: SearchAstNode | null = useMemo(() => {
    if (parseQuery.data === undefined) return null

    return parseAstToSearchAst(parseQuery.data.ast)
  }, [parseQuery.data])

  const { sidebar: derivedSidebar, residual } = useMemo(
    () => splitAstForCrossSidebar(parsedAst),
    [parsedAst],
  )

  const freeTextForFacets = useMemo(
    () => extractFreeText(parsedAst),
    [parsedAst],
  )

  const facetsQuery = useQuery({
    queryKey: ["facetsCross", freeTextForFacets] as const,
    queryFn: ({ signal }) =>
      fetchFacets(
        null,
        {
          ...(freeTextForFacets !== null && { keywords: freeTextForFacets }),
          facets: "organism",
        },
        signal,
      ),
  })

  const query = useQuery({
    queryKey: ["crossSearch", params.q] as const,
    queryFn: ({ signal }) =>
      crossSearch(
        {
          ...(params.q !== null && { q: params.q }),
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

  const advancedSearchHref = `/search${
    params.q !== null ? `?q=${encodeURIComponent(params.q)}` : ""
  }`

  const dbOptions: readonly SelectOption[] = useMemo(() => [
    { value: ALL_DB_VALUE, label: t("routes.search.dbSelector.all") },
    ...DATABASES.map((d) => ({ value: d.id, label: d.displayName })),
  ], [t])

  const updateQ = (newQ: string | null) => {
    const url = buildSearchUrlFull({
      db: ALL_DB_VALUE,
      ...(newQ !== null && newQ !== "" && { q: newQ }),
    })
    void navigate(url)
  }

  const handleSearchBoxSubmit = (value: string) => {
    updateQ(value.trim() === "" ? null : value.trim())
  }

  const handleSidebarChange = (next: SidebarState) => {
    const sidebarAst = sidebarStateToAst(next)
    const mergedAst = mergeAstAnd([residual, sidebarAst])
    const newQ = mergedAst === null ? null : astToDsl(mergedAst)
    updateQ(newQ === "" ? null : newQ)
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-8">
      <Heading level={2} className="mb-0">
        {t("routes.searchResults.crossMode.heading")}
      </Heading>

      <SearchBox
        size="large"
        value={parseQuery.isError ? (params.q ?? "") : derivedSidebar.freeText}
        placeholder={t("routes.search.searchBox.placeholder")}
        buttonLabel={t("routes.search.actions.search")}
        dbOptions={dbOptions}
        selectedDb={ALL_DB_VALUE}
        dbDisabled
        dbDisabledTitle={t("routes.searchResults.searchBox.dbDisabledHint")}
        dbAriaLabel={t("routes.search.searchBox.dbSelectorAria")}
        onSubmit={handleSearchBoxSubmit}
      />

      {params.q !== null && (
        <QueryPreview
          dsl={params.q}
          initialQ={null}
          errors={[]}
          compact
          editHref={advancedSearchHref}
          onClear={handleClear}
        />
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-col gap-6">
          <ActiveFilterChips
            state={derivedSidebar}
            fields={CROSS_SIDEBAR_FIELDS}
            onChange={handleSidebarChange}
            className="w-64"
          />
          <CrossSidebarFilter
            state={derivedSidebar}
            facetsData={facetsQuery.data ?? null}
            loading={facetsQuery.isPending}
            onChange={handleSidebarChange}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
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
                    {t("routes.searchResults.crossMode.retryAll")}
                  </button>
                </div>
              </Callout>
            )
          })() : (
            <PartialFailureBanner databases={databases} onRetryAll={() => handleRetry()} />
          )}
          <DbHitCountList
            databases={databases}
            query={params.q}
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
    queryKey: ["parseQ", db, params.q] as const,
    queryFn: ({ signal }) =>
      parseQ({ q: params.q ?? "", db }, signal),
    enabled: params.q !== null && params.q !== "",
    staleTime: Infinity,
  })

  const parsedAst: SearchAstNode | null = useMemo(() => {
    if (parseQuery.data === undefined) return null

    return parseAstToSearchAst(parseQuery.data.ast)
  }, [parseQuery.data])

  const { sidebar: derivedSidebar, residual } = useMemo(
    () => splitAstForSidebar(parsedAst, db),
    [parsedAst, db],
  )

  const freeTextForFacets = useMemo(
    () => extractFreeText(parsedAst),
    [parsedAst],
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

  const subtypeList: readonly string[] = useMemo(
    () =>
      db === "sra"
        ? ["sra-submission", "sra-study", "sra-experiment", "sra-run", "sra-sample", "sra-analysis"]
        : db === "jga"
          ? ["jga-study", "jga-dataset", "jga-dac", "jga-policy"]
          : [],
    [db],
  )

  const baseAstForSubtypeCount = useMemo(() => {
    const baseSidebarState: SidebarState = { ...derivedSidebar, subtype: null }
    const baseSidebarAst = sidebarStateToAst(baseSidebarState)

    return mergeAstAnd([residual, baseSidebarAst])
  }, [derivedSidebar, residual])

  const subtypeCountQueries = useQueries({
    queries: subtypeList.map((subtype) => ({
      queryKey: [
        "subtypeCount",
        db,
        subtype,
        params.q,
      ] as const,
      queryFn: ({ signal }: { signal: AbortSignal }) => {
        const merged = mergeAstAnd([
          baseAstForSubtypeCount,
          fieldEq("type", subtype),
        ])
        const subtypeQ = astToDsl(merged)

        return dbSearch(
          {
            db,
            ...(subtypeQ !== "" && { q: subtypeQ }),
            page: 1,
            perPage: 20,
          },
          signal,
        )
      },
      enabled: subtypeList.length > 0,
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
          page: params.page,
          perPage: params.perPage,
          ...(apiSort !== undefined && { sort: apiSort }),
        },
        signal,
      )
    },
  })

  const facetsQuery = useQuery({
    queryKey: ["facets", facetsDbType, freeTextForFacets, facetsParam] as const,
    queryFn: ({ signal }) =>
      fetchFacets(
        facetsDbType,
        {
          ...(freeTextForFacets !== null && { keywords: freeTextForFacets }),
          ...(facetsParam !== "" && { facets: facetsParam }),
        },
        signal,
      ),
    enabled: facetsDbType !== null,
  })

  const updateParams = (changes: Partial<SearchParams>) => {
    const merged = { ...params, ...changes }
    const url = buildSearchUrlFull({
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
    const sidebarAst = sidebarStateToAst(next)
    const mergedAst = mergeAstAnd([residual, sidebarAst])
    const newQ = mergedAst === null ? null : astToDsl(mergedAst)
    updateParams({
      q: newQ === "" ? null : newQ,
      page: 1,
      cursor: null,
    })
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
    void navigate(buildSearchUrlFull({ db }), { replace: true })
  }

  const handleRetry = () => {
    void query.refetch()
  }

  const handleLlmApply = (newDsl: string): void => {
    updateParams({ q: newDsl, page: 1, cursor: null })
  }

  const advancedSearchHref = `/search?db=${db}${
    params.q !== null ? `&q=${encodeURIComponent(params.q)}` : ""
  }`

  const displayName = DATABASES.find((d) => d.id === db)?.displayName ?? db

  const dbOptions: readonly SelectOption[] = useMemo(() => [
    { value: ALL_DB_VALUE, label: t("routes.search.dbSelector.all") },
    ...DATABASES.map((d) => ({ value: d.id, label: d.displayName })),
  ], [t])

  const handleSearchBoxSubmit = (value: string) => {
    handleSidebarChange({ ...derivedSidebar, freeText: value })
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-8">
      <Heading level={2} className="mb-0">
        {displayName}
      </Heading>

      <SearchBox
        size="large"
        value={parseQuery.isError ? (params.q ?? "") : derivedSidebar.freeText}
        placeholder={t("routes.search.searchBox.placeholder")}
        buttonLabel={t("routes.search.actions.search")}
        dbOptions={dbOptions}
        selectedDb={db}
        dbDisabled
        dbDisabledTitle={t("routes.searchResults.searchBox.dbDisabledHint")}
        dbAriaLabel={t("routes.search.searchBox.dbSelectorAria")}
        onSubmit={handleSearchBoxSubmit}
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        {showSidebar && (
          <div className="flex flex-col gap-6">
            <ActiveFilterChips
              state={derivedSidebar}
              fields={sidebarFields}
              onChange={handleSidebarChange}
              className="w-64"
            />
            <SidebarFilter
              db={db}
              state={derivedSidebar}
              facetsData={facetsQuery.data ?? null}
              loading={facetsDbType !== null && facetsQuery.isPending}
              onChange={handleSidebarChange}
              subtypeCounts={subtypeCounts}
            />
          </div>
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
                    {t("routes.searchResults.crossMode.retryAll")}
                  </button>
                </div>
              </Callout>
            )
          })()}

          {query.isSuccess && (() => {
            const totalPages = Math.max(
              1,
              Math.ceil(query.data.total / params.perPage),
            )
            const solrBacked = isSolrBackedDb(db)
            const solrOver10k = solrBacked && query.data.hardLimitReached
            const pageOver10k = solrBacked
              && params.page * params.perPage >= 10_000
            const cursorMode = params.cursor !== null && !solrBacked
            const nextCursor = query.data.nextCursor ?? null
            const maxJumpPage = solrBacked
              ? Math.min(totalPages, Math.floor(10_000 / params.perPage))
              : totalPages

            return (
              <>
                <SearchToolbar
                  total={query.data.total}
                  page={params.page}
                  perPage={params.perPage}
                  sort={params.sort}
                  onSortChange={handleSortChange}
                  onPerPageChange={handlePerPageChange}
                  isOver10kLimit={solrOver10k}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  hardLimitReached={pageOver10k}
                  cursorMode={cursorMode}
                  nextCursor={nextCursor}
                  onCursorNext={handleCursorNext}
                  maxJumpPage={maxJumpPage}
                />
                <ResultCardList hits={query.data.hits} />
                <Pagination
                  page={params.page}
                  totalPages={totalPages}
                  onChange={handlePageChange}
                  hardLimitReached={pageOver10k}
                  cursorMode={cursorMode}
                  nextCursor={nextCursor}
                  onCursorNext={handleCursorNext}
                  maxJumpPage={maxJumpPage}
                />
              </>
            )
          })()}
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-80">
          <LlmAssistBox
            mode="db-list"
            db={db}
            currentQ={params.q}
            onApply={handleLlmApply}
            layout="vertical"
          />
          {params.q !== null && (
            <QueryPreview
              dsl={params.q}
              initialQ={null}
              errors={[]}
              compact
              compactVariant="textarea"
              editHref={advancedSearchHref}
              onClear={handleClear}
            />
          )}
        </aside>
      </div>
    </section>
  )
}
