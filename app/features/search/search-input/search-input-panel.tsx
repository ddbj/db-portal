import type { Dispatch } from "react"
import { useEffect, useId, useState } from "react"

import { useT } from "~/lib/i18n"
import { Button, cn, Examples, SearchBox } from "~/ui"

import { type AdvancedAction, type AdvancedState, fromAdvanced, toAdvanced } from "../advanced"
import {
  type AssistantStartOptions,
  ProposalConditions,
  useAssistantStream,
  useLlmAvailability,
} from "../assistant"
import { type AiMode, builderConditionCount, resolveAiModeDefault } from "./ai-mode"

export type SearchInputPanelProps = {
  keyword: string
  onKeywordChange: (value: string) => void
  scope: string
  scopeOptions: readonly string[]
  onScopeChange: (label: string) => void
  scopeAriaLabel?: string
  advancedState: AdvancedState
  dispatch: Dispatch<AdvancedAction>
  // The keyword could not be parsed; reflect it on the box (warn border +
  // warn-coloured syntax hint). Only meaningful in keyword mode.
  invalid?: boolean
  // Run the cross search from the box (keyword mode submit / Enter), mirroring
  // the builder's "検索" button.
  onSubmitSearch?: ((keyword: string) => void) | undefined
  // A keyword search is resolving (parse → serialize → navigate); busies the box
  // submit button.
  searchPending?: boolean | undefined
}

const toStringArray = (raw: unknown): readonly string[] => (Array.isArray(raw) ? raw : [])

