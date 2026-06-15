import { useLang } from "~/lib/i18n"
import type { FileEntry, FileTypeKind, FlowStep, Service } from "~/schemas/submit"
import { stepPrerequisites } from "~/schemas/submit"
import { AlertIcon, Button, Callout, Tag, TextLink } from "~/ui"

import { ExternalLinkButton } from "../components/external-link-button"
import { StepBadge } from "../components/step-badge"
import { getSubmitMeta } from "../external-links"
import type { Validation } from "../state/types"

type FlowSummaryCardProps = {
  steps: readonly FlowStep[]
  entries: readonly FileEntry[]
  emptyMessage: string
  serviceTitle: (service: Service) => string
  fileTypeKindLabel: (kind: FileTypeKind) => string
  roleLabel: (service: Service) => string
  resolveNote: (messageKey: string) => string
  noteKindLabel: (kind: "warning" | "error") => string
  externalCtaLabel: string
  prereqHeading: string
  detailLinkLabel: string
  validations: readonly Validation[]
  validationHeading: string
  validationLabel: (validation: Validation) => string
  onJumpToRow: () => void
}

export const FlowSummaryCard = ({
  steps,
  entries,
  emptyMessage,
  serviceTitle,
  fileTypeKindLabel,
  roleLabel,
  resolveNote,
  noteKindLabel,
  externalCtaLabel,
  prereqHeading,
  detailLinkLabel,
  validations,
  validationHeading,
  validationLabel,
  onJumpToRow,
}: FlowSummaryCardProps) => {
  const lang = useLang()

  if (steps.length === 0) {
    return (
      <section
        data-testid="result-summary"
        className="border border-border-soft rounded-card bg-surface shadow-card p-5"
      >
        <p className="text-fs-body-sm text-ink-soft m-0 leading-relaxed">{emptyMessage}</p>
      </section>
    )
  }

  const presentServices = new Set(steps.map((s) => s.service))

  return (
    <section
      data-testid="result-summary"
      className="border border-border-soft rounded-card bg-surface shadow-card p-5 flex flex-col gap-5"
    >
      <ol className="flex flex-col m-0 list-none p-0">
        {steps.map((step, i) => (
          <SummaryStepItem
            key={step.id}
            step={step}
            index={i}
            lang={lang}
            entries={entries}
            presentServices={presentServices}
            serviceTitle={serviceTitle}
            fileTypeKindLabel={fileTypeKindLabel}
            roleLabel={roleLabel}
            resolveNote={resolveNote}
            noteKindLabel={noteKindLabel}
            externalCtaLabel={externalCtaLabel}
            prereqHeading={prereqHeading}
            detailLinkLabel={detailLinkLabel}
          />
        ))}
      </ol>

      {validations.length > 0 && (
        <Callout tone="warn" role="alert">
          <p className="font-semibold m-0 flex items-center gap-1.5">
            <AlertIcon size={15} aria-hidden className="shrink-0" />
            {validationHeading}
          </p>
          <ul className="mt-2 flex flex-col gap-1 m-0 list-disc list-inside p-0">
            {validations.map((v, i) => (
              <li key={`${v.entryId}-${v.kind}-${i}`}>
                <span className="text-fs-body-sm">{validationLabel(v)}</span>
                {" "}
                <Button kind="link" onClick={onJumpToRow}>
                  {prereqHeading}
                </Button>
              </li>
            ))}
          </ul>
        </Callout>
      )}
    </section>
  )
}

type SummaryStepItemProps = {
  step: FlowStep
  index: number
  lang: string
  entries: readonly FileEntry[]
  presentServices: ReadonlySet<Service>
  serviceTitle: (service: Service) => string
  fileTypeKindLabel: (kind: FileTypeKind) => string
  roleLabel: (service: Service) => string
  resolveNote: (messageKey: string) => string
  noteKindLabel: (kind: "warning" | "error") => string
  externalCtaLabel: string
  prereqHeading: string
  detailLinkLabel: string
}

const SummaryStepItem = ({
  step,
  index,
  lang,
  entries,
  presentServices,
  serviceTitle,
  fileTypeKindLabel,
  roleLabel,
  resolveNote,
  noteKindLabel,
  externalCtaLabel,
  prereqHeading,
  detailLinkLabel,
}: SummaryStepItemProps) => {
  const meta = getSubmitMeta(step.service, lang as "ja" | "en")
  const prereqs = stepPrerequisites(step.service, presentServices).map(serviceTitle)
  const hasWarnOrError = step.notes.some((n) => n.kind === "warning" || n.kind === "error")

  const scopeKinds = [...new Set(
    entries
      .filter((e) => step.scope.entryIds.includes(e.id))
      .map((e) => e.fileTypeKind),
  )]

  const warnNotes = step.notes.filter((n): n is typeof n & { kind: "warning" | "error" } =>
    n.kind === "warning" || n.kind === "error",
  )
  const infoNotes = step.notes.filter((n) => n.kind === "info")

  return (
    <li
      data-testid="flow-step"
      data-service={step.service}
      className="flex gap-3 py-4 border-b border-border-soft first:pt-0 last:border-b-0 last:pb-0"
    >
      <div className="flex items-center h-6 shrink-0">
        <StepBadge index={index + 1} pending={hasWarnOrError} />
      </div>
      <div className="min-w-0 flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap h-6">
          <span className="text-fs-body font-semibold text-ink leading-none">{serviceTitle(step.service)}</span>
          <Tag size="sm">{roleLabel(step.service)}</Tag>
        </div>

        {scopeKinds.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {scopeKinds.map((kind) => (
              <Tag key={kind} size="sm" kind="brand">{fileTypeKindLabel(kind)}</Tag>
            ))}
          </div>
        )}

        {infoNotes.length > 0 && (
          <ul className="flex flex-col gap-0.5 m-0 list-none p-0">
            {infoNotes.map((note, ni) => (
              <li
                key={ni}
                className="text-fs-micro text-ink-soft leading-relaxed"
              >
                {resolveNote(note.messageKey)}
              </li>
            ))}
          </ul>
        )}

        {warnNotes.length > 0 && (
          <ul className="flex flex-col gap-1 m-0 list-none p-0">
            {warnNotes.map((note, ni) => (
              <li key={ni} className="flex gap-1.5 items-start">
                <Tag
                  kind="status"
                  tone={note.kind === "error" ? "critical" : "warning"}
                  size="sm"
                >
                  {noteKindLabel(note.kind)}
                </Tag>
                <span className="text-fs-body-sm text-warn-fg leading-relaxed min-w-0">
                  {resolveNote(note.messageKey)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {prereqs.length > 0 && (
          <span className="text-fs-micro text-ink-soft leading-snug">
            {prereqHeading}: {prereqs.join(" · ")}
          </span>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <TextLink to={`/databases/${step.service}`} arrow>
            {detailLinkLabel}
          </TextLink>
          {meta?.externalUrl !== undefined && (
            <ExternalLinkButton url={meta.externalUrl} label={externalCtaLabel} />
          )}
        </div>
      </div>
    </li>
  )
}
