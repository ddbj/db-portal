import { useEffect, useMemo, useReducer, useState } from "react"
import { useLoaderData, useNavigate } from "react-router"

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
  serializeAstToDsl,
  type SortKey,
  splitForSidebar,
  splitFreeText,
  SwitchableQueryPreview,
  SyncStatusChip,
  toAdvanced,
  useDebouncedSerialize,
  useSearchPending,
} from "~/features/search"
import { type ParseNode, searchApiBaseUrl } from "~/lib/api"
import { pageTitleMeta } from "~/lib/content"
import { useLang, useT } from "~/lib/i18n"
import {
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
  const search = useSearchPending()

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
    const split = splitForSidebar(ft.rest)

    return {
      keywordInit: ft.keyword,
      keywordAst: ft.keywordAst,
      advancedInit: toAdvanced(split.rest),
      facetInit: split.sidebar,
    }
  }, [data.ast])

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
  }, searchApiBaseUrl)

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
        dsl = await serializeAstToDsl(combined, { baseUrl: searchApiBaseUrl })
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
  // navigate. append folds the current query server-side, new replaces it.
  const handleGenerated = async (ast: ParseNode) => {
    search.begin()
    let dsl = ""
    if (!isIdentityAst(ast)) {
      try {
        dsl = await serializeAstToDsl(ast, { baseUrl: searchApiBaseUrl })
      } catch {
        // Serialize failure is system-side; leave the current results in place.
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

  const handleKeywordChange = (value: string) => {
    setKeyword(value)
    if (keywordParseError) setKeywordParseError(false)
  }

  // Clear the query but stay on the results page (empty state, current db kept).
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
          baseUrl={searchApiBaseUrl}
          invalid={keywordParseError}
          allowAppend
          appendCurrentAst={data.ast ?? undefined}
          onGenerated={(ast) => void handleGenerated(ast)}
          searchPending={search.pending}
        />
        {data.q && (
          <div className="mt-2.5">
            <SwitchableQueryPreview
              dsl={data.q}
              ast={data.ast}
              onClear={handleClear}
              onEdit={handleEditInBuilder}
            />
          </div>
        )}
        <div className="mt-2">
          <SyncStatusChip status={sync.status} />
        </div>
      </Section>
      {data.q === ""
        ? null
        : data.errorKey
          ? (
            <Section padTop="block" padBottom="lg">
              <Callout
                tone="warn"
                role="status"
                action={
                  <Button kind="secondary" size="sm" onClick={() => navigate(0)}>
                    {t("search.sync.retry")}
                  </Button>
                }
              >
                {data.errorKey === "parse"
                  ? t("search.errors.parseFailure")
                  : data.errorKey === "cross"
                    ? t("search.errors.crossSearchFailure")
                    : t("search.errors.dbSearchFailure")}
              </Callout>
            </Section>
          )
          : data.cross || (data.perDb && data.db)
            ? (
              <Section padTop="block" padBottom="lg">
                <div className="grid gap-6 sm:grid-cols-[var(--spacing-sidebar)_1fr]">
                  <FacetPanel state={facetState} dispatch={dispatchFacet} db={data.db} />
                  <div role="region" aria-label={t("search.a11y.resultsRegion")} className="min-w-0">
                    {data.cross
                      ? <CrossResults q={data.q} response={data.cross} />
                      : data.perDb && data.db
                        ? (
                          <PerDbResults
                            db={data.db}
                            response={data.perDb}
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
            )
            : null}
    </>
  )
}

export default SearchResultsRoute
