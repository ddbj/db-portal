import { useReducer, useState } from "react"
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
import { useLang, useT } from "~/lib/i18n"
import {
  Button,
  PageTitle,
  SearchBox,
  Section,
  SectionHeading,
} from "~/ui"

export const handle = {
  lang: undefined,
  i18n: { en: "complete" },
} as const

const SearchRoute = () => {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const [qInput, setQInput] = useState("")
  const [advancedState, dispatch] = useReducer(advancedReducer, undefined, createInitialState)
  const advancedAst = fromAdvanced(advancedState)
  const sync = useDebouncedSerialize(advancedAst)

  const runSearch = async () => {
    let combined = advancedAst
    if (qInput.trim().length > 0) {
      try {
        const parsed = await parseDslToAst(qInput, { baseUrl: searchApiBaseUrl })
        combined = mergeAstAnd(parsed, advancedAst)
      } catch {
        navigate(buildResultsHref({ q: qInput }, lang))

        return
      }
    }
    if (isIdentityAst(combined)) {
      navigate(buildResultsHref({}, lang))

      return
    }
    try {
      const dsl = await serializeAstToDsl(combined, { baseUrl: searchApiBaseUrl })
      navigate(buildResultsHref({ q: dsl }, lang))
    } catch {
      // serialize 失敗時はとりあえず simple query だけで遷移
      navigate(buildResultsHref({ q: qInput }, lang))
    }
  }

  const handleClear = () => {
    setQInput("")
    dispatch({ type: "clear" })
  }

  return (
    <>
      <PageTitle title={t("search.pageTitle")} subtitle={t("search.pageSubtitle")} />
      <Section padY="sm">
        <SearchBox
          size="lg"
          value={qInput}
          placeholder={t("search.searchBoxPlaceholder")}
          ariaLabel={t("search.a11y.input")}
          submitLabel={t("search.a11y.submit")}
          onSubmit={(value) => {
            setQInput(value)
            void runSearch()
          }}
          showScope={false}
        />
        <div className="mt-2 text-fs-label text-ink-soft flex flex-wrap items-center gap-3">
          <code className="font-mono text-ink-mid">{t("search.syntax.spaceAnd")}</code>
          <code className="font-mono text-ink-mid">{t("search.syntax.phrase")}</code>
          <span>{t("search.syntax.advancedHint")}</span>
        </div>
      </Section>
      <Section padY="sm">
        <ExamplesChip onPick={setQInput} />
      </Section>
      <Section padY="md">
        <SearchAssistant
          advancedState={advancedState}
          dispatch={dispatch}
          baseUrl={searchApiBaseUrl}
        />
      </Section>
      <Section padY="md">
        <SectionHeading
          action={<SyncStatusChip status={sync.status} onRetry={sync.retry} />}
        >
          {t("search.builder.heading")}
        </SectionHeading>
        <AdvancedBuilder state={advancedState} dispatch={dispatch} />
      </Section>
      {sync.dsl && (
        <Section padY="sm">
          <QueryPreview dsl={sync.dsl} />
        </Section>
      )}
      <Section padY="lg">
        <div className="flex justify-end gap-2">
          <Button kind="secondary" onClick={handleClear}>
            {t("search.actions.clear")}
          </Button>
          <Button kind="primary" size="lg" onClick={() => void runSearch()}>
            {t("search.actions.submit")}
          </Button>
        </div>
      </Section>
    </>
  )
}

export default SearchRoute
