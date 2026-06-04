import type { Dispatch } from "react"
import { useEffect, useId, useState } from "react"

import { useT } from "~/lib/i18n"
import type { DbSlug } from "~/lib/search-scope"
import { Button, cn, Examples, Heading, SearchBox, StableLabel } from "~/ui"

import { type AdvancedAction, type AdvancedState, fromAdvanced } from "../advanced"
import {
  type AssistantStartOptions,
  ProposalConditions,
  useAssistantStream,
  useLlmAvailability,
} from "../assistant"
import { type AiMode, builderConditionCount, resolveAiModeDefault } from "./ai-mode"
import { proposalToInputs } from "./apply-proposal"

type SearchInputPanelProps = {
  keyword: string
  onKeywordChange: (value: string) => void
  scope: string
  scopeOptions: readonly string[]
  onScopeChange: (label: string) => void
  scopeAriaLabel?: string
  // The builder's current DB scope (null = cross). Sent as the locked scope when
  // a specific DB is selected; when cross, the BFF derives the DB and the panel
  // switches the builder scope to it via onScopeDbChange so the applied Tier-3
  // conditions are valid/offered.
  scopeDb?: DbSlug | null
  onScopeDbChange?: (db: DbSlug | null) => void
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
  scopeDb = null,
  onScopeDbChange,
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
  // new sends nothing and generates fresh. A specific scope DB locks generation
  // to it; cross (null) lets the BFF derive the DB.
  const startOptions = (): AssistantStartOptions => ({
    mode: effectiveAiMode,
    current: effectiveAiMode === "append" ? fromAdvanced(advancedState) : undefined,
    db: scopeDb ?? undefined,
  })

  const generating = stream.state === "streaming"
  // A failed generation puts the box into the same validation-failure treatment
  // as an unparseable keyword (warn border + inline alert below).
  const aiError = isAi && stream.state === "error"
  // AI mode busies while generating; keyword mode busies while the search the
  // box kicked off resolves.
  const submitDisabled = isAi ? generating : searchPending
  const submitLabel = isAi
    ? (generating
      ? t("search.assistant.generating")
      : aiError
        ? t("search.assistant.retry")
        : t("search.assistant.generateShort"))
    : (searchPending ? t("search.a11y.searching") : t("search.a11y.submit"))
  // Reserve the widest of every label the submit can show (検索 / 検索中… / 生成 /
  // 生成中… / 再試行) so toggling mode or busy state never resizes the box.
  const submitReserve = [
    t("search.a11y.submit"),
    t("search.a11y.searching"),
    t("search.assistant.generateShort"),
    t("search.assistant.generating"),
    t("search.assistant.retry"),
  ]

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
    // Switch the builder scope to the resolved DB first so the Tier-3 conditions
    // it carries are valid/offered (no-op when it matches the current scope).
    if (onScopeDbChange && stream.proposalDb !== scopeDb) onScopeDbChange(stream.proposalDb)
    // Route the proposal into the keyword box (free text) and the builder
    // (structured remainder) the same way the `?q=` pre-fill does, so a generated
    // keyword is never lost to the builder's inability to hold a free_text leaf.
    const { keyword: nextKeyword, root } = proposalToInputs(stream.proposal, proposalMode, keyword)
    dispatch({ type: "replaceRoot", root })
    onKeywordChange(nextKeyword)
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
        invalid={keywordInvalid || aiError}
        value={isAi ? aiInput : keyword}
        placeholder={isAi ? (effectiveAiMode === "append" ? t("search.assistant.placeholderAppend") : t("search.assistant.placeholderNew")) : t("search.searchBoxPlaceholder")}
        ariaLabel={isAi ? t("search.a11y.assistantInput") : t("search.a11y.input")}
        submitLabel={submitLabel}
        submitReserve={submitReserve}
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
                    "rounded-tag border px-1.5 py-0.5 font-mono text-fs-meta not-italic leading-none",
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

      {aiError && (
        <p role="alert" className="m-0 text-fs-label font-semibold text-warn-fg">
          {t("search.assistant.generateError")}
        </p>
      )}

      {isAi && stream.proposal !== null && (
        <section
          aria-labelledby={proposalHeadingId}
          className="rounded-card border border-border-soft bg-surface p-3 flex flex-col gap-2.5 overflow-hidden"
        >
          <Heading as="h2" size="h3" id={proposalHeadingId}>
            {t("search.assistant.proposalHeading")}
          </Heading>
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
              <StableLabel reserve={[t("search.assistant.applyReplace"), t("search.assistant.apply")]}>
                {effectiveAiMode === "new"
                  ? t("search.assistant.applyReplace")
                  : t("search.assistant.apply")}
              </StableLabel>
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
