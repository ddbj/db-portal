import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useReducer, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router"

import {
  AdvancedSearchGroup,
  DbSwitchWarning,
  ExamplesChipList,
  QueryPreview,
} from "@/components/advanced-search"
import { LlmAssistBox } from "@/components/llm"
import {
  Button,
  Heading,
  SearchBox,
  type SelectOption,
  Tooltip,
} from "@/components/ui"
import { pickLang } from "@/i18n"
import { resolveMeta } from "@/i18n/server"
import {
  advancedSearchReducer,
  buildInitialState,
  findRootFreeTextIndex,
  setFreeTextAtRoot,
  validateNode,
} from "@/lib/advanced-search"
import type { ValidationMode } from "@/lib/advanced-search/types"
import { parseQ } from "@/lib/api"
import { DATABASES } from "@/lib/mock-data"
import { PORTAL_ORIGIN } from "@/lib/portal-origin"
import {
  advancedTreeToAst,
  astToDsl,
  parseAstToSearchAst,
  searchAstToAdvancedTree,
} from "@/lib/search-ast"
import {
  ALL_DB_VALUE,
  buildSearchUrlFull,
  type DbSelectValue,
} from "@/lib/search-url"
import { DB_ORDER, type DbId } from "@/types/db"

import type { Route } from "./+types/search"

const VALID_DB_SET: ReadonlySet<string> = new Set<string>([
  ALL_DB_VALUE,
  ...DB_ORDER,
])

const parseInitialDb = (raw: string | null): DbSelectValue => {
  if (raw === null || raw === "" || raw === ALL_DB_VALUE) return ALL_DB_VALUE
  if (VALID_DB_SET.has(raw)) return raw as DbSelectValue

  return ALL_DB_VALUE
}

const parseInitialQ = (raw: string | null): string | null => {
  const trimmed = raw?.trim() ?? ""

  return trimmed === "" ? null : trimmed
}

export const loader = ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url)
  const initialDb = parseInitialDb(url.searchParams.get("db"))
  const initialQ = parseInitialQ(url.searchParams.get("q"))

  const lang = pickLang(
    request.headers.get("Cookie"),
    request.headers.get("Accept-Language"),
  )
  const resource = resolveMeta(lang)

  const metaTitle = resource.routes.search.meta.title
  const metaDescription = resource.routes.search.meta.description

  const canonicalPath = initialDb === ALL_DB_VALUE
    ? "/search"
    : `/search?db=${initialDb}`

  return {
    lang,
    metaTitle,
    metaDescription,
    canonicalUrl: `${PORTAL_ORIGIN}${canonicalPath}`,
    initialDb,
    initialQ,
  }
}

export const meta = ({ data }: Route.MetaArgs) => {
  const fallbackCanonical = `${PORTAL_ORIGIN}/search`

  return [
    { title: data?.metaTitle ?? "検索" },
    { name: "description", content: data?.metaDescription ?? "" },
    { name: "robots", content: "index, follow" },
    {
      tagName: "link",
      rel: "canonical",
      href: data?.canonicalUrl ?? fallbackCanonical,
    },
  ]
}

