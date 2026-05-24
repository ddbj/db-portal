import { useState } from "react"

import { useT } from "~/lib/i18n"
import { Button, Chip, Label, Tag, TextArea } from "~/ui"

import {
  type AdvancedAction,
  type AdvancedState,
  createCondition,
  createGroup,
} from "../advanced"
import { useLlmAvailability } from "./llm-availability"
import {
  type AssistantProposal,
  useAssistantStream,
} from "./prompt-client"

export const applyProposalToAdvanced = (
  state: AdvancedState,
  proposal: AssistantProposal,
): AdvancedState => {
  const conditions = proposal.conditions.map((condition, index) =>
    createCondition({
      combinator: index === 0 ? "AND" : proposal.combinator,
      field: condition.field,
      op: condition.op,
      value: condition.value,
    }),
  )
  if (conditions.length === 0) return state
  const root = state.root
  if (proposal.combinator === "OR" && conditions.length > 1) {
    const group = createGroup(
      { combinator: "AND", innerCombinator: "OR" },
      conditions,
    )

    return { root: { ...root, children: [...root.children, group] } }
  }

  return { root: { ...root, children: [...root.children, ...conditions] } }
}

export type SearchAssistantProps = {
  advancedState: AdvancedState
  dispatch: (action: AdvancedAction) => void
  baseUrl?: string
}

export const SearchAssistant = ({ advancedState, dispatch, baseUrl }: SearchAssistantProps) => {
  const availability = useLlmAvailability()
  const t = useT()
  const [input, setInput] = useState("")
  const stream = useAssistantStream(baseUrl)
  if (!availability.ready) return null

  const examples = t("search.assistant.examples", { returnObjects: true }) as unknown as readonly string[]
  const examplesList: readonly string[] = Array.isArray(examples) ? examples : []

  const handleApply = () => {
    if (!stream.proposal) return
    const next = applyProposalToAdvanced(advancedState, stream.proposal)
    dispatch({ type: "replaceRoot", root: next.root })
    setInput("")
    stream.stop()
  }

  const handleReset = () => {
    setInput("")
    stream.stop()
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h3 className="text-fs-h3 font-bold text-ink m-0">{t("search.assistant.heading")}</h3>
        <p className="text-fs-body-sm text-ink-mid m-0 mt-1">{t("search.assistant.description")}</p>
      </div>
      <div className="rounded-card border border-border-soft bg-surface flex flex-col">
        <div className="p-3">
          <TextArea
            ariaLabel={t("search.a11y.assistantInput")}
            value={input}
            onChange={(event) => setInput(event.currentTarget.value)}
            placeholder={t("search.assistant.placeholder")}
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
                  onClick={() => stream.start(input)}
                >
                  {t("search.assistant.generate")}
                </Button>
              )}
          </span>
        </div>
        {stream.proposal && (
          <div className="border-t border-border-soft p-3 flex flex-col gap-2">
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
                  <span className="text-ink font-semibold">{condition.value}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <Button kind="secondary" size="sm" onClick={handleReset}>
                {t("search.assistant.reset")}
              </Button>
              <Button kind="primary" size="sm" onClick={handleApply}>
                {t("search.assistant.apply")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
