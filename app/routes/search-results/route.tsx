import { Suspense, useCallback, useEffect, useMemo, useReducer, useState } from "react"
import { Await, useLoaderData, useNavigate } from "react-router"

import {
  advancedReducer,
  buildResultsHref,
  buildSearchHref,
  createInitialSearchFacetState,
  createInitialState,
  CrossResults,
  DEFAULT_PAGE,
  FacetPanel,
  fromAdvanced,
  fromSidebar,
  identityAst,
  isIdentityAst,
  mergeAstAnd,
  NavigableSearchInput,
  parseDslToAst,
  PerDbResults,
  type PerPageValue,
  searchFacetReducer,
  SearchResultsSkeleton,
  serializeAstToDsl,
  type SortKey,
  splitForSidebar,
  splitFreeText,
  SwitchableQueryPreview,
  SyncStatusChip,
  toAdvanced,
  useDebouncedSerialize,
  useSearchPending,
  useSidebarFacets,
} from "~/features/search"
import { type ParseNode, searchApiBaseUrl } from "~/lib/api"
import { pageTitleMeta } from "~/lib/content"
import { useLang, useT } from "~/lib/i18n"
import {
  type DbSlug,
  dbSlugToScopeKey,
  SCOPE_KEYS,
  type ScopeKey,
  scopeKeyToDbSlug,
} from "~/lib/search-scope"
import { Button, Callout, Section } from "~/ui"

import { loader, type SearchResult } from "./loader"

export { loader }

export const handle = {
  i18n: { en: "complete" },
  titleSegments: ["Search", "Results"],
} as const

export const meta = pageTitleMeta

