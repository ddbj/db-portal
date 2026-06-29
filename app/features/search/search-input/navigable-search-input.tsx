import { type ReactNode, useEffect, useRef, useState } from "react"

import type { ParseNode } from "~/lib/api"
import { useT } from "~/lib/i18n"
import type { DbSlug } from "~/lib/search-scope"
import { Button, Examples, SearchBox } from "~/ui"

import { useAssistantStream, useLlmAvailability } from "../assistant"
import { isIdentityAst } from "../ast"
import { type AiMode } from "./ai-mode"

type NavigableSearchInputProps = {
  keyword: string
  onKeywordChange: (value: string) => void
  // Run the keyword search (the caller navigates to the results URL).
  onSearch: (keyword: string) => void
  scope: string
  scopeOptions: readonly string[]
  onScopeChange: (label: string) => void
  scopeAriaLabel?: string
  // The keyword could not be parsed; reflect it on the box. Keyword mode only.
  invalid?: boolean
  // Offer the "append to existing" generation mode. Off (top page) pins AI to
  // "new" and keeps the DB scope selector in AI mode.
  allowAppend: boolean
  // The current full query (keyword + facets + structured), sent as `current`
  // so append folds the request into it. Undefined / empty disables append.
  appendCurrentAst?: ParseNode | undefined
  // The locked single-DB scope (per-DB results page): generation stays in this DB
  // (new and append). Undefined on top / cross, where the BFF derives the DB.
  lockedDb?: DbSlug | undefined
  // Hand off the validated AST + resolved DB (locked or derived; null = cross),
  // along with the raw prompt that produced it so the caller can preserve it
  // across navigation. The caller serializes the AST and navigates to that scope.
  onGenerated: (ast: ParseNode, mode: AiMode, db: DbSlug | null, prompt: string) => void
  // Hide the example chip row (results pages omit it). Defaults to shown.
  showExamples?: boolean
  // Rendered at the right end of the example chip row so it shares the line with
  // the chips (the top hero uses it for the advanced-search link).
  examplesTrailing?: ReactNode
  // A keyword search / post-generation navigation is in flight (owned by the
  // caller via useSearchPending). Busies the submit button.
  searchPending?: boolean | undefined
  // Hide the DB scope selector when in AI mode (top page only).
  hideScopeInAiMode?: boolean
  // Seed the internal state on first mount only; later changes are ignored so a
  // reload falls back to the default keyword mode.
  initialMode?: "keyword" | "ai" | undefined
  initialAiInput?: string | undefined
  initialAiMode?: AiMode | undefined
}

const toStringArray = (raw: unknown): readonly string[] => (Array.isArray(raw) ? raw : [])

