import { Fragment } from "react"

import { useT } from "~/lib/i18n"

import { fieldLabelKey, predicateLabelKey } from "../types"
import type { AssistantProposal } from "./prompt-client"

export type ProposalConditionsProps = {
  proposal: AssistantProposal
}

// Render an AI proposal as readable clauses ("学名 と一致 Homo sapiens") rather
// than raw `field op value`, so it reads like the builder rows. The join
// operator (AND / OR) is shown between conditions.
export const ProposalConditions = ({ proposal }: ProposalConditionsProps) => {
  const t = useT()

  return (
    <ul className="list-none p-0 m-0 flex flex-col gap-1">
      {proposal.conditions.map((condition, index) => (
        <Fragment key={`${condition.field}-${index}`}>
          {index > 0 && (
            <li className="py-0.5 pl-3 font-mono text-fs-meta font-bold text-brand-deep" aria-hidden>
              {proposal.combinator}
            </li>
          )}
          <li className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-button border border-border-soft bg-surface-subtle px-2.5 py-1.5">
            <span className="rounded-button bg-brand-soft px-2 py-0.5 text-fs-label font-semibold text-brand-deep">
              {t(`search.builder.field.${fieldLabelKey(condition.field)}`)}
            </span>
            <span className="text-fs-label text-ink-soft">
              {t(`search.builder.predicate.${predicateLabelKey({ op: condition.op, negated: false })}`)}
            </span>
            <span className="min-w-0 font-mono text-fs-body-sm font-semibold text-ink break-all">
              {condition.op === "between"
                ? `${condition.from} 〜 ${condition.to}`
                : condition.value}
            </span>
          </li>
        </Fragment>
      ))}
    </ul>
  )
}
