import type { FileEntry, FileGroup, FlowStep } from "~/schemas/submit"
import { AlertIcon, Button, Callout, cn, Tag } from "~/ui"

import { ExternalLinkButton } from "../components/external-link-button"
import { FilesBlock } from "../components/files-block"
import { StepBadge } from "../components/step-badge"
import { getSubmitMeta } from "../external-links"
import { scrollToStep } from "./anchor"

// 依存グラフから導いた前提ステップ (フロー内に実在するもの)。click でそのカードへ scroll する。
export type Prerequisite = { name: string; stepIndex: number }

type FlowStepCardProps = {
  step: FlowStep
  index: number
  anchorId: string
  groups: readonly FileGroup[]
  entries: readonly FileEntry[]
  serviceTitle: string
  serviceDescription: string
  roleLabel: string
  prerequisites: readonly Prerequisite[]
  prereqHeading: string
  wizardSteps: readonly string[]
  wizardHeading: string
  prepare: readonly string[]
  prepareHeading: string
  filesHeading: string
  gotcha?: string | undefined
  gotchaHeading: string
  issuedNote?: string | undefined
  resolveNote: (messageKey: string) => string
  noteKindLabel: (kind: "warning" | "error") => string
  externalCtaLabel: string
  sourceTagLabel: (source: "DDBJ" | "DBCLS") => string
}

const sectionHeadingClass = "text-fs-label font-bold text-ink-mid m-0"

export const FlowStepCard = ({
  step,
  index,
  anchorId,
  groups,
  entries,
  serviceTitle,
  serviceDescription,
  roleLabel,
  prerequisites,
  prereqHeading,
  wizardSteps,
  wizardHeading,
  prepare,
  prepareHeading,
  filesHeading,
  gotcha,
  gotchaHeading,
  issuedNote,
  resolveNote,
  noteKindLabel,
  externalCtaLabel,
  sourceTagLabel,
}: FlowStepCardProps) => {
  const hasWarningOrError = step.notes.some((n) => n.kind === "warning" || n.kind === "error")
  const scopeGroups = groups.filter((g) => step.scope.groupIds.includes(g.id))
  const scopeEntries = entries.filter((e) => step.scope.entryIds.includes(e.id))
  const meta = getSubmitMeta(step.service)
  const externalUrl = meta?.externalUrl
  const source = meta?.source ?? null

  return (
    <li
      id={anchorId}
      data-testid="flow-step"
      data-service={step.service}
      className={cn(
        "border rounded-card flex flex-col gap-4 p-5 scroll-mt-4",
        hasWarningOrError
          ? "bg-surface-subtle border-dashed border-border-soft"
          : "bg-surface border-border-soft shadow-card",
      )}
    >
      <header className="flex items-center gap-2 flex-wrap">
        <StepBadge index={index} pending={hasWarningOrError} />
        <h3 className="text-fs-h2 font-bold text-ink m-0 leading-tight flex-1 min-w-0">
          {serviceTitle}
        </h3>
        <Tag>{roleLabel}</Tag>
        {hasWarningOrError && (
          <Tag kind="status" tone="warning">{noteKindLabel("warning")}</Tag>
        )}
        {source !== null && (
          <Tag kind="source" name={source}>{sourceTagLabel(source)}</Tag>
        )}
      </header>

      <p className="text-fs-body-sm text-ink-mid m-0 leading-relaxed">
        {serviceDescription}
      </p>

      {prerequisites.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className={sectionHeadingClass}>{prereqHeading}</p>
          <ul className="flex flex-wrap gap-2 m-0 list-none p-0">
            {prerequisites.map((p) => (
              <li key={p.stepIndex}>
                <Button kind="secondary" size="sm" onClick={() => scrollToStep(p.stepIndex)}>
                  <StepBadge index={p.stepIndex + 1} pending={false} />
                  <span className="text-fs-body-sm font-semibold text-ink">{p.name}</span>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(scopeGroups.length > 0 || scopeEntries.length > 0) && (
        <FilesBlock groups={scopeGroups} entries={scopeEntries} heading={filesHeading} />
      )}

      {prepare.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className={sectionHeadingClass}>{prepareHeading}</p>
          <ul className="flex flex-col gap-1 m-0 pl-5">
            {prepare.map((p, i) => (
              <li key={i} className="text-fs-body-sm text-ink-mid leading-relaxed list-disc">
                {p}
              </li>
            ))}
          </ul>
        </section>
      )}

      {wizardSteps.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className={sectionHeadingClass}>{wizardHeading}</p>
          <ol className="flex flex-col gap-1.5 m-0 list-none p-0">
            {wizardSteps.map((s, i) => (
              <li key={i} className="flex gap-2 text-fs-body-sm text-ink-mid leading-relaxed">
                <span className="font-mono text-fs-micro font-bold text-brand-deep shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="min-w-0">{s}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {wizardSteps.length > 0 && (
        <hr className="w-full border-0 border-t border-border-soft m-0" />
      )}

      {step.notes.length > 0 && (
        <ul className="flex flex-col gap-1 m-0 list-none p-0">
          {step.notes.map((note, i) => {
            if (note.kind === "info") {
              return (
                <li key={i} className="text-fs-body-sm text-ink-mid leading-relaxed">
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
                  <span className="flex items-start gap-1.5">
                    <AlertIcon size={14} aria-hidden className="shrink-0 mt-0.5" />
                    <span>{resolveNote(note.messageKey)}</span>
                  </span>
                </Callout>
              </li>
            )
          })}
        </ul>
      )}

      {gotcha !== undefined && gotcha.length > 0 && (
        <Callout tone="info">
          <span className="flex flex-col gap-1">
            <span className="font-bold text-ink">
              {gotchaHeading}
            </span>
            <span className="text-ink-mid">{gotcha}</span>
          </span>
        </Callout>
      )}

      {externalUrl !== undefined && (
        <div className="flex items-center gap-3 flex-wrap pt-1">
          <ExternalLinkButton url={externalUrl} label={externalCtaLabel} />
          {issuedNote !== undefined && issuedNote.length > 0 && (
            <span className="text-fs-micro text-ink-soft leading-snug min-w-0">{issuedNote}</span>
          )}
        </div>
      )}
    </li>
  )
}
