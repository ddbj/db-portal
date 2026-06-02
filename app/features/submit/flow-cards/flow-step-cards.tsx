import type { FileEntry, FileTypeKind, FlowStep, Service } from "~/schemas/submit"
import { isDestinationService, stepPrerequisites } from "~/schemas/submit"

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
  entries: readonly FileEntry[]
  fileTypeKindLabel: (kind: FileTypeKind) => string
  emptyMessage: string
  serviceTitle: (service: Service) => string
  serviceDescription: (service: Service) => string
  roleLabel: (service: Service) => string
  cardCopy: (service: Service) => CardCopy
  prereqHeading: string
  wizardHeading: string
  prepareHeading: string
  filesHeading: string
  gotchaHeading: string
  resolveNote: (messageKey: string) => string
  noteKindLabel: (kind: "warning" | "error") => string
  externalCtaLabel: string
  sourceTagLabel: (source: "DDBJ" | "DBCLS") => string
}

export const FlowStepCards = ({
  steps,
  entries,
  fileTypeKindLabel,
  emptyMessage,
  serviceTitle,
  serviceDescription,
  roleLabel,
  cardCopy,
  prereqHeading,
  wizardHeading,
  prepareHeading,
  filesHeading,
  gotchaHeading,
  resolveNote,
  noteKindLabel,
  externalCtaLabel,
  sourceTagLabel,
}: FlowStepCardsProps) => {
  if (steps.length === 0) {
    return <FlowEmptyState message={emptyMessage} />
  }

  const presentServices = new Set(steps.map((s) => s.service))

  const scopesOverlap = (a: FlowStep["scope"], b: FlowStep["scope"]): boolean =>
    a.entryIds.some((id) => b.entryIds.includes(id)) ||
    a.groupIds.some((id) => b.groupIds.includes(id))

  // 当該ステップの前提を、依存グラフ (フロー内に実在するもの) から算出する。
  // 一次データ (dra = destination 役割の前提) は、データ系統 (scope) が当該ステップと
  // 重なる前提ステップだけを出す。混在フローで無関係な DRA が前提として誤表示されるのを防ぐ。
  // companion (bioproject/biosample) と gate (humandbs) は submission 全体の前提なので常に出す。
  const prerequisitesFor = (step: FlowStep): Prerequisite[] =>
    stepPrerequisites(step.service, presentServices).flatMap((dep) => {
      const candidates = steps.filter((s) => s.service === dep)
      const relevant = isDestinationService(dep)
        ? candidates.filter((s) => scopesOverlap(s.scope, step.scope))
        : candidates
      const target = relevant[0]
      if (target === undefined) return []

      return [{ name: serviceTitle(dep), stepIndex: steps.indexOf(target) }]
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
            entries={entries}
            fileTypeKindLabel={fileTypeKindLabel}
            serviceTitle={serviceTitle(step.service)}
            serviceDescription={serviceDescription(step.service)}
            roleLabel={roleLabel(step.service)}
            prerequisites={prerequisitesFor(step)}
            prereqHeading={prereqHeading}
            wizardSteps={copy.wizardSteps}
            wizardHeading={wizardHeading}
            prepare={copy.prepare}
            prepareHeading={prepareHeading}
            filesHeading={filesHeading}
            gotcha={copy.gotcha}
            gotchaHeading={gotchaHeading}
            issuedNote={copy.issuedNote}
            resolveNote={resolveNote}
            noteKindLabel={noteKindLabel}
            externalCtaLabel={externalCtaLabel}
            sourceTagLabel={sourceTagLabel}
          />
        )
      })}
    </ol>
  )
}
