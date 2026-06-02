import { useId, useState } from "react"

import { useT } from "~/lib/i18n"
import { Button, Chip, Label, SectionHeading, Tag, TextArea } from "~/ui"

import { type AdvancedAction, type AdvancedState, fromAdvanced, toAdvanced } from "../advanced"
import { useLlmAvailability } from "./llm-availability"
import { type AssistantStartOptions, useAssistantStream } from "./prompt-client"
import { ProposalConditions } from "./proposal-conditions"

export type SearchAssistantProps = {
  advancedState: AdvancedState
  dispatch: (action: AdvancedAction) => void
}

export const SearchAssistant = ({ advancedState, dispatch }: SearchAssistantProps) => {
  const availability = useLlmAvailability()
  const t = useT()
  const [input, setInput] = useState("")
  const stream = useAssistantStream(undefined)
  const headingId = useId()
  if (!availability.ready) return null

  const rawExamples = t("search.assistant.examplesAppend", { returnObjects: true })
  const examplesList: readonly string[] = Array.isArray(rawExamples) ? rawExamples : []

  // The per-DB assistant refines the current per-DB query, so it always runs in
  // append mode (the model folds the request into the current builder AST).
  const startOptions = (): AssistantStartOptions => ({
    mode: "append",
    current: fromAdvanced(advancedState),
  })

  const handleApply = () => {
    if (!stream.proposal) return
    dispatch({ type: "replaceRoot", root: toAdvanced(stream.proposal).root })
    setInput("")
    stream.stop()
  }

  const handleReset = () => {
    setInput("")
    stream.stop()
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <SectionHeading id={headingId} subtitle={t("search.assistant.description")}>
        {t("search.assistant.heading")}
      </SectionHeading>
      <div className="rounded-card border border-border-soft bg-surface flex flex-col">
        <div className="p-3">
          <TextArea
            ariaLabel={t("search.a11y.assistantInput")}
            value={input}
            onChange={(event) => setInput(event.currentTarget.value)}
            placeholder={t("search.assistant.placeholderAppend")}
            rows={3}
          />
        </div>
        <div className="bg-surface-subtle border-t border-border-soft p-3 flex items-center gap-2">
          <Label>{t("search.assistant.examplesLabel")}</Label>
          <div className="flex flex-wrap gap-1">
            {examplesList.map((example) => (
              <Chip
                key={example}
                kind="example"
                as="button"
                onClick={() => setInput(example)}
              >
                {example}
              </Chip>
            ))}
          </div>
          <span className="ml-auto inline-flex items-center gap-2">
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
                  disabled={input.trim().length === 0}
                  onClick={() => void stream.start(input, startOptions())}
                >
                  {t("search.assistant.generate")}
                </Button>
              )}
          </span>
        </div>
        {stream.proposal && (
          <section
            aria-label={t("search.assistant.proposalLabel")}
            className="border-t border-border-soft p-3 flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <Tag kind="brand" size="sm">{t("search.assistant.proposalLabel")}</Tag>
              <span className="text-fs-label text-ink-mid">{t("search.assistant.proposalDescription")}</span>
            </div>
            <ProposalConditions node={stream.proposal} />
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                kind="secondary"
                size="md"
                disabled={input.trim().length === 0}
                onClick={() => void stream.start(input, startOptions())}
              >
                {t("search.assistant.regenerate")}
              </Button>
              <Button kind="secondary" size="md" onClick={handleReset}>
                {t("search.assistant.reset")}
              </Button>
              <Button kind="primary" size="md" onClick={handleApply}>
                {t("search.assistant.apply")}
              </Button>
            </div>
          </section>
        )}
      </div>
    </section>
  )
}
