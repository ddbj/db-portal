import type { Dispatch } from "react"
import { useEffect, useState } from "react"

import { useT } from "~/lib/i18n"
import { Button, cn, Examples, SearchBox, Tag } from "~/ui"

import type { AdvancedAction, AdvancedState } from "../advanced"
import { ProposalConditions, useAssistantStream, useLlmAvailability } from "../assistant"
import { type AiMode, applyProposalByMode, builderConditionCount, resolveAiModeDefault } from "./ai-mode"

export type SearchInputPanelProps = {
  keyword: string
  onKeywordChange: (value: string) => void
  scope: string
  scopeOptions: readonly string[]
  onScopeChange: (label: string) => void
  scopeAriaLabel?: string
  advancedState: AdvancedState
  dispatch: Dispatch<AdvancedAction>
  baseUrl?: string
  // The keyword could not be parsed; reflect it on the box (warn border +
  // warn-coloured syntax hint). Only meaningful in keyword mode.
  invalid?: boolean
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
  baseUrl,
  invalid = false,
}: SearchInputPanelProps) => {
  const t = useT()
  const availability = useLlmAvailability()
  const stream = useAssistantStream(baseUrl)
  const [mode, setMode] = useState<"keyword" | "ai">("keyword")
  const [aiInput, setAiInput] = useState("")
  const [aiMode, setAiMode] = useState<AiMode>("new")
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

  const handleSubmit = (value: string) => {
    if (isAi) {
      if (value.trim().length > 0) void stream.start(value)
    } else {
      onKeywordChange(value)
    }
  }

  const applyProposal = (proposalMode: AiMode) => {
    if (stream.proposal === null) return
    const next = applyProposalByMode(proposalMode, advancedState, stream.proposal)
    dispatch({ type: "replaceRoot", root: next.root })
    if (proposalMode === "new") onKeywordChange("")
    setAiInput("")
    stream.reset()
    setMode("keyword")
  }

  const examplesItems = isAi
    ? toStringArray(t("search.assistant.examples", { returnObjects: true }))
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
        placeholder={isAi ? t("search.assistant.placeholder") : t("search.searchBoxPlaceholder")}
        ariaLabel={isAi ? t("search.a11y.assistantInput") : t("search.a11y.input")}
        submitLabel={isAi ? t("search.assistant.generateShort") : t("search.a11y.submit")}
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
          <p className="text-fs-meta text-ink-soft m-0">
            {effectiveAiMode === "append"
              ? t("search.assistant.descriptionAppend", { count })
              : t("search.assistant.descriptionNew")}
          </p>
        )
        : (
          <div
            className={cn(
              "text-fs-meta flex flex-wrap items-center gap-x-4 gap-y-1.5",
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
          aria-label={t("search.assistant.proposalLabel")}
          className="rounded-card border border-brand/40 bg-surface p-3 flex flex-col gap-2.5 overflow-hidden"
        >
          <div className="flex items-center gap-2">
            <Tag kind="brand" size="sm">{t("search.assistant.proposalLabel")}</Tag>
            <span className="text-fs-label text-ink-mid">{t("search.assistant.proposalDescription")}</span>
          </div>
          <ProposalConditions proposal={stream.proposal} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              kind="secondary"
              size="md"
              disabled={aiInput.trim().length === 0}
              onClick={() => void stream.start(aiInput)}
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
