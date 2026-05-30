import type { FileEntry, FileGroup, FlowStep, Service } from "~/schemas/submit"
import { stepPrerequisites } from "~/schemas/submit"

import { stepAnchorId } from "./anchor"
import { FlowEmptyState } from "./flow-empty-state"
import { FlowStepCard, type Prerequisite } from "./flow-step-card"

type CardCopy = {
  wizardSteps: readonly string[]
  prepare: readonly string[]
  gotcha?: string | undefined
  issuedNote?: string | undefined
}

type FlowStepCardsProps = {
  steps: readonly FlowStep[]
  groups: readonly FileGroup[]
  entries: readonly FileEntry[]
  emptyMessage: string
  serviceTitle: (service: Service) => string
  serviceDescription: (service: Service) => string
  roleLabel: (service: Service) => string
  cardCopy: (service: Service) => CardCopy
  prereqHeading: string
  wizardHeading: string
  prepareHeading: string
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
  roleLabel,
  cardCopy,
  prereqHeading,
  wizardHeading,
  prepareHeading,
  resolveNote,
  noteKindLabel,
  externalCtaLabel,
  sourceTagLabel,
}: FlowStepCardsProps) => {
  if (steps.length === 0) {
    return <FlowEmptyState message={emptyMessage} />
  }

  const presentServices = new Set(steps.map((s) => s.service))
  const firstIndexOf = new Map<Service, number>()
  steps.forEach((s, i) => {
    if (!firstIndexOf.has(s.service)) firstIndexOf.set(s.service, i)
  })

  const prerequisitesFor = (service: Service): Prerequisite[] =>
    stepPrerequisites(service, presentServices).flatMap((dep) => {
      const stepIndex = firstIndexOf.get(dep)
      if (stepIndex === undefined) return []

      return [{ name: serviceTitle(dep), stepIndex }]
    })

  return (
    <ol className="flex flex-col gap-4 m-0 list-none p-0">
      {steps.map((step, i) => {
        const copy = cardCopy(step.service)

        return (
          <FlowStepCard
            key={step.id}
            step={step}
            index={i + 1}
            anchorId={stepAnchorId(i)}
            groups={groups}
            entries={entries}
            serviceTitle={serviceTitle(step.service)}
            serviceDescription={serviceDescription(step.service)}
            roleLabel={roleLabel(step.service)}
            prerequisites={prerequisitesFor(step.service)}
            prereqHeading={prereqHeading}
            wizardSteps={copy.wizardSteps}
            wizardHeading={wizardHeading}
            prepare={copy.prepare}
            prepareHeading={prepareHeading}
            gotcha={copy.gotcha}
            issuedNote={copy.issuedNote}
            resolveNote={resolveNote}
            noteKindLabel={noteKindLabel}
            externalCtaLabel={externalCtaLabel(step.service)}
            sourceTagLabel={sourceTagLabel}
          />
        )
      })}
    </ol>
  )
}