// The fat search box shared by the top hero and the results page. Like the
// /search builder's SearchInputPanel it toggles between a keyword input and an
// AI prompt, but instead of reviewing a proposal in place it hands the generated
// AST straight to the caller, which serializes it and navigates.
export const NavigableSearchInput = ({
  keyword,
  onKeywordChange,
  onSearch,
  scope,
  scopeOptions,
  onScopeChange,
  scopeAriaLabel,
  invalid = false,
  allowAppend,
  appendCurrentAst,
  lockedDb,
  onGenerated,
  showExamples = true,
  examplesTrailing,
  searchPending = false,
  hideScopeInAiMode = false,
  initialMode,
  initialAiInput,
  initialAiMode,
}: NavigableSearchInputProps) => {
  const t = useT()
  const availability = useLlmAvailability()
  const [mode, setMode] = useState<"keyword" | "ai">(() => initialMode ?? "keyword")
  const [aiInput, setAiInput] = useState(() => initialAiInput ?? "")
  const [aiMode, setAiMode] = useState<AiMode>(() => initialAiMode ?? "new")
  // The mode the in-flight request was started with; the done handler may fire
  // after the user fiddles with the selector, so it must not read live state.
  const pendingModeRef = useRef<AiMode>("new")
  // The prompt the in-flight request was started with, frozen at submit time so
  // the caller can stash it into navigation state.
  const pendingPromptRef = useRef<string>("")

  const isAi = mode === "ai"
  const keywordInvalid = invalid && !isAi

  const canAppend = allowAppend
    && appendCurrentAst !== undefined
    && !isIdentityAst(appendCurrentAst)
  const effectiveAiMode: AiMode = canAppend ? aiMode : "new"

  const stream = useAssistantStream(undefined, (ast, db) => {
    onGenerated(ast, pendingModeRef.current, db, pendingPromptRef.current)
    setAiInput("")
    setMode("keyword")
  })
  const { reset: resetStream } = stream

  // If the LLM drops out mid-prompt, fall back to the keyword input rather than
  // stranding the user in a dead AI mode.
  useEffect(() => {
    if (mode === "ai" && !availability.ready) {
      setMode("keyword")
      resetStream()
    }
  }, [mode, availability.ready, resetStream])

  const toggleMode = () => {
    setAiInput("")
    resetStream()
    if (!isAi) setAiMode(canAppend ? "append" : "new")
    setMode(isAi ? "keyword" : "ai")
  }

  const generating = stream.state === "streaming"
  // A failed generation puts the box into the same validation-failure treatment
  // as an unparseable keyword (warn border + inline alert below).
  const aiError = isAi && stream.state === "error"
  // The submit is busy while generating (AI) or while a keyword search /
  // post-generation navigation is resolving.
  const submitDisabled = generating || searchPending
  const submitLabel = generating
    ? t("search.assistant.generating")
    : searchPending
      ? t("search.a11y.searching")
      : aiError
        ? t("search.assistant.retry")
        : t("search.a11y.submit")
  // The submit may show 検索 / 検索中… / 生成中… / 再試行; reserve the widest so
  // the box never resizes when the label changes.
  const submitReserve = [
    t("search.a11y.submit"),
    t("search.a11y.searching"),
    t("search.assistant.generating"),
    t("search.assistant.retry"),
  ]

  const handleSubmit = (value: string) => {
    if (submitDisabled) return
    if (isAi) {
      // In the error state the submit reads 再試行; running it again with the
      // retained input is the retry.
      if (value.trim().length === 0) return
      pendingModeRef.current = effectiveAiMode
      pendingPromptRef.current = value
      void stream.start(value, {
        mode: effectiveAiMode,
        current: effectiveAiMode === "append" ? appendCurrentAst : undefined,
        db: lockedDb,
      })
    } else {
      onSearch(value)
    }
  }

  const examplesItems = isAi
    ? toStringArray(
      effectiveAiMode === "append"
        ? t("search.assistant.examplesAppend", { returnObjects: true })
        : t("search.assistant.examplesNew", { returnObjects: true }),
    )
    : toStringArray(t("search.examples.items", { returnObjects: true }))
  const examplesLabel = isAi
    ? t("search.assistant.examplesLabel")
    : t("search.examples.label")

  // In AI mode the scope dropdown is repurposed to pick the generation mode,
  // but only when append is offered; the top page keeps the DB scope there.
  const modeNewLabel = t("search.assistant.modeNew")
  const modeAppendLabel = t("search.assistant.modeAppend")
  const aiSelector = isAi && allowAppend
  const boxScope = aiSelector
    ? (effectiveAiMode === "append" ? modeAppendLabel : modeNewLabel)
    : scope
  const boxScopeOptions = aiSelector ? [modeNewLabel, modeAppendLabel] : scopeOptions
  const boxScopeAriaLabel = aiSelector
    ? t("search.assistant.modeGroupLabel")
    : (scopeAriaLabel ?? t("search.a11y.scope"))
  const onBoxScopeChange = aiSelector
    ? (label: string) => {
      if (label === modeNewLabel) setAiMode("new")
      else if (label === modeAppendLabel) setAiMode("append")
    }
    : onScopeChange

  const aiToggle = availability.ready
    ? (
      <Button
        kind={isAi ? "primary" : "accent"}
        size="md"
        pill
        aria-pressed={isAi}
        onClick={toggleMode}
      >
        {t("search.assistant.enterMode")}
      </Button>
    )
    : undefined

  return (
    <div className="flex flex-col gap-2.5">
      <SearchBox
        size="lg"
        maxWidth={9999}
        showSearchIcon={!isAi}
        tone={isAi ? "ai" : "default"}
        invalid={keywordInvalid || aiError}
        value={isAi ? aiInput : keyword}
        placeholder={isAi ? (effectiveAiMode === "append" ? t("search.assistant.placeholderAppend") : t("search.assistant.placeholderNew")) : t("search.searchBoxPlaceholder")}
        ariaLabel={isAi ? t("search.a11y.assistantInput") : t("search.a11y.input")}
        submitLabel={submitLabel}
        submitReserve={submitReserve}
        submitDisabled={submitDisabled}
        showScope={!(isAi && hideScopeInAiMode)}
        scope={boxScope}
        scopeOptions={boxScopeOptions}
        disabledScopeOptions={aiSelector && !canAppend ? [modeAppendLabel] : []}
        scopeAriaLabel={boxScopeAriaLabel}
        onScopeChange={onBoxScopeChange}
        onChange={isAi ? setAiInput : onKeywordChange}
        onSubmit={handleSubmit}
        trailing={aiToggle}
      />

      {keywordInvalid && (
        <p className="m-0 text-fs-meta font-semibold text-warn-fg">
          {t("search.errors.keywordInvalid")}
        </p>
      )}

      {showExamples && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Examples
            label={examplesLabel}
            items={examplesItems}
            onPick={isAi ? setAiInput : onKeywordChange}
            mono={!isAi}
          />
          {examplesTrailing !== undefined && (
            <div className="ml-auto">{examplesTrailing}</div>
          )}
        </div>
      )}

      {isAi && stream.state === "streaming" && (
        <div className="flex items-center gap-2 text-fs-label text-ink-mid">
          <span>{t("search.assistant.generating")}</span>
          <Button kind="secondary" size="sm" onClick={stream.stop}>
            {t("search.a11y.assistantStop")}
          </Button>
        </div>
      )}

      {aiError && (
        <p role="alert" className="m-0 text-fs-label font-semibold text-warn-fg">
          {t("search.assistant.generateError")}
        </p>
      )}
    </div>
  )
}
