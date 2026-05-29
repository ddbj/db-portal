import { useMemo, useReducer, useState } from "react"
import { useNavigate } from "react-router"

import {
  AdvancedBuilder,
  advancedReducer,
  builderConditionCount,
  buildResultsHref,
  createInitialState,
  fromAdvanced,
  isIdentityAst,
  mergeAstAnd,
  parseDslToAst,
  QueryPreview,
  SearchInputPanel,
  serializeAstToDsl,
  SyncStatusChip,
  useCrossSearchSync,
} from "~/features/search"
import { searchApiBaseUrl } from "~/lib/api"
import { useT } from "~/lib/i18n"
import { SCOPE_KEYS, type ScopeKey, scopeKeyToDbSlug } from "~/lib/search-scope"
import {
  Button,
  Callout,
  PageTitle,
  Section,
  SectionHeading,
} from "~/ui"

export const handle = {
  i18n: { en: "complete" },
} as const

const SearchRoute = () => {
  const t = useT()
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState("")
  const [queryError, setQueryError] = useState<null | "parse" | "serialize">(null)
  const [scope, setScope] = useState<ScopeKey>("all")
  const [advancedState, dispatch] = useReducer(advancedReducer, undefined, createInitialState)

  const advancedAst = useMemo(() => fromAdvanced(advancedState), [advancedState])
  const sync = useCrossSearchSync(keyword, advancedAst, searchApiBaseUrl)

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

  const conditionCount = builderConditionCount(keyword, advancedState)

  // The keyword box and AI commit their input into the builder; this button is
  // the single point that executes the cross search by the builder's content.
  const runSearch = async () => {
    let combined = advancedAst
    const trimmed = keyword.trim()
    if (trimmed.length > 0) {
      try {
        const parsed = await parseDslToAst(trimmed, { baseUrl: searchApiBaseUrl })
        combined = mergeAstAnd(parsed, advancedAst)
      } catch {
        setQueryError("parse")

        return
      }
    }
    setQueryError(null)
    if (isIdentityAst(combined)) {
      navigate(buildResultsHref({ db }))

      return
    }
    try {
      const dsl = await serializeAstToDsl(combined, { baseUrl: searchApiBaseUrl })
      navigate(buildResultsHref({ q: dsl, db }))
    } catch {
      setQueryError("serialize")
    }
  }

  const handleClear = () => {
    setKeyword("")
    setQueryError(null)
    setScope("all")
    dispatch({ type: "clear" })
  }

  // A failed keyword parse (live sync or submit) is a fixable syntax error; a
  // serialize failure is a transient sync problem, not bad syntax.
  const errorKind: null | "parse" | "serialize" = queryError ?? (sync.parseError ? "parse" : null)

  return (
    <>
      <PageTitle title={t("search.pageTitle")} subtitle={t("search.pageSubtitle")} />
      <Section padTop="none" padBottom="none">
        <SearchInputPanel
          keyword={keyword}
          onKeywordChange={setKeyword}
          scope={scopeLabel}
          scopeOptions={scopeOptions}
          scopeAriaLabel={t("search.a11y.scope")}
          onScopeChange={(label) => {
            const key = labelToKey.get(label)
            if (key !== undefined) setScope(key)
          }}
          advancedState={advancedState}
          dispatch={dispatch}
          baseUrl={searchApiBaseUrl}
        />
        {errorKind !== null && (
          <div className="mt-2.5">
            <Callout tone="warn" role="alert">
              {errorKind === "serialize"
                ? <span className="block font-semibold">{t("search.errors.serializeFailure")}</span>
                : (
                  <>
                    <span className="block font-semibold">{t("search.errors.querySyntax")}</span>
                    <span className="block text-fs-label">{t("search.errors.querySyntaxHint")}</span>
                  </>
                )}
            </Callout>
          </div>
        )}
      </Section>
      <Section padTop="md" padBottom="none">
        <SectionHeading
          count={conditionCount}
          countSuffix={t("search.builder.countSuffix")}
          action={<SyncStatusChip status={sync.status} onRetry={sync.retry} />}
        >
          {t("search.builder.heading")}
        </SectionHeading>
        <AdvancedBuilder
          state={advancedState}
          dispatch={dispatch}
          freeText={keyword}
          onFreeTextChange={setKeyword}
          onFreeTextRemove={() => setKeyword("")}
        />
      </Section>
      {sync.dsl && (
        <Section padTop="block" padBottom="none">
          <QueryPreview dsl={sync.dsl} />
        </Section>
      )}
      {conditionCount > 0 && (
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
