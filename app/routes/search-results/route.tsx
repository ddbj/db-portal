import { useEffect, useMemo, useReducer, useRef, useState } from "react"
import { useLoaderData, useLocation, useNavigate } from "react-router"

import {
  advancedReducer,
  buildResultsHref,
  buildSearchHref,
  createInitialSearchFacetState,
  createInitialState,
  CrossResults,
  DEFAULT_PAGE,
  ExactMatchCard,
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
  type SearchResultsNavState,
  SearchResultsSkeleton,
  serializeAstToDsl,
  type SortKey,
  splitForSidebar,
  splitFreeText,
  SwitchableQueryPreview,
  toAdvanced,
  useSearchResults,
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

import { loader } from "./loader"

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
  const location = useLocation()

  // The hero (or any caller) may hand the page a raw AI prompt via navigation
  // state so the box can land in AI mode with the user's natural language still
  // visible. Snapshot it once and clear history.state below so a reload falls
  // back to keyword mode.
  const [pendingAi] = useState(() => {
    const s = (location.state as SearchResultsNavState | null)?.ai
    return s ? { prompt: s.prompt, aiMode: s.aiMode } : null
  })
  useEffect(() => {
    if (!(location.state as SearchResultsNavState | null)?.ai) return
    navigate(location.pathname + location.search, {
      replace: true,
      state: null,
      preventScrollReset: true,
    })
    // Run once on mount; later location changes are handled by the existing
    // navigation flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Seed values for the committed query, split out of the AST the loader parsed from
  // a shared `?q=`: the free-text keyword (shown in the box), the held structured
  // remainder (preview graph), and the facet sidebar.
  const { keywordInit, keywordAstInit, advancedInit, facetInit } = useMemo(() => {
    if (!data.ast) {
      return {
        keywordInit: "",
        keywordAstInit: identityAst,
        advancedInit: createInitialState(),
        facetInit: createInitialSearchFacetState(),
      }
    }
    const ft = splitFreeText(data.ast)
    const split = splitForSidebar(ft.rest, data.db)

    return {
      keywordInit: ft.keyword,
      keywordAstInit: ft.keywordAst,
      advancedInit: toAdvanced(split.rest),
      facetInit: split.sidebar,
    }
  }, [data.ast, data.db])

  // Client SSOT for the live query. The committed free-text AST is re-applied on
  // submit, so editing a facet never drops the keyword; paging is held here too so a
  // query edit can reset it without a round trip.
  const [keyword, setKeyword] = useState(keywordInit)
  const [keywordParseError, setKeywordParseError] = useState(false)
  const [keywordBusy, setKeywordBusy] = useState(false)
  const [committedKeywordAst, setCommittedKeywordAst] = useState<ParseNode>(keywordAstInit)
  const [advancedState, dispatchAdvanced] = useReducer(advancedReducer, advancedInit)
  const [facetState, dispatchFacet] = useReducer(searchFacetReducer, facetInit)
  const [page, setPage] = useState(data.page)
  const [perPage, setPerPage] = useState(data.perPage)
  const [sort, setSort] = useState(data.sort)

  const advancedAst = useMemo(() => fromAdvanced(advancedState), [advancedState])
  const facetAst = useMemo(
    () => fromSidebar(facetState, { db: data.db }),
    [facetState, data.db],
  )
  const mergedAst = useMemo(
    () => mergeAstAnd(committedKeywordAst, advancedAst, facetAst),
    [committedKeywordAst, advancedAst, facetAst],
  )

  // The search, keyed on the live intent (scope + AST + paging): any edit refetches
  // at once with a skeleton, and one response carries hits, the q-aware facets, and
  // the `dsl` to project into `?q=`.
  const results = useSearchResults(
    data.db,
    mergedAst,
    { page, perPage, sort },
    data.facets,
    !data.parseError,
    searchApiBaseUrl,
  )

  // The URL is a derived projection, not a gate: once the search resolves, the echoed
  // `dsl` (+ paging) is written into `?q=` (replace; a keyword submit / clear pushes a
  // history entry). A failed / pending search leaves `dsl` null, so the shared URL
  // stays on the last good query. AST-driving edits already coalesce at the input
  // (text fields are debounced one layer down), so the projection runs immediately.
  const lastSyncedRef = useRef({ q: data.q, db: data.db })
  const pushNextRef = useRef(false)
  useEffect(() => {
    if (data.parseError) return
    // 外部 URL 変化 (Back / 共有リンク / SPA nav) の直後は state が data に追い
    // つく前なのでここでは write しない。 restore effect が lastSyncedRef を
    // data に合わせた次の render で通過する。 この gate が無いと Back で古い
    // state 由来の URL に navigate(replace) してしまい、 直前の履歴を上書きする。
    if (data.q !== lastSyncedRef.current.q || data.db !== lastSyncedRef.current.db) return
    const dsl = results.dsl
    if (dsl === null) return
    if (dsl === data.q && page === data.page && perPage === data.perPage && sort === data.sort) {
      lastSyncedRef.current = { q: dsl, db: data.db }

      return
    }
    lastSyncedRef.current = { q: dsl, db: data.db }
    const push = pushNextRef.current
    pushNextRef.current = false
    navigate(
      buildResultsHref({ q: dsl, db: data.db, page, perPage, sort }),
      push ? { preventScrollReset: true } : { replace: true, preventScrollReset: true },
    )
  }, [results.dsl, page, perPage, sort, data.q, data.page, data.perPage, data.sort, data.db, data.parseError, navigate])

  // Restore client state from a genuine navigation (cold load / back-forward / scope
  // change / clear elsewhere). Skip our own URL echo so a rapid in-flight edit is not
  // clobbered by the projection coming back through the loader.
  useEffect(() => {
    if (data.q === lastSyncedRef.current.q && data.db === lastSyncedRef.current.db) return
    lastSyncedRef.current = { q: data.q, db: data.db }
    setKeyword(keywordInit)
    setKeywordParseError(false)
    setKeywordBusy(false)
    setCommittedKeywordAst(keywordAstInit)
    dispatchAdvanced({ type: "replaceRoot", root: advancedInit.root })
    dispatchFacet({ type: "replace", state: facetInit })
    setPage(data.page)
    setPerPage(data.perPage)
    setSort(data.sort)
  }, [data.q, data.db, data.page, data.perPage, data.sort, keywordInit, keywordAstInit, advancedInit, facetInit])

  const handlePageChange = (nextPage: number) => setPage(nextPage)
  const handlePerPageChange = (nextPerPage: PerPageValue) => {
    setPerPage(nextPerPage)
    setPage(DEFAULT_PAGE)
  }
  const handleSortChange = (nextSort: SortKey) => {
    setSort(nextSort)
    setPage(DEFAULT_PAGE)
  }
  // A facet / text / range / date edit shrinks (or shifts) the result set, so the
  // current page can fall out of range; reset to the first page like the other
  // result-shaping controls. Internal `replace` (state restore) dispatches the
  // raw reducer instead, so it does not reset paging.
  const handleFacetEdit = (action: Parameters<typeof dispatchFacet>[0]) => {
    dispatchFacet(action)
    setPage(DEFAULT_PAGE)
  }

  // The keyword box commits the free text into the live query: parse it, fold it in
  // (the search refetches from the merged AST), reset paging, and push a history
  // entry once the URL syncs. The held structured conditions and facets are kept.
  const runKeywordSearch = async (kw: string) => {
    const trimmed = kw.trim()
    if (trimmed.length === 0) {
      setKeywordParseError(false)
      pushNextRef.current = true
      setPage(DEFAULT_PAGE)
      setCommittedKeywordAst(identityAst)

      return
    }
    setKeywordBusy(true)
    try {
      // Validator scope must match the URL/loader path: per-DB results admit Tier-3
      // fields, cross mode rejects them. docs/search.md § AST と入出力経路.
      const parsed = await parseDslToAst(trimmed, { baseUrl: searchApiBaseUrl, db: data.db })
      setKeywordParseError(false)
      pushNextRef.current = true
      setPage(DEFAULT_PAGE)
      setCommittedKeywordAst(parsed)
    } catch {
      setKeywordParseError(true)
    } finally {
      setKeywordBusy(false)
    }
  }

  // The AI proposal is applied without review. It can re-scope the result (per-DB
  // pages stay locked to data.db; on cross the BFF-derived generatedDb routes it), so
  // it serializes and navigates rather than mutating in place, and the destination
  // rebuilds its surfaces from the URL.
  const handleGenerated = async (ast: ParseNode, generatedDb: DbSlug | null) => {
    setKeywordBusy(true)
    let dsl = ""
    if (!isIdentityAst(ast)) {
      try {
        dsl = await serializeAstToDsl(ast, { baseUrl: searchApiBaseUrl, db: generatedDb })
      } catch {
        // Serialize failure is system-side; leave the current results in place.
        setKeywordBusy(false)

        return
      }
    }
    setKeywordBusy(false)
    if (dsl === data.q && generatedDb === data.db) return
    navigate(buildResultsHref({ q: dsl, db: generatedDb }))
  }

  const handleKeywordChange = (value: string) => {
    setKeyword(value)
    if (keywordParseError) setKeywordParseError(false)
  }

  // Clear the query but stay on the results page: reset every surface to empty so the
  // search falls back to match_all (the full set) for the current db.
  const handleClear = () => {
    setKeyword("")
    setKeywordParseError(false)
    setCommittedKeywordAst(identityAst)
    dispatchAdvanced({ type: "replaceRoot", root: createInitialState().root })
    dispatchFacet({ type: "replace", state: createInitialSearchFacetState() })
    setPage(DEFAULT_PAGE)
    pushNextRef.current = true
  }
  const handleEditInBuilder = () => {
    navigate(buildSearchHref({ q: results.dsl ?? data.q, db: data.db }))
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
  const resultsRetryAction = (
    <Button kind="secondary" size="sm" onClick={() => results.refetch()}>
      {t("search.sync.retry")}
    </Button>
  )

  const result = results.result
  // The live query graph drives the preview and the AI "append" context; an identity
  // AST (empty query) shows the placeholder and offers no clear action.
  const liveQuery = isIdentityAst(mergedAst) ? undefined : mergedAst

  const facetPanel = (
    <FacetPanel
      state={facetState}
      dispatch={handleFacetEdit}
      db={data.db}
      facets={results.facets}
      loading={results.facets === null}
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
          appendCurrentAst={liveQuery}
          lockedDb={data.db ?? undefined}
          onGenerated={(ast, _mode, generatedDb, _prompt) =>
            void handleGenerated(ast, generatedDb)}
          showExamples={false}
          searchPending={keywordBusy}
          initialMode={pendingAi ? "ai" : "keyword"}
          initialAiInput={pendingAi?.prompt}
          initialAiMode={pendingAi?.aiMode}
        />
        <div className="mt-2.5">
          <SwitchableQueryPreview
            dsl={results.dsl ?? data.q}
            ast={liveQuery ?? data.ast}
            {...(liveQuery ? { onClear: handleClear } : {})}
            onEdit={handleEditInBuilder}
          />
        </div>
      </Section>
      {data.parseError
        ? (
          <Section padTop="sm" padBottom="lg">
            <Callout tone="warn" role="status" action={retryAction}>
              {t("search.errors.parseFailure")}
            </Callout>
          </Section>
        )
        : results.isError
          ? (
            <Section padTop="sm" padBottom="lg">
              <Callout tone="warn" role="status" action={resultsRetryAction}>
                {data.db === null
                  ? t("search.errors.crossSearchFailure")
                  : t("search.errors.dbSearchFailure")}
              </Callout>
            </Section>
          )
          : results.isPending || result === null
            ? (
              <Section padTop="sm" padBottom="lg">
                <SearchResultsSkeleton db={data.db} />
              </Section>
            )
            : (
              <Section padTop="sm" padBottom="lg">
                <div className="grid gap-section-mid sm:grid-cols-[var(--spacing-sidebar)_1fr]">
                  {facetPanel}
                  <div role="region" aria-label={t("search.a11y.resultsRegion")} className="min-w-0">
                    {result.kind === "cross"
                      ? (
                        <>
                          {result.exactMatch && <ExactMatchCard match={result.exactMatch} lang={lang} />}
                          <CrossResults q={results.dsl ?? data.q} response={result.cross} />
                        </>
                      )
                      : data.db
                        ? (
                          <PerDbResults
                            db={data.db}
                            response={result.perDb}
                            lang={lang}
                            page={page}
                            perPage={perPage}
                            sort={sort}
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
    </>
  )
}

export default SearchResultsRoute
