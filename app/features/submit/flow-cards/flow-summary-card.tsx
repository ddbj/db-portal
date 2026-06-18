import { useLang } from "~/lib/i18n"
import type { Access, FileEntry, FileTypeKind, FlowStep, Service } from "~/schemas/submit"
import { isCompanionService, stepPrerequisites } from "~/schemas/submit"
import { AlertIcon, Button, Callout, cn, Tag, TextLink } from "~/ui"

import { ExternalLinkButton } from "../components/external-link-button"
import { getSubmitMeta } from "../external-links"
import type { Validation } from "../state/types"

type AccessSummary = ReadonlyMap<Access, FileTypeKind[]>

type FlowSummaryCardProps = {
  steps: readonly FlowStep[]
  entries: readonly FileEntry[]
  accessByKind: AccessSummary
  accessHeading: string
  accessLabel: (access: Access) => string
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
  accessByKind,
  accessHeading,
  accessLabel,
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

  const presentServices = new Set(steps.map((s) => s.service))

  return (
    <section
      data-testid="result-summary"
      className="border border-border-soft rounded-card bg-surface shadow-card p-5 flex flex-col gap-5"
    >
      {steps.length === 0
        ? <p className="text-fs-body-sm text-ink-soft m-0 leading-relaxed">{emptyMessage}</p>
        : (
          <>
            {accessByKind.size > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-fs-body-sm font-semibold text-ink">{accessHeading}</span>
                {(["restricted", "open"] as const).map((access) => {
                  const kinds = accessByKind.get(access)
                  if (kinds === undefined || kinds.length === 0) return null

                  return (
                    <div key={access} className="flex items-baseline gap-2 flex-wrap">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-fs-label font-bold shrink-0",
                          access === "restricted"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800",
                        )}
                      >
                        {accessLabel(access)}
                      </span>
                      <span className="text-fs-micro text-ink-mid">
                        {kinds.map((k) => fileTypeKindLabel(k)).join("、")}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            <ol className="flex flex-col m-0 list-none p-0 border-t border-border-soft">
              {steps.map((step) => (
                <SummaryStepItem
                  key={step.id}
                  step={step}
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
          </>
        )}

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
  const isCompanion = isCompanionService(step.service)
  const prereqs = stepPrerequisites(step.service, presentServices)
    .filter((dep) => !isCompanionService(dep))
    .map(serviceTitle)

  const warnNotes = step.notes.filter((n): n is typeof n & { kind: "warning" | "error" } =>
    n.kind === "warning" || n.kind === "error",
  )

  const scopeKinds = isCompanion
    ? []
    : [...new Set(
      entries
        .filter((e) => step.scope.entryIds.includes(e.id))
        .map((e) => e.fileTypeKind),
    )]

  const infoNotes = isCompanion
    ? []
    : step.notes.filter((n) => n.kind === "info")

  return (
    <li
      data-testid="flow-step"
      data-service={step.service}
      className="flex flex-col gap-2 py-4 border-b border-border-soft first:pt-4 last:border-b-0 last:pb-0"
    >
      <div className="flex items-center gap-2 flex-wrap">
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
            <li key={ni} className="text-fs-micro text-ink-soft leading-relaxed">
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
        <div className="flex gap-1.5 items-baseline">
          <Tag kind="status" tone="warning" size="sm">{prereqHeading}</Tag>
          <span className="text-fs-body-sm text-ink leading-snug">
            {prereqs.join(" · ")}
          </span>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <TextLink to={`/databases/${step.service}`} arrow>
          {detailLinkLabel}
        </TextLink>
        {meta?.externalUrl !== undefined && (
          <ExternalLinkButton url={meta.externalUrl} label={externalCtaLabel} />
        )}
      </div>
    </li>
  )
}
