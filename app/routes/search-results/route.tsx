import { useEffect, useMemo, useReducer, useState } from "react"
import { Link, useLoaderData, useNavigate } from "react-router"

import {
  AdvancedBuilder,
  advancedReducer,
  buildResultsHref,
  buildSearchHref,
  createInitialSearchFacetState,
  createInitialState,
  CrossResults,
  DEFAULT_PAGE,
  ExamplesChip,
  FacetPanel,
  fromAdvanced,
  fromSidebar,
  mergeAstAnd,
  PerDbResults,
  type PerPageValue,
  QueryPreview,
  SearchAssistant,
  searchFacetReducer,
  type SortKey,
  splitForSidebar,
  SyncStatusChip,
  toAdvanced,
  useDebouncedSerialize,
} from "~/features/search"
import { searchApiBaseUrl } from "~/lib/api"
import { useLang, useT } from "~/lib/i18n"
import {
  dbSlugToScopeKey,
  SCOPE_KEYS,
  type ScopeKey,
  scopeKeyToDbSlug,
} from "~/lib/search-scope"
import {
  Button,
  Callout,
  PageTitle,
  SearchBox,
  Section,
  SectionHeading,
  SidebarHeading,
} from "~/ui"

import { loader } from "./loader"

export { loader }

export const handle = {
  lang: undefined,
  i18n: { en: "complete" },
} as const

const SearchResultsRoute = () => {
  const data = useLoaderData<typeof loader>()
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const [qInput, setQInput] = useState(data.q)

  useEffect(() => {
    setQInput(data.q)
  }, [data.q])

  const { advancedInit, facetInit } = useMemo(() => {
    if (!data.ast) {
      return { advancedInit: createInitialState(), facetInit: createInitialSearchFacetState() }
    }
    const split = splitForSidebar(data.ast)

    return {
      advancedInit: toAdvanced(split.rest),
      facetInit: split.sidebar,
    }
  }, [data.ast])

  const [advancedState, dispatchAdvanced] = useReducer(advancedReducer, advancedInit)
  const [facetState, dispatchFacet] = useReducer(searchFacetReducer, facetInit)

  useEffect(() => {
    dispatchAdvanced({ type: "replaceRoot", root: advancedInit.root })
    dispatchFacet({ type: "replace", state: facetInit })
  }, [advancedInit, facetInit])

  const advancedAst = useMemo(() => fromAdvanced(advancedState), [advancedState])
  const facetAst = useMemo(
    () => fromSidebar(facetState, { db: data.db }),
    [facetState, data.db],
  )
  const mergedAst = useMemo(() => mergeAstAnd(advancedAst, facetAst), [advancedAst, facetAst])

  const sync = useDebouncedSerialize(mergedAst, (dsl) => {
    if (dsl === data.q) return
    navigate(
      buildResultsHref(
        {
          q: dsl,
          db: data.db,
          page: DEFAULT_PAGE,
          perPage: data.perPage,
          sort: data.sort,
        },
        lang,
      ),
      { replace: true },
    )
  })

  const handlePageChange = (nextPage: number) => {
    navigate(
      buildResultsHref(
        { q: data.q, db: data.db, page: nextPage, perPage: data.perPage, sort: data.sort },
        lang,
      ),
    )
  }
  const handlePerPageChange = (nextPerPage: PerPageValue) => {
    navigate(
      buildResultsHref(
        { q: data.q, db: data.db, page: DEFAULT_PAGE, perPage: nextPerPage, sort: data.sort },
        lang,
      ),
    )
  }
  const handleSortChange = (nextSort: SortKey) => {
    navigate(
      buildResultsHref(
        { q: data.q, db: data.db, page: DEFAULT_PAGE, perPage: data.perPage, sort: nextSort },
        lang,
      ),
    )
  }
  const handleClear = () => {
    navigate(buildSearchHref(lang))
  }
  const handleEditInBuilder = () => {
    navigate(buildSearchHref(lang))
  }
  const handleSubmitFromBox = (value: string) => {
    setQInput(value)
    navigate(buildResultsHref({ q: value, db: data.db }, lang))
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
      buildResultsHref(
        { q: data.q, db: nextDb, page: DEFAULT_PAGE, perPage: data.perPage, sort: data.sort },
        lang,
      ),
    )
  }

  return (
    <>
      <PageTitle title={t("search.pageTitle")} />
      <Section padY="sm">
        <SearchBox
          size="lg"
          value={qInput}
          placeholder={t("search.searchBoxPlaceholder")}
          ariaLabel={t("search.a11y.input")}
          submitLabel={t("search.a11y.submit")}
          scope={scopeLabel}
          scopeOptions={scopeOptions}
          scopeAriaLabel={t("search.a11y.scope")}
          onScopeChange={handleScopeChange}
          onSubmit={handleSubmitFromBox}
        />
        {data.q && (
          <div className="mt-2">
            <QueryPreview dsl={data.q} onClear={handleClear} onEdit={handleEditInBuilder} />
          </div>
        )}
        <div className="mt-2">
          <SyncStatusChip status={sync.status} onRetry={sync.retry} />
        </div>
      </Section>
      {data.q === ""
        ? (
          <Section padY="md">
            <ExamplesChip onPick={(item) => navigate(buildResultsHref({ q: item }, lang))} />
          </Section>
        )
        : data.errorKey
          ? (
            <Section padY="md">
              <Callout tone="warn" role="status">
                {data.errorKey === "parse"
                  ? t("search.errors.parseFailure")
                  : data.errorKey === "cross"
                    ? t("search.errors.crossSearchFailure")
                    : t("search.errors.dbSearchFailure")}
              </Callout>
              <div className="mt-3 flex justify-end">
                <Button kind="secondary" onClick={() => navigate(0)}>
                  {t("search.sync.retry")}
                </Button>
              </div>
            </Section>
          )
          : data.cross
            ? (
              <Section padY="md">
                <div className="grid gap-8 md:grid-cols-[var(--spacing-sidebar)_1fr]">
                  <FacetPanel state={facetState} dispatch={dispatchFacet} db={null} />
                  <div role="region" aria-label={t("search.a11y.resultsRegion")}>
                    <SectionHeading>{t("search.results.cross.heading")}</SectionHeading>
                    <CrossResults q={data.q} response={data.cross} lang={lang} />
                  </div>
                </div>
              </Section>
            )
            : data.perDb && data.db
              ? (
                <Section padY="md">
                  <div className="grid gap-8 md:grid-cols-[var(--spacing-sidebar)_1fr_var(--spacing-right-pane)]">
                    <FacetPanel state={facetState} dispatch={dispatchFacet} db={data.db} />
                    <div role="region" aria-label={t("search.a11y.resultsRegion")}>
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
                    </div>
                    <aside className="flex flex-col gap-4">
                      <SidebarHeading>{t("search.builder.heading")}</SidebarHeading>
                      <AdvancedBuilder state={advancedState} dispatch={dispatchAdvanced} />
                      <SearchAssistant
                        advancedState={advancedState}
                        dispatch={dispatchAdvanced}
                        baseUrl={searchApiBaseUrl}
                      />
                    </aside>
                  </div>
                </Section>
              )
              : null}
      <Section padY="md">
        <div className="flex justify-end">
          <Link
            to={buildSearchHref(lang)}
            className="text-fs-body-sm text-brand no-underline hover:underline"
          >
            {t("search.preview.edit")}
          </Link>
        </div>
      </Section>
    </>
  )
}

export default SearchResultsRoute