const SearchResultsRoute = () => {
  const data = useLoaderData<typeof loader>()
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const search = useSearchPending()
  // Sidebar facets: the loader's cached match_all shows instantly, then the q-aware
  // counts replace it. Fetching client-side keeps a heavy aggregation off the SSR
  // abort budget, so the facet rows no longer vanish when it runs long.
  const sidebarFacets = useSidebarFacets(data.db, data.q, data.facets, searchApiBaseUrl)

  // Restore the committed query into its three independent surfaces: the
  // free-text keyword (shown in the box), the facet sidebar, and the held
  // structured remainder (kept for re-serialization, shown only in the preview
  // graph). The keyword AST is folded back into the live sync so editing a facet
  // never drops the free text.
  const { keywordInit, keywordAst, advancedInit, facetInit } = useMemo(() => {
    if (!data.ast) {
      return {
        keywordInit: "",
        keywordAst: identityAst,
        advancedInit: createInitialState(),
        facetInit: createInitialSearchFacetState(),
      }
    }
    const ft = splitFreeText(data.ast)
    const split = splitForSidebar(ft.rest, data.db)

    return {
      keywordInit: ft.keyword,
      keywordAst: ft.keywordAst,
      advancedInit: toAdvanced(split.rest),
      facetInit: split.sidebar,
    }
  }, [data.ast, data.db])

  const [keyword, setKeyword] = useState(keywordInit)
  const [keywordParseError, setKeywordParseError] = useState(false)
  const [advancedState, dispatchAdvanced] = useReducer(advancedReducer, advancedInit)
  const [facetState, dispatchFacet] = useReducer(searchFacetReducer, facetInit)

  useEffect(() => {
    setKeyword(keywordInit)
    setKeywordParseError(false)
    dispatchAdvanced({ type: "replaceRoot", root: advancedInit.root })
    dispatchFacet({ type: "replace", state: facetInit })
  }, [keywordInit, advancedInit, facetInit])

  const advancedAst = useMemo(() => fromAdvanced(advancedState), [advancedState])
  const facetAst = useMemo(
    () => fromSidebar(facetState, { db: data.db }),
    [facetState, data.db],
  )
  // The keyword is the committed free text (re-applied on submit), so facet
  // edits serialize keyword + held structured + facets together.
  const mergedAst = useMemo(
    () => mergeAstAnd(keywordAst, advancedAst, facetAst),
    [keywordAst, advancedAst, facetAst],
  )

  const sync = useDebouncedSerialize(mergedAst, (dsl) => {
    if (dsl === data.q) return
    navigate(
      buildResultsHref({
        q: dsl,
        db: data.db,
        page: DEFAULT_PAGE,
        perPage: data.perPage,
        sort: data.sort,
      }),
      { replace: true, preventScrollReset: true },
    )
  }, searchApiBaseUrl, data.db)

  const { flush: flushSync } = sync
  const dispatchFacetWithFlush = useCallback(
    (action: Parameters<typeof dispatchFacet>[0]) => {
      dispatchFacet(action)
      if (action.type === "toggleFacet") flushSync()
    },
    [flushSync],
  )

  const handlePageChange = (nextPage: number) => {
    navigate(
      buildResultsHref({ q: data.q, db: data.db, page: nextPage, perPage: data.perPage, sort: data.sort }),
    )
  }
  const handlePerPageChange = (nextPerPage: PerPageValue) => {
    navigate(
      buildResultsHref({ q: data.q, db: data.db, page: DEFAULT_PAGE, perPage: nextPerPage, sort: data.sort }),
    )
  }
  const handleSortChange = (nextSort: SortKey) => {
    navigate(
      buildResultsHref({ q: data.q, db: data.db, page: DEFAULT_PAGE, perPage: data.perPage, sort: nextSort }),
    )
  }

  // The keyword box runs the search directly: parse the keyword, fold it into the
  // held structured conditions and facets, serialize, then navigate (push).
  const runKeywordSearch = async (kw: string) => {
    search.begin()
    let combined = mergeAstAnd(advancedAst, facetAst)
    const trimmed = kw.trim()
    if (trimmed.length > 0) {
      try {
        const parsed = await parseDslToAst(trimmed, { baseUrl: searchApiBaseUrl })
        combined = mergeAstAnd(parsed, advancedAst, facetAst)
      } catch {
        setKeywordParseError(true)
        search.end()

        return
      }
    }
    setKeywordParseError(false)
    let dsl = ""
    if (!isIdentityAst(combined)) {
      try {
        dsl = await serializeAstToDsl(combined, { baseUrl: searchApiBaseUrl, db: data.db })
      } catch {
        // Serialize is a system-side failure the user cannot fix; the sync chip
        // surfaces it. Don't navigate and don't raise a warning here.
        search.end()

        return
      }
    }
    if (dsl === data.q) {
      search.end()

      return
    }
    navigate(buildResultsHref({ q: dsl, db: data.db }))
  }

  // The AI proposal is applied without review: serialize the validated AST and
  // navigate. append folds the current query server-side, new replaces it. The
  // DB comes from the generation: per-DB pages stay locked to data.db; on cross
  // the BFF-derived DB (generatedDb) routes the result (e.g. adding a Tier-3
  // condition lands on that DB).
  const handleGenerated = async (ast: ParseNode, generatedDb: DbSlug | null) => {
    search.begin()
    let dsl = ""
    if (!isIdentityAst(ast)) {
      try {
        dsl = await serializeAstToDsl(ast, { baseUrl: searchApiBaseUrl, db: generatedDb })
      } catch {
        // Serialize failure is system-side; leave the current results in place.
        search.end()

        return
      }
    }
    if (dsl === data.q && generatedDb === data.db) {
      search.end()

      return
    }
    navigate(buildResultsHref({ q: dsl, db: generatedDb }))
  }

  const handleKeywordChange = (value: string) => {
    setKeyword(value)
    if (keywordParseError) setKeywordParseError(false)
  }

  // Clear the query but stay on the results page: dropping q falls back to
  // match_all (the full set) for the current db.
  const handleClear = () => {
    navigate(buildResultsHref({ db: data.db }))
  }
  const handleEditInBuilder = () => {
    navigate(buildSearchHref({ q: data.q, db: data.db }))
  }

  const scopeOptions = useMemo(
    () => SCOPE_KEYS.map((key) => t(`search.scope.${key}`)),
    [t],
  )
  const scopeLabel = t(`search.scope.${dbSlugToScopeKey(data.db)}`)
  const labelToKey = useMemo(() => {
    const map = new Map<string, ScopeKey>()
    SCOPE_KEYS.forEach((key) => map.set(t(`search.scope.${key}`), key))

    return map
  }, [t])
  const handleScopeChange = (label: string) => {
    const key = labelToKey.get(label)
    if (key === undefined) return
    const nextDb = scopeKeyToDbSlug(key)
    if (nextDb === data.db) return
    navigate(
      buildResultsHref({ q: data.q, db: nextDb, page: DEFAULT_PAGE, perPage: data.perPage, sort: data.sort }),
    )
  }

  const retryAction = (
    <Button kind="secondary" size="sm" onClick={() => navigate(0)}>
      {t("search.sync.retry")}
    </Button>
  )

  const facetPanel = (
    <FacetPanel
      state={facetState}
      dispatch={dispatchFacetWithFlush}
      db={data.db}
      facets={sidebarFacets.facets}
      loading={sidebarFacets.loading}
    />
  )

  return (
    <>
      <Section padTop="mid" padBottom="none">
        <NavigableSearchInput
          keyword={keyword}
          onKeywordChange={handleKeywordChange}
          onSearch={(value) => void runKeywordSearch(value)}
          scope={scopeLabel}
          scopeOptions={scopeOptions}
          onScopeChange={handleScopeChange}
          invalid={keywordParseError}
          allowAppend
          appendCurrentAst={data.ast ?? undefined}
          lockedDb={data.db ?? undefined}
          onGenerated={(ast, _mode, generatedDb) => void handleGenerated(ast, generatedDb)}
          showExamples={false}
          searchPending={search.pending}
        />
        <div className="mt-2.5">
          <SwitchableQueryPreview
            dsl={data.q}
            ast={data.ast}
            {...(data.q ? { onClear: handleClear } : {})}
            onEdit={handleEditInBuilder}
          />
        </div>
        {(sync.status === "syncing" || sync.status === "failed") && (
          <div className="mt-2">
            <SyncStatusChip status={sync.status} />
          </div>
        )}
      </Section>
      {data.parseError
        ? (
          <Section padTop="sm" padBottom="lg">
            <Callout tone="warn" role="status" action={retryAction}>
              {t("search.errors.parseFailure")}
            </Callout>
          </Section>
        )
        : (
          <Suspense
            fallback={
              <Section padTop="sm" padBottom="lg">
                <SearchResultsSkeleton db={data.db} />
              </Section>
            }
          >
            <Await resolve={data.results}>
              {(result: SearchResult) =>
                result.kind === "error"
                  ? (
                    <Section padTop="sm" padBottom="lg">
                      <Callout tone="warn" role="status" action={retryAction}>
                        {result.errorKey === "cross"
                          ? t("search.errors.crossSearchFailure")
                          : t("search.errors.dbSearchFailure")}
                      </Callout>
                    </Section>
                  )
                  : (
                    <Section padTop="sm" padBottom="lg">
                      <div className="grid gap-6 sm:grid-cols-[var(--spacing-sidebar)_1fr]">
                        {facetPanel}
                        <div role="region" aria-label={t("search.a11y.resultsRegion")} className="min-w-0">
                          {result.kind === "cross"
                            ? <CrossResults q={data.q} response={result.cross} />
                            : data.db
                              ? (
                                <PerDbResults
                                  db={data.db}
                                  response={result.perDb}
                                  lang={lang}
                                  page={data.page}
                                  perPage={data.perPage}
                                  sort={data.sort}
                                  onPageChange={handlePageChange}
                                  onPerPageChange={handlePerPageChange}
                                  onSortChange={handleSortChange}
                                />
                              )
                              : null}
                        </div>
                      </div>
                    </Section>
                  )}
            </Await>
          </Suspense>
        )}
    </>
  )
}

export default SearchResultsRoute
