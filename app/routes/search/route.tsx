import { useMemo, useReducer, useState } from "react"
import { useNavigate } from "react-router"

import {
  AdvancedBuilder,
  advancedReducer,
  buildResultsHref,
  createInitialState,
  ExamplesChip,
  fromAdvanced,
  isIdentityAst,
  mergeAstAnd,
  parseDslToAst,
  QueryPreview,
  SearchAssistant,
  serializeAstToDsl,
  SyncStatusChip,
  useDebouncedSerialize,
} from "~/features/search"
import { searchApiBaseUrl } from "~/lib/api"
import { useT } from "~/lib/i18n"
import { SCOPE_KEYS, type ScopeKey, scopeKeyToDbSlug } from "~/lib/search-scope"
import {
  Button,
  Callout,
  PageTitle,
  SearchBox,
  Section,
  SectionHeading,
} from "~/ui"

export const handle = {
  i18n: { en: "complete" },
} as const

const SearchRoute = () => {
  const t = useT()
  const navigate = useNavigate()
  const [qInput, setQInput] = useState("")
  const [queryError, setQueryError] = useState(false)
  const [scope, setScope] = useState<ScopeKey>("all")
  const [advancedState, dispatch] = useReducer(advancedReducer, undefined, createInitialState)
  const advancedAst = fromAdvanced(advancedState)
  const sync = useDebouncedSerialize(advancedAst)
  const scopeOptions = useMemo(
    () => SCOPE_KEYS.map((key) => t(`search.scope.${key}`)),
    [t],
  )
  const scopeLabel = t(`search.scope.${scope}`)
  const labelToKey = useMemo(() => {
    const map = new Map<string, ScopeKey>()
    SCOPE_KEYS.forEach((key) => map.set(t(`search.scope.${key}`), key))
    return map
  }, [t])
  const db = scopeKeyToDbSlug(scope)

  const runSearch = async (query: string = qInput) => {
    let combined = advancedAst
    if (query.trim().length > 0) {
      try {
        const parsed = await parseDslToAst(query, { baseUrl: searchApiBaseUrl })
        combined = mergeAstAnd(parsed, advancedAst)
      } catch {
        // Surface the syntax error here so the user can fix it; navigating to
        // results with the raw query would only re-parse and fail again.
        setQueryError(true)

        return
      }
    }
    setQueryError(false)
    if (isIdentityAst(combined)) {
      navigate(buildResultsHref({ db }))

      return
    }
    try {
      const dsl = await serializeAstToDsl(combined, { baseUrl: searchApiBaseUrl })
      navigate(buildResultsHref({ q: dsl, db }))
    } catch {
      setQueryError(true)
    }
  }

  const handleClear = () => {
    setQInput("")
    setQueryError(false)
    setScope("all")
    dispatch({ type: "clear" })
  }

  return (
    <>
      <PageTitle title={t("search.pageTitle")} />
      <Section padTop="none" padBottom="none">
        <SearchBox
          size="md"
          maxWidth={1280}
          value={qInput}
          placeholder={t("search.searchBoxPlaceholder")}
          ariaLabel={t("search.a11y.input")}
          submitLabel={t("search.a11y.submit")}
          scope={scopeLabel}
          scopeOptions={scopeOptions}
          scopeAriaLabel={t("search.a11y.scope")}
          onScopeChange={(label) => {
            const key = labelToKey.get(label)
            if (key !== undefined) setScope(key)
          }}
          onSubmit={(value) => {
            setQInput(value)
            void runSearch(value)
          }}
        />
        <div className="mt-2.5 text-fs-meta text-ink-soft flex flex-wrap items-center gap-x-4 gap-y-1">
          <code className="font-mono text-ink-mid">{t("search.syntax.spaceAnd")}</code>
          <code className="font-mono text-ink-mid">{t("search.syntax.phrase")}</code>
          <span>{t("search.syntax.advancedHint")}</span>
        </div>
        {queryError && (
          <div className="mt-2.5">
            <Callout tone="warn" role="alert">
              <span className="block font-semibold">{t("search.errors.querySyntax")}</span>
              <span className="block text-fs-label">{t("search.errors.querySyntaxHint")}</span>
            </Callout>
          </div>
        )}
      </Section>
      <Section padTop="block" padBottom="none">
        <ExamplesChip onPick={setQInput} />
      </Section>
      <Section padTop="md" padBottom="none">
        <SearchAssistant
          advancedState={advancedState}
          dispatch={dispatch}
          baseUrl={searchApiBaseUrl}
        />
      </Section>
      <Section padTop="md" padBottom="none">
        <SectionHeading
          action={<SyncStatusChip status={sync.status} onRetry={sync.retry} />}
        >
          {t("search.builder.heading")}
        </SectionHeading>
        <AdvancedBuilder state={advancedState} dispatch={dispatch} />
      </Section>
      {sync.dsl && (
        <Section padTop="block" padBottom="none">
          <QueryPreview dsl={sync.dsl} />
        </Section>
      )}
      {advancedState.root.children.length > 0 && (
        <Section padTop="md" padBottom="lg">
          <div className="flex justify-end gap-2.5">
            <Button kind="secondary" onClick={handleClear}>
              {t("search.actions.clear")}
            </Button>
            <Button kind="primary" onClick={() => void runSearch()}>
              {t("search.actions.submit")}
            </Button>
          </div>
        </Section>
      )}
    </>
  )
}

export default SearchRoute