export const SearchInputPanel = ({
  keyword,
  onKeywordChange,
  scope,
  scopeOptions,
  onScopeChange,
  scopeAriaLabel,
  advancedState,
  dispatch,
  invalid = false,
  onSubmitSearch,
  searchPending = false,
}: SearchInputPanelProps) => {
  const t = useT()
  const availability = useLlmAvailability()
  const stream = useAssistantStream(undefined)
  const [mode, setMode] = useState<"keyword" | "ai">("keyword")
  const [aiInput, setAiInput] = useState("")
  const [aiMode, setAiMode] = useState<AiMode>("new")
  const proposalHeadingId = useId()
  const isAi = mode === "ai"
  const keywordInvalid = invalid && !isAi

  const count = builderConditionCount(keyword, advancedState)
  const appendDisabled = resolveAiModeDefault(count).appendDisabled
  // The generation mode (new / append) is chosen before generating because the
  // prompt differs per mode; with nothing to append to it falls back to "new".
  const effectiveAiMode: AiMode = appendDisabled ? "new" : aiMode

  const { reset: resetStream } = stream
  // If the LLM becomes unavailable while composing a prompt, fall back to the
  // keyword input rather than stranding the user in a dead AI mode.
  useEffect(() => {
    if (mode === "ai" && !availability.ready) {
      setMode("keyword")
      resetStream()
    }
  }, [mode, availability.ready, resetStream])

  // The single "AI モード" toggle enters AI mode and, pressed again, returns to
  // the keyword input — discarding the prompt and any pending proposal.
  const toggleMode = () => {
    setAiInput("")
    stream.reset()
    if (!isAi) setAiMode(resolveAiModeDefault(count).mode)
    setMode(isAi ? "keyword" : "ai")
  }

  // append sends the current builder AST so the model folds the request into it;
  // new sends nothing and generates fresh.
  const startOptions = (): AssistantStartOptions => ({
    mode: effectiveAiMode,
    current: effectiveAiMode === "append" ? fromAdvanced(advancedState) : undefined,
  })

  const generating = stream.state === "streaming"
  // AI mode busies while generating; keyword mode busies while the search the
  // box kicked off resolves.
  const submitDisabled = isAi ? generating : searchPending
  const submitLabel = isAi
    ? (generating ? t("search.assistant.generating") : t("search.assistant.generateShort"))
    : (searchPending ? t("search.a11y.searching") : t("search.a11y.submit"))

  // The keyword box submit runs the cross search (same as the builder's button),
  // not just a keyword commit — the box's "検索" otherwise looked inert.
  const handleSubmit = (value: string) => {
    if (submitDisabled) return
    if (isAi) {
      if (value.trim().length > 0) void stream.start(value, startOptions())
    } else if (onSubmitSearch) {
      onSubmitSearch(value)
    } else {
      onKeywordChange(value)
    }
  }

  const applyProposal = (proposalMode: AiMode) => {
    if (stream.proposal === null) return
    // The proposal AST already folds in the existing query for append, so both
    // modes rebuild the builder from it; new also clears the keyword row.
    dispatch({ type: "replaceRoot", root: toAdvanced(stream.proposal).root })
    if (proposalMode === "new") onKeywordChange("")
    setAiInput("")
    stream.reset()
    setMode("keyword")
  }

  const examplesItems = isAi
    ? toStringArray(
      effectiveAiMode === "append"
        ? t("search.assistant.examplesAppend", { returnObjects: true })
        : t("search.assistant.examplesNew", { returnObjects: true }),
    )
    : toStringArray(t("search.examples.items", { returnObjects: true }))
  const examplesLabel = isAi ? t("search.assistant.examplesLabel") : t("search.examples.label")

  // The search box's scope dropdown is repurposed in AI mode to pick the
  // generation mode; "既存に追加" stays listed but disabled with nothing to
  // append to.
  const modeNewLabel = t("search.assistant.modeNew")
  const modeAppendLabel = t("search.assistant.modeAppend")
  const aiScopeOptions = [modeNewLabel, modeAppendLabel]
  const aiScopeValue = effectiveAiMode === "append" ? modeAppendLabel : modeNewLabel
  const onAiScopeChange = (label: string) => {
    if (label === modeNewLabel) setAiMode("new")
    else if (label === modeAppendLabel) setAiMode("append")
  }

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
        invalid={keywordInvalid}
        value={isAi ? aiInput : keyword}
        placeholder={isAi ? (effectiveAiMode === "append" ? t("search.assistant.placeholderAppend") : t("search.assistant.placeholderNew")) : t("search.searchBoxPlaceholder")}
        ariaLabel={isAi ? t("search.a11y.assistantInput") : t("search.a11y.input")}
        submitLabel={submitLabel}
        submitDisabled={submitDisabled}
        scope={isAi ? aiScopeValue : scope}
        scopeOptions={isAi ? aiScopeOptions : scopeOptions}
        disabledScopeOptions={isAi && appendDisabled ? [modeAppendLabel] : []}
        scopeAriaLabel={isAi ? t("search.assistant.modeGroupLabel") : (scopeAriaLabel ?? t("search.a11y.scope"))}
        onScopeChange={isAi ? onAiScopeChange : onScopeChange}
        onChange={isAi ? setAiInput : onKeywordChange}
        onSubmit={handleSubmit}
        trailing={aiToggle}
      />

      {isAi
        ? (
          <p className="flex min-h-5 items-center text-fs-meta text-ink-soft m-0">
            {effectiveAiMode === "append"
              ? t("search.assistant.descriptionAppend", { count })
              : t("search.assistant.descriptionNew")}
          </p>
        )
        : (
          <div
            className={cn(
              "text-fs-meta flex min-h-5 flex-wrap items-center gap-x-4 gap-y-1.5",
              keywordInvalid ? "text-warn-fg" : "text-ink-soft",
            )}
          >
            {keywordInvalid && (
              <span className="font-semibold">{t("search.errors.keywordInvalid")}</span>
            )}
            {([
              [t("search.syntax.space"), t("search.syntax.spaceUse")],
              [t("search.syntax.comma"), t("search.syntax.commaUse")],
              [t("search.syntax.phrase"), t("search.syntax.phraseUse")],
            ] as const).map(([key, use]) => (
              <span key={key} className="inline-flex items-center gap-1.5 leading-none">
                <kbd
                  className={cn(
                    "rounded border px-1.5 py-0.5 font-mono text-fs-meta not-italic leading-none",
                    keywordInvalid
                      ? "border-warn-border bg-warn-bg text-warn-fg"
                      : "border-border-soft bg-surface-subtle text-ink-mid",
                  )}
                >
                  {key}
                </kbd>
                <span>= {use}</span>
              </span>
            ))}
          </div>
        )}

      <Examples
        label={examplesLabel}
        items={examplesItems}
        onPick={isAi ? setAiInput : onKeywordChange}
        mono={!isAi}
      />

      {isAi && stream.state === "streaming" && (
        <div className="flex items-center gap-2 text-fs-label text-ink-mid">
          <span>{t("search.assistant.generating")}</span>
          <Button kind="secondary" size="sm" onClick={stream.stop}>
            {t("search.a11y.assistantStop")}
          </Button>
        </div>
      )}

      {isAi && stream.proposal !== null && (
        <section
          aria-labelledby={proposalHeadingId}
          className="rounded-card border border-border-soft bg-surface p-3 flex flex-col gap-2.5 overflow-hidden"
        >
          <h2 id={proposalHeadingId} className="m-0 text-fs-h3 font-bold text-ink">
            {t("search.assistant.proposalHeading")}
          </h2>
          <ProposalConditions node={stream.proposal} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              kind="secondary"
              size="md"
              disabled={aiInput.trim().length === 0 || generating}
              onClick={() => void stream.start(aiInput, startOptions())}
            >
              {t("search.assistant.regenerate")}
            </Button>
            <Button kind="primary" size="md" onClick={() => applyProposal(effectiveAiMode)}>
              {effectiveAiMode === "new"
                ? t("search.assistant.applyReplace")
                : t("search.assistant.apply")}
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