const Search = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [state, dispatch] = useReducer(
    advancedSearchReducer,
    searchParams,
    (sp) => {
      const initialDb = parseInitialDb(sp.get("db"))
      const initialQ = parseInitialQ(sp.get("q"))

      return buildInitialState(initialDb, initialQ)
    },
  )

  const initialQ = state.initialQ
  const restoredRef = useRef(false)

  const parseQuery = useQuery({
    queryKey: ["parseQ", initialQ] as const,
    queryFn: ({ signal }) => {
      const dbForApi = state.db !== ALL_DB_VALUE ? (state.db as DbId) : null

      return parseQ(
        {
          q: initialQ ?? "",
          ...(dbForApi !== null && { db: dbForApi }),
        },
        signal,
      )
    },
    enabled: initialQ !== null,
    retry: false,
    staleTime: Infinity,
  })

  useEffect(() => {
    if (restoredRef.current) return
    if (!parseQuery.isSuccess) return
    restoredRef.current = true
    const ast = parseAstToSearchAst(parseQuery.data.ast)
    const tree = searchAstToAdvancedTree(ast, state.db)
    dispatch({ type: "APPLY_PARSED_TREE", tree })
  }, [parseQuery.isSuccess, parseQuery.data, state.db])

  const currentFreeText = useMemo(() => {
    const idx = findRootFreeTextIndex(state.tree)
    if (idx === -1) return ""
    const node = state.tree.children[idx]

    return node?.kind === "free_text" ? node.value : ""
  }, [state.tree])

  const dsl = useMemo(
    () => astToDsl(advancedTreeToAst(state.tree)),
    [state.tree],
  )
  const errors = useMemo(() => {
    const mode: ValidationMode = state.mode === "cross"
      ? "cross"
      : { db: state.db as DbId }

    return validateNode(state.tree, mode)
  }, [state.tree, state.mode, state.db])

  const canSearch = dsl !== "" && errors.length === 0

  const dbOptions: readonly SelectOption[] = useMemo(() => [
    { value: ALL_DB_VALUE, label: t("routes.search.dbSelector.all") },
    ...DATABASES.map((d) => ({ value: d.id, label: d.displayName })),
  ], [t])

  const buildNavigateUrl = (freeTextOverride?: string): string | null => {
    const treeWithFreeText = freeTextOverride === undefined
      ? state.tree
      : setFreeTextAtRoot(state.tree, freeTextOverride)
    const finalDsl = astToDsl(advancedTreeToAst(treeWithFreeText))
    if (finalDsl === "") return null
    const mode: ValidationMode = state.mode === "cross"
      ? "cross"
      : { db: state.db as DbId }
    const localErrors = validateNode(treeWithFreeText, mode)
    if (localErrors.length !== 0) return null

    return buildSearchUrlFull({ q: finalDsl, db: state.db })
  }

  const handleSearch = () => {
    const url = buildNavigateUrl()
    if (url === null) return
    void navigate(url)
  }

  const handleSearchBoxSubmit = (value: string) => {
    dispatch({ type: "SET_FREE_TEXT", value })
    const url = buildNavigateUrl(value)
    if (url === null) return
    void navigate(url)
  }

  const handleSearchBoxChange = (value: string) => {
    dispatch({ type: "SET_FREE_TEXT", value })
  }

  const handleDbChange = (next: string) => {
    dispatch({ type: "CHANGE_DB_REQUEST", next: next as DbSelectValue })
  }

  const handleLlmApply = async (newDsl: string): Promise<void> => {
    const dbForApi = state.db !== ALL_DB_VALUE ? (state.db as DbId) : null
    const result = await parseQ({
      q: newDsl,
      ...(dbForApi !== null && { db: dbForApi }),
    })
    const ast = parseAstToSearchAst(result.ast)
    const tree = searchAstToAdvancedTree(ast, state.db)
    dispatch({ type: "APPLY_PARSED_TREE", tree })
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Heading
          level={1}
          className="text-3xl font-semibold tracking-wide text-gray-900"
        >
          {t("routes.search.hero.title")}
        </Heading>
        <p className="text-gray-600">
          {t("routes.search.hero.subtitle")}
        </p>
      </header>

      <SearchBox
        size="large"
        value={currentFreeText}
        placeholder={t("routes.search.searchBox.placeholder")}
        hintText={t("routes.search.searchBox.hint")}
        buttonLabel={t("routes.search.actions.search")}
        dbOptions={dbOptions}
        selectedDb={state.db}
        onDbChange={handleDbChange}
        dbAriaLabel={t("routes.search.searchBox.dbSelectorAria")}
        onChange={handleSearchBoxChange}
        onSubmit={handleSearchBoxSubmit}
      />

      <ExamplesChipList
        onApply={(example) => dispatch({ type: "APPLY_EXAMPLE", example })}
      />

      <DbSwitchWarning
        state={state}
        onConfirm={() => dispatch({ type: "CONFIRM_DB_CHANGE" })}
        onCancel={() => dispatch({ type: "CANCEL_DB_CHANGE" })}
      />

      <QueryPreview
        dsl={dsl}
        initialQ={state.initialQ}
        errors={errors}
      />

      <LlmAssistBox
        mode="search"
        db={state.db === ALL_DB_VALUE ? null : (state.db as DbId)}
        currentQ={dsl !== "" ? dsl : state.initialQ}
        onApply={handleLlmApply}
      />

      <section className="flex flex-col gap-2">
        <Heading level={2}>
          {t("routes.search.builder.heading")}
        </Heading>
        <AdvancedSearchGroup
          group={state.tree}
          path={[]}
          depth={0}
          db={state.db}
          dispatch={dispatch}
        />
      </section>

      <div className="flex justify-end gap-2">
        <Button variant="tertiary" onClick={() => dispatch({ type: "RESET" })}>
          {t("routes.search.actions.reset")}
        </Button>
        {canSearch
          ? (
            <Button variant="primary" onClick={handleSearch}>
              {t("routes.search.actions.search")}
            </Button>
          )
          : (
            <Tooltip
              content={dsl === ""
                ? t("routes.search.actions.disabledReason.empty")
                : t("routes.search.actions.disabledReason.invalid", {
                  count: errors.length,
                })}
              side="top"
            >
              <span tabIndex={0} className="inline-block">
                <Button variant="primary" disabled onClick={handleSearch}>
                  {t("routes.search.actions.search")}
                </Button>
              </span>
            </Tooltip>
          )}
      </div>
    </section>
  )
}

export default Search
