import { useMemo, useReducer } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router"

import {
  AdvancedSearchGroup,
  DbSelector,
  DbSwitchWarning,
  ExamplesChipList,
  QueryPreview,
} from "@/components/advanced-search"
import { Button, Heading } from "@/components/ui"
import en from "@/content/locales/en.json"
import ja from "@/content/locales/ja.json"
import { pickLang } from "@/i18n"
import {
  advancedSearchReducer,
  buildInitialState,
  nodeToDsl,
  validateNode,
} from "@/lib/advanced-search"
import type { ValidationMode } from "@/lib/advanced-search/types"
import {
  ALL_DB_VALUE,
  buildSearchUrlFull,
  type DbSelectValue,
} from "@/lib/search-url"
import { DB_ORDER, type DbId } from "@/types/db"

import type { Route } from "./+types/advanced-search"

const PORTAL_ORIGIN = "https://portal.ddbj.nig.ac.jp"

const VALID_DB_SET: ReadonlySet<string> = new Set<string>([
  ALL_DB_VALUE,
  ...DB_ORDER,
])

const parseInitialDb = (raw: string | null): DbSelectValue => {
  if (raw === null || raw === "" || raw === ALL_DB_VALUE) return ALL_DB_VALUE
  if (VALID_DB_SET.has(raw)) return raw as DbSelectValue

  return ALL_DB_VALUE
}

const parseInitialAdv = (raw: string | null): string | null => {
  const trimmed = raw?.trim() ?? ""

  return trimmed === "" ? null : trimmed
}

export const loader = ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url)
  const initialDb = parseInitialDb(url.searchParams.get("db"))
  const initialAdv = parseInitialAdv(url.searchParams.get("adv"))

  const lang = pickLang(
    request.headers.get("Cookie"),
    request.headers.get("Accept-Language"),
  )
  const resource = lang === "ja" ? ja : en

  const metaTitle = resource.routes.advancedSearch.meta.title
  const metaDescription = resource.routes.advancedSearch.meta.description

  const canonicalPath = initialDb === ALL_DB_VALUE
    ? "/advanced-search"
    : `/advanced-search?db=${initialDb}`

  return {
    lang,
    metaTitle,
    metaDescription,
    canonicalUrl: `${PORTAL_ORIGIN}${canonicalPath}`,
    initialDb,
    initialAdv,
  }
}

export const meta = ({ data }: Route.MetaArgs) => {
  const fallbackCanonical = `${PORTAL_ORIGIN}/advanced-search`

  return [
    { title: data?.metaTitle ?? "詳細検索" },
    { name: "description", content: data?.metaDescription ?? "" },
    { name: "robots", content: "index, follow" },
    {
      tagName: "link",
      rel: "canonical",
      href: data?.canonicalUrl ?? fallbackCanonical,
    },
  ]
}

const AdvancedSearch = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [state, dispatch] = useReducer(
    advancedSearchReducer,
    searchParams,
    (sp) => {
      const initialDb = parseInitialDb(sp.get("db"))
      const initialAdv = parseInitialAdv(sp.get("adv"))

      return buildInitialState(initialDb, initialAdv)
    },
  )

  const dsl = useMemo(() => nodeToDsl(state.tree), [state.tree])
  const errors = useMemo(() => {
    const mode: ValidationMode = state.mode === "cross"
      ? "cross"
      : { db: state.db as DbId }

    return validateNode(state.tree, mode)
  }, [state.tree, state.mode, state.db])

  const canSearch = dsl !== "" && errors.length === 0

  const handleSearch = () => {
    if (!canSearch) return
    void navigate(buildSearchUrlFull({ adv: dsl, db: state.db }))
  }

  const handleDbChange = (next: DbSelectValue) => {
    dispatch({ type: "CHANGE_DB_REQUEST", next })
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Heading
          level={1}
          className="text-3xl font-semibold tracking-wide text-gray-900"
        >
          {t("routes.advancedSearch.hero.title")}
        </Heading>
        <p className="text-gray-600">
          {t("routes.advancedSearch.hero.subtitle")}
        </p>
      </header>

      <DbSelector value={state.db} onChange={handleDbChange} />

      <DbSwitchWarning
        state={state}
        onConfirm={() => dispatch({ type: "CONFIRM_DB_CHANGE" })}
        onCancel={() => dispatch({ type: "CANCEL_DB_CHANGE" })}
      />

      <section className="flex flex-col gap-2">
        <Heading level={2}>
          {t("routes.advancedSearch.builder.heading")}
        </Heading>
        <AdvancedSearchGroup
          group={state.tree}
          path={[]}
          depth={0}
          db={state.db}
          dispatch={dispatch}
        />
      </section>

      <QueryPreview
        dsl={dsl}
        initialAdv={state.initialAdv}
        errors={errors}
      />

      <ExamplesChipList
        onApply={(example) => dispatch({ type: "APPLY_EXAMPLE", example })}
      />

      <div className="flex justify-end gap-2">
        <Button variant="tertiary" onClick={() => dispatch({ type: "RESET" })}>
          {t("routes.advancedSearch.actions.reset")}
        </Button>
        <Button
          variant="primary"
          disabled={!canSearch}
          onClick={handleSearch}
        >
          {t("routes.advancedSearch.actions.search")}
        </Button>
      </div>
    </section>
  )
}

export default AdvancedSearch
