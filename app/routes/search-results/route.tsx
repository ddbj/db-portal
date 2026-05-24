import { useEffect, useMemo, useReducer, useState } from "react"
import { Link, type LoaderFunctionArgs, useLoaderData, useNavigate } from "react-router"

import {
  AdvancedBuilder,
  advancedReducer,
  buildResultsHref,
  buildSearchHref,
  createInitialFacetState,
  createInitialState,
  CrossResults,
  type DbSlug,
  DEFAULT_PAGE,
  ExamplesChip,
  FacetPanel,
  facetReducer,
  fromAdvanced,
  fromSidebar,
  mergeAstAnd,
  PerDbResults,
  type PerPageValue,
  QueryPreview,
  readSearchParams,
  SearchAssistant,
  type SortKey,
  sortKeyToApiSort,
  splitForSidebar,
  SyncStatusChip,
  toAdvanced,
  useDebouncedSerialize,
} from "~/features/search"
import {
  crossSearch,
  type CrossSearchResponse,
  dbSearch,
  type DbSearchResponse,
  type ParseNode,
  parseQuery,
} from "~/lib/api"
import { useLang, useT } from "~/lib/i18n"
import {
  Button,
  Callout,
  PageTitle,
  SearchBox,
  Section,
  SectionHeading,
  SidebarHeading,
} from "~/ui"

export const handle = {
  lang: undefined,
  i18n: { en: "complete" },
} as const

type LoaderData = {
  q: string
  db: DbSlug | null
  page: number
  perPage: PerPageValue
  sort: SortKey
  cross: CrossSearchResponse | null
  perDb: DbSearchResponse | null
  ast: ParseNode | null
  errorKey: "parse" | "cross" | "db" | null
}

export const loader = async ({ request }: LoaderFunctionArgs): Promise<LoaderData> => {
  const url = new URL(request.url)
  const params = readSearchParams(url.searchParams)
  const envBaseUrl = process.env.DB_PORTAL_SEARCH_API_URL
  const options = envBaseUrl ? { baseUrl: envBaseUrl } : {}
  if (params.q === "") {
    return { ...params, cross: null, perDb: null, ast: null, errorKey: null }
  }
  let ast: ParseNode | null = null
  try {
    const parsed = await parseQuery({ q: params.q }, options)
    ast = parsed.ast
  } catch {
    return { ...params, cross: null, perDb: null, ast: null, errorKey: "parse" }
  }
  try {
    if (params.db === null) {
      const cross = await crossSearch({ q: params.q, topHits: 5 }, options)

      return { ...params, cross, perDb: null, ast, errorKey: null }
    }
    const apiSort = sortKeyToApiSort(params.sort)
    const perDb = await dbSearch(
      {
        q: params.q,
        db: params.db,
        page: params.page,
        perPage: params.perPage,
        ...(apiSort ? { sort: apiSort } : {}),
      },
      options,
    )

    return { ...params, cross: null, perDb, ast, errorKey: null }
  } catch {
    return {
      ...params,
      cross: null,
      perDb: null,
      ast,
      errorKey: params.db === null ? "cross" : "db",
    }
  }
}

const SEARCH_API_BASE_URL = (import.meta.env.VITE_DB_PORTAL_SEARCH_API_URL ?? "") as string

const SearchResultsRoute = () => {
  const data = useLoaderData() as LoaderData
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const [qInput, setQInput] = useState(data.q)

  useEffect(() => {
    setQInput(data.q)
  }, [data.q])

  const { advancedInit, facetInit } = useMemo(() => {
    if (!data.ast) {
      return { advancedInit: createInitialState(), facetInit: createInitialFacetState() }
    }
    const split = splitForSidebar(data.ast)

    return {
      advancedInit: toAdvanced(split.rest),
      facetInit: split.sidebar,
    }
  }, [data.ast])

  const [advancedState, dispatchAdvanced] = useReducer(advancedReducer, advancedInit)
  const [facetState, dispatchFacet] = useReducer(facetReducer, facetInit)

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
    navigate(buildResultsHref({ q: value }, lang))
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
          showScope={false}
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
              <Callout tone="warn">
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
                  <div>
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
                    <aside className="flex flex-col gap-4">
                      <SidebarHeading>{t("search.builder.heading")}</SidebarHeading>
                      <AdvancedBuilder state={advancedState} dispatch={dispatchAdvanced} />
                      <SearchAssistant
                        advancedState={advancedState}
                        dispatch={dispatchAdvanced}
                        baseUrl={SEARCH_API_BASE_URL}
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
