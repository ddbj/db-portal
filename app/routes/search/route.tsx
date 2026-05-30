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
  const [submitParseError, setSubmitParseError] = useState(false)
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
        setSubmitParseError(true)

        return
      }
    }
    setSubmitParseError(false)
    if (isIdentityAst(combined)) {
      navigate(buildResultsHref({ db }))

      return
    }
    try {
      const dsl = await serializeAstToDsl(combined, { baseUrl: searchApiBaseUrl })
      navigate(buildResultsHref({ q: dsl, db }))
    } catch {
      // Serialize is a system-side failure the user cannot fix; the live sync
      // chip surfaces it. Don't navigate and don't raise a warning here.
    }
  }

  const handleClear = () => {
    setKeyword("")
    setSubmitParseError(false)
    setScope("all")
    dispatch({ type: "clear" })
  }

  // Editing the keyword dismisses a stale submit-time error; the live sync
  // re-flags it if the new keyword is still unparseable.
  const handleKeywordChange = (value: string) => {
    setKeyword(value)
    if (submitParseError) setSubmitParseError(false)
  }

  // A failed keyword parse (live sync or submit) is the only user-fixable error
  // surfaced here; system-side serialize failures are left to the sync chip.
  const hasError = submitParseError || sync.parseError

  // The warning's retry re-runs whichever path failed: a submit-time parse
  // retries the submit, a live parse error re-runs the debounced sync.
  const handleRetry = () => {
    if (submitParseError) {
      void runSearch()

      return
    }
    sync.retry()
  }

  return (
    <>
      <PageTitle title={t("search.pageTitle")} subtitle={t("search.pageSubtitle")} />
      <Section padTop="none" padBottom="none">
        <SearchInputPanel
          keyword={keyword}
          onKeywordChange={handleKeywordChange}
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
          invalid={hasError}
        />
      </Section>
      <Section padTop="md" padBottom="none">
        <SectionHeading
          count={conditionCount}
          countSuffix={t("search.builder.countSuffix")}
          action={<SyncStatusChip status={sync.status} />}
        >
          {t("search.builder.heading")}
        </SectionHeading>
        <AdvancedBuilder
          state={advancedState}
          dispatch={dispatch}
          freeText={keyword}
          onFreeTextChange={handleKeywordChange}
          onFreeTextRemove={() => handleKeywordChange("")}
        />
      </Section>
      {hasError
        ? (
          <Section padTop="block" padBottom="none">
            <Callout
              tone="warn"
              role="alert"
              action={
                <Button kind="secondary" size="sm" onClick={handleRetry}>
                  {t("search.sync.retry")}
                </Button>
              }
            >
              {t("search.errors.querySyntax")}
            </Callout>
          </Section>
        )
        : sync.dsl
          ? (
            <Section padTop="block" padBottom="none">
              <QueryPreview dsl={sync.dsl} />
            </Section>
          )
          : null}
      {conditionCount > 0 && (
        <Section padTop="md" padBottom="lg">
          <div className="flex justify-end gap-2.5">
            <Button kind="secondary" onClick={handleClear}>
              {t("search.actions.clear")}
            </Button>
            <Button kind="primary" onClick={() => void runSearch()} disabled={hasError}>
              {t("search.actions.submit")}
            </Button>
          </div>
        </Section>
      )}
    </>
  )
}

export default SearchRoute
