import type { Dispatch } from "react"
import { useEffect, useState } from "react"

import { useT } from "~/lib/i18n"
import {
  Button,
  Chip,
  CloseIcon,
  IconButton,
  Label,
  SearchBox,
  Tag,
  TextArea,
} from "~/ui"

import type { AdvancedAction, AdvancedState } from "../advanced"
import { useAssistantStream, useLlmAvailability } from "../assistant"
import {
  type AiMode,
  applyProposalByMode,
  builderConditionCount,
  resolveAiModeDefault,
} from "./ai-mode"

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
}

const Sparkle = () => (
  <span aria-hidden className="leading-none">✨</span>
)

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
}: SearchInputPanelProps) => {
  const t = useT()
  const availability = useLlmAvailability()
  const stream = useAssistantStream(baseUrl)
  const [mode, setMode] = useState<"keyword" | "ai">("keyword")
  const [aiInput, setAiInput] = useState("")
  const [aiMode, setAiMode] = useState<AiMode>("new")

  const count = builderConditionCount(keyword, advancedState)
  const appendDisabled = resolveAiModeDefault(count).appendDisabled
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

  const enterAiMode = () => {
    setAiMode(resolveAiModeDefault(builderConditionCount(keyword, advancedState)).mode)
    setMode("ai")
  }

  const exitAiMode = () => {
    setMode("keyword")
    stream.reset()
  }

  const handleApply = () => {
    if (stream.proposal === null) return
    const next = applyProposalByMode(effectiveAiMode, advancedState, stream.proposal)
    dispatch({ type: "replaceRoot", root: next.root })
    if (effectiveAiMode === "new") onKeywordChange("")
    setAiInput("")
    stream.reset()
  }

  const handleReset = () => {
    setAiInput("")
    stream.reset()
  }

  if (mode === "ai" && availability.ready) {
    const rawExamples = t("search.assistant.examples", { returnObjects: true })
    const examples: readonly string[] = Array.isArray(rawExamples) ? rawExamples : []

    return (
      <div className="flex flex-col gap-2.5">
        <div className="rounded-card border border-brand/40 bg-surface flex flex-col shadow-card">
          <div className="p-3 flex items-start gap-2.5">
            <div className="flex-1 min-w-0">
              <TextArea
                ariaLabel={t("search.a11y.assistantInput")}
                value={aiInput}
                onChange={(event) => setAiInput(event.currentTarget.value)}
                placeholder={t("search.assistant.placeholder")}
                rows={2}
              />
            </div>
            <span className="inline-flex items-center gap-2 shrink-0">
              <Tag kind="brand"><Sparkle /> {t("search.assistant.enterMode")}</Tag>
              <IconButton ariaLabel={t("search.assistant.exitMode")} onClick={exitAiMode}>
                <CloseIcon size={14} />
              </IconButton>
            </span>
          </div>
          <div className="bg-surface-subtle border-t border-border-soft p-3 flex flex-wrap items-center gap-3">
            <ModeToggle mode={effectiveAiMode} appendDisabled={appendDisabled} onChange={setAiMode} />
            {effectiveAiMode === "append" && count > 0 && (
              <span className="text-fs-meta text-ink-soft">
                {t("search.assistant.modeHint", { count })}
              </span>
            )}
            <span className="ml-auto">
              {stream.state === "streaming"
                ? (
                  <Button kind="secondary" size="sm" onClick={stream.stop}>
                    {t("search.a11y.assistantStop")}
                  </Button>
                )
                : (
                  <Button
                    kind="primary"
                    size="sm"
                    disabled={aiInput.trim().length === 0}
                    onClick={() => void stream.start(aiInput)}
                  >
                    <Sparkle /> {t("search.assistant.generate")}
                  </Button>
                )}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Label>{t("search.assistant.examplesLabel")}</Label>
          {examples.map((example) => (
            <Chip key={example} kind="example" as="button" onClick={() => setAiInput(example)}>
              {example}
            </Chip>
          ))}
        </div>
        {stream.proposal !== null && (
          <section
            aria-label={t("search.assistant.proposalLabel")}
            className="rounded-card border border-border-soft bg-surface p-3 flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <Tag kind="brand" size="sm">{t("search.assistant.proposalLabel")}</Tag>
              <span className="text-fs-label text-ink-mid">{t("search.assistant.proposalDescription")}</span>
            </div>
            <ul className="list-none p-0 m-0 flex flex-col gap-1">
              {stream.proposal.conditions.map((condition, index) => (
                <li key={`${condition.field}-${index}`} className="text-fs-label text-ink-mid font-mono">
                  <span className="text-brand-deep">{condition.field}</span>
                  {" "}
                  <span className="text-ink-soft">{condition.op}</span>
                  {" "}
                  <span className="text-ink font-semibold">
                    {condition.op === "between"
                      ? `${condition.from}..${condition.to}`
                      : condition.value}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <Button kind="secondary" size="sm" onClick={handleReset}>
                {t("search.assistant.reset")}
              </Button>
              <Button kind="primary" size="sm" onClick={handleApply}>
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

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-stretch gap-2.5">
        <div className="flex-1 min-w-0">
          <SearchBox
            size="md"
            maxWidth={9999}
            showSearchIcon
            value={keyword}
            placeholder={t("search.searchBoxPlaceholder")}
            ariaLabel={t("search.a11y.input")}
            submitLabel={t("search.a11y.submit")}
            scope={scope}
            scopeOptions={scopeOptions}
            scopeAriaLabel={scopeAriaLabel ?? t("search.a11y.scope")}
            onScopeChange={onScopeChange}
            onChange={onKeywordChange}
            onSubmit={(value) => onKeywordChange(value)}
          />
        </div>
        {availability.ready && (
          <Button kind="secondary" onClick={enterAiMode}>
            <Sparkle /> {t("search.assistant.enterMode")}
          </Button>
        )}
      </div>
      <div className="text-fs-meta text-ink-soft flex flex-wrap items-center gap-x-4 gap-y-1">
        <code className="font-mono text-ink-mid">{t("search.syntax.spaceAnd")}</code>
        <code className="font-mono text-ink-mid">{t("search.syntax.phrase")}</code>
        <span>{t("search.syntax.advancedHint")}</span>
      </div>
    </div>
  )
}

type ModeToggleProps = {
  mode: AiMode
  appendDisabled: boolean
  onChange: (mode: AiMode) => void
}

const ModeToggle = ({ mode, appendDisabled, onChange }: ModeToggleProps) => {
  const t = useT()

  return (
    <div role="group" aria-label={t("search.assistant.modeGroupLabel")} className="inline-flex gap-1">
      <Button
        kind={mode === "new" ? "primary" : "secondary"}
        size="sm"
        aria-pressed={mode === "new"}
        onClick={() => onChange("new")}
      >
        {t("search.assistant.modeNew")}
      </Button>
      <Button
        kind={mode === "append" ? "primary" : "secondary"}
        size="sm"
        aria-pressed={mode === "append"}
        disabled={appendDisabled}
        onClick={() => onChange("append")}
      >
        {t("search.assistant.modeAppend")}
      </Button>
    </div>
  )
}
