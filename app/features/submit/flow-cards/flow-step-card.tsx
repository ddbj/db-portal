import type { FileEntry, FileGroup, FlowStep } from "~/schemas/submit"
import { Callout, cn, Label, Tag } from "~/ui"

import { AccessionCode } from "../components/accession-code"
import { ExternalLinkButton } from "../components/external-link-button"
import { FilesBlock } from "../components/files-block"
import { StepBadge } from "../components/step-badge"
import { getSubmitMeta } from "../external-links"
import { stepBadgeColor } from "../flow-rules"

type FlowStepCardProps = {
  step: FlowStep
  index: number
  groups: readonly FileGroup[]
  entries: readonly FileEntry[]
  serviceTitle: string
  serviceDescription: string
  accessionLabel: string
  filenameMissingLabel: string
  resolveNote: (messageKey: string) => string
  noteKindLabel: (kind: "warning" | "error") => string
  externalCtaLabel: string
  sourceTagLabel: (source: "DDBJ" | "DBCLS") => string
}

const borderColorFor = (step: FlowStep): string => {
  const color = stepBadgeColor(step)
  if (color === "rose") return "border-critical-border"
  if (color === "amber") return "border-warn-border"
  return "border-border-soft"
}

export const FlowStepCard = ({
  step,
  index,
  groups,
  entries,
  serviceTitle,
  serviceDescription,
  accessionLabel,
  filenameMissingLabel,
  resolveNote,
  noteKindLabel,
  externalCtaLabel,
  sourceTagLabel,
}: FlowStepCardProps) => {
  const pending = step.notes.some((n) => n.kind === "warning" || n.kind === "error")
  const scopeGroups = groups.filter((g) => step.scope.groupIds.includes(g.id))
  const scopeEntries = entries.filter((e) => step.scope.entryIds.includes(e.id))
  const meta = getSubmitMeta(step.service)
  const accession = meta?.accessionPlaceholders ?? []
  const externalUrl = meta?.externalUrl
  const source = meta?.source ?? null

  return (
    <li
      className={cn(
        "border bg-surface rounded-card p-4 shadow-card flex flex-col gap-3",
        borderColorFor(step),
      )}
    >
      <header className="flex items-center gap-3 flex-wrap">
        <StepBadge index={index} pending={pending} />
        {source !== null && (
          <Tag kind="source" name={source}>{sourceTagLabel(source)}</Tag>
        )}
        <h3 className="text-fs-h3 font-bold text-ink m-0 flex-1 min-w-0">
          {serviceTitle}
        </h3>
        {pending && (
          <Tag kind="status" tone="warning">{noteKindLabel("warning")}</Tag>
        )}
      </header>
      <p className="text-fs-body-sm text-ink-mid m-0 leading-relaxed">
        {serviceDescription}
      </p>
      {accession.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Label as="span">{accessionLabel}</Label>
          <AccessionCode codes={accession} />
        </div>
      )}
      {(scopeGroups.length > 0 || scopeEntries.length > 0) && (
        <FilesBlock
          groups={scopeGroups}
          entries={scopeEntries}
          filenameMissingLabel={filenameMissingLabel}
        />
      )}
      {step.notes.length > 0 && (
        <ul className="flex flex-col gap-1 m-0 list-none p-0">
          {step.notes.map((note, i) => {
            if (note.kind === "info") {
              return (
                <li key={i} className="text-fs-body-sm text-ink-mid">
                  {resolveNote(note.messageKey)}
                </li>
              )
            }
            return (
              <li key={i}>
                <Callout
                  tone="warn"
                  role={note.kind === "error" ? "alert" : "note"}
                >
                  {resolveNote(note.messageKey)}
                </Callout>
              </li>
            )
          })}
        </ul>
      )}
      {externalUrl !== undefined && (
        <div>
          <ExternalLinkButton url={externalUrl} label={externalCtaLabel} />
        </div>
      )}
    </li>
  )
}
