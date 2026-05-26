import type { FileEntry, FileGroup, FlowStep } from "~/schemas/submit"
import { Callout, cn, Label, Tag } from "~/ui"

import { AccessionCode } from "../components/accession-code"
import { ExternalLinkButton } from "../components/external-link-button"
import { FilesBlock } from "../components/files-block"
import { StepBadge } from "../components/step-badge"
import { getSubmitMeta } from "../external-links"

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
      data-testid="flow-step"
      data-service={step.service}
      className={cn(
        "border rounded-card flex flex-col gap-3",
        pending
          ? "bg-surface-subtle border-dashed border-border-soft"
          : "bg-surface border-border-soft shadow-card",
      )}
      style={{ padding: "20px 22px" }}
    >
      <header className="flex items-center gap-3 flex-wrap">
        <StepBadge index={index} pending={pending} />
        <h3 className="text-fs-card-title font-bold text-ink m-0 flex-1 min-w-0">
          {serviceTitle}
        </h3>
        {pending && (
          <Tag kind="status" tone="warning">{noteKindLabel("warning")}</Tag>
        )}
        {source !== null && (
          <Tag kind="source" name={source}>{sourceTagLabel(source)}</Tag>
        )}
      </header>
      {!pending && (
        <p className="text-fs-body-md text-ink-mid m-0 leading-loose">
          {serviceDescription}
        </p>
      )}
      {!pending && accession.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Label as="span">{accessionLabel}</Label>
          <AccessionCode codes={accession} />
        </div>
      )}
      {!pending && (scopeGroups.length > 0 || scopeEntries.length > 0) && (
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
      {!pending && externalUrl !== undefined && (
        <div>
          <ExternalLinkButton url={externalUrl} label={externalCtaLabel} />
        </div>
      )}
    </li>
  )
}
