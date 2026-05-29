import type { FileEntry, FileGroup, FlowStep, Service } from "~/schemas/submit"

import { FlowEmptyState } from "./flow-empty-state"
import { FlowStepCard } from "./flow-step-card"

type FlowStepCardsProps = {
  steps: readonly FlowStep[]
  groups: readonly FileGroup[]
  entries: readonly FileEntry[]
  emptyMessage: string
  serviceTitle: (service: Service) => string
  serviceDescription: (service: Service) => string
  accessionLabel: string
  resolveNote: (messageKey: string) => string
  noteKindLabel: (kind: "warning" | "error") => string
  externalCtaLabel: (service: Service) => string
  sourceTagLabel: (source: "DDBJ" | "DBCLS") => string
}

export const FlowStepCards = ({
  steps,
  groups,
  entries,
  emptyMessage,
  serviceTitle,
  serviceDescription,
  accessionLabel,
  resolveNote,
  noteKindLabel,
  externalCtaLabel,
  sourceTagLabel,
}: FlowStepCardsProps) => {
  if (steps.length === 0) {
    return <FlowEmptyState message={emptyMessage} />
  }
  return (
    <ol className="flex flex-col gap-4 m-0 list-none p-0">
      {steps.map((step, i) => (
        <FlowStepCard
          key={step.id}
          step={step}
          index={i + 1}
          groups={groups}
          entries={entries}
          serviceTitle={serviceTitle(step.service)}
          serviceDescription={serviceDescription(step.service)}
          accessionLabel={accessionLabel}
          resolveNote={resolveNote}
          noteKindLabel={noteKindLabel}
          externalCtaLabel={externalCtaLabel(step.service)}
          sourceTagLabel={sourceTagLabel}
        />
      ))}
    </ol>
  )
}
