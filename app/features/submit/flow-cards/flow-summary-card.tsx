import { buildLoginUrl } from "~/lib/auth"
import { useLang } from "~/lib/i18n"
import type { Access, FileEntry, FileTypeKind, FlowStep, Service } from "~/schemas/submit"
import { isCompanionService, serviceRoleTagKey, stepPrerequisites } from "~/schemas/submit"
import { AlertIcon, Button, Callout, cn, LockClosedIcon, LockOpenIcon, Tag, TextLink, UserIcon } from "~/ui"

import { ExternalLinkButton } from "../components/external-link-button"
import { StepBadge } from "../components/step-badge"
import { getSubmitMeta } from "../external-links"
import type { Validation } from "../state/types"

type AccessSummary = ReadonlyMap<Access, FileTypeKind[]>
type GroupLabel = { title: string; sub: string }

type AccountStepLabels = {
  title: string
  description: string
  register: string
  login: string
}

type FlowSummaryCardProps = {
  steps: readonly FlowStep[]
  entries: readonly FileEntry[]
  isHuman: boolean
  isAuthenticated: boolean
  accessByKind: AccessSummary
  accessHeading: string
  accessLabel: (access: Access) => string
  accessOverview: { description: string; sub: string } | null
  groupLabels: {
    companion: GroupLabel
    restricted: GroupLabel
    open: GroupLabel
    destination: GroupLabel
  }
  accountLabels: AccountStepLabels
  serviceTitle: (service: Service) => string
  serviceDescription: (service: Service) => string
  fileTypeKindLabel: (kind: FileTypeKind) => string
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

export const FlowSummaryCard = (props: FlowSummaryCardProps) => {
  const {
    steps, entries, isHuman, isAuthenticated, accessByKind, accessHeading,
    accessLabel, accessOverview, groupLabels, accountLabels,
    serviceTitle, serviceDescription, fileTypeKindLabel,
    resolveNote, noteKindLabel, externalCtaLabel,
    prereqHeading, detailLinkLabel,
    validations, validationHeading, validationLabel, onJumpToRow,
  } = props
  const showAccountStep = !isAuthenticated
  const lang = useLang() as "ja" | "en"
  const presentServices = new Set(steps.map((s) => s.service))

  const companionSteps = steps.filter((s) => isCompanionService(s.service))
  const nonCompanionSteps = steps.filter((s) => !isCompanionService(s.service))

  const stepIsRestricted = (step: FlowStep): boolean => {
    if (serviceRoleTagKey(step.service) === "gate") return true
    const scoped = entries.filter((e) => step.scope.entryIds.includes(e.id))
    return scoped.some((e) => e.access === "restricted")
  }

  type GroupDef = {
    groupKey: string
    label: GroupLabel
    steps: readonly FlowStep[]
    accessBadge?: { access: Access; label: string }
  }
  const groups: GroupDef[] = []
  if (companionSteps.length > 0) {
    groups.push({ groupKey: "companion", label: groupLabels.companion, steps: companionSteps })
  }
  if (isHuman) {
    const restricted = nonCompanionSteps.filter(stepIsRestricted)
    const open = nonCompanionSteps.filter((s) => !stepIsRestricted(s))
    if (restricted.length > 0) {
      groups.push({
        groupKey: "restricted", label: groupLabels.restricted, steps: restricted,
        accessBadge: { access: "restricted", label: accessLabel("restricted") },
      })
    }
    if (open.length > 0) {
      groups.push({
        groupKey: "open", label: groupLabels.open, steps: open,
        accessBadge: { access: "open", label: accessLabel("open") },
      })
    }
  } else if (nonCompanionSteps.length > 0) {
    groups.push({ groupKey: "destination", label: groupLabels.destination, steps: nonCompanionSteps })
  }

  const stepProps = {
    lang, entries, presentServices,
    serviceTitle, serviceDescription, fileTypeKindLabel,
    resolveNote, noteKindLabel, externalCtaLabel, prereqHeading, detailLinkLabel,
  }

  return (
    <section
      data-testid="result-summary"
      className="flex flex-col gap-4"
    >
      {accessOverview !== null && (
        <AccessOverviewBlock
          accessByKind={accessByKind}
          accessHeading={accessHeading}
          accessLabel={accessLabel}
          description={accessOverview.description}
          sub={accessOverview.sub}
          fileTypeKindLabel={fileTypeKindLabel}
        />
      )}
      {showAccountStep && (
        <AccountStep labels={accountLabels} />
      )}
      {steps.length > 0 && groups.map((g, i) => (
        <StepGroup
          key={g.groupKey}
          groupIndex={i + 1}
          label={g.label}
          steps={g.steps}
          accessBadge={g.accessBadge}
          {...stepProps}
        />
      ))}

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
                <Button kind="link" onClick={onJumpToRow}>{prereqHeading}</Button>
              </li>
            ))}
          </ul>
        </Callout>
      )}
    </section>
  )
}

const AccessBadge = ({ access, label, className, variant = "filled" }: {
  access: Access
  label: string
  className?: string
  variant?: "filled" | "outline"
}) => {
  const Icon = access === "restricted" ? LockClosedIcon : LockOpenIcon
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-fs-label font-bold shrink-0",
      variant === "outline" ? "rounded-sm border px-1.5 py-px" : "rounded-full px-2 py-0.5",
      access === "restricted" ? "border-warn-border text-warn-fg" : "border-ok-border text-ok-fg",
      variant === "filled" && (access === "restricted" ? "bg-warn-bg" : "bg-ok-bg"),
      className,
    )}>
      <Icon size={12} className="text-ink-soft" aria-hidden />
      {label}
    </span>
  )
}

const AccessOverviewBlock = ({
  accessByKind, accessHeading, accessLabel, description, sub, fileTypeKindLabel,
}: {
  accessByKind: ReadonlyMap<Access, FileTypeKind[]>
  accessHeading: string
  accessLabel: (access: Access) => string
  description: string
  sub: string
  fileTypeKindLabel: (kind: FileTypeKind) => string
}) => {
  const hasRestricted = accessByKind.has("restricted")
  const hasOpen = accessByKind.has("open")
  const restricted = accessByKind.get("restricted") ?? []
  const open = accessByKind.get("open") ?? []

  return (
    <div className="border border-border-soft rounded-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-fs-body-sm font-semibold text-ink">{accessHeading}</span>
        {hasRestricted && <AccessBadge access="restricted" label={accessLabel("restricted")} />}
        {hasRestricted && hasOpen && (
          <span className="text-fs-micro text-ink-soft">+</span>
        )}
        {hasOpen && <AccessBadge access="open" label={accessLabel("open")} />}
      </div>
      <div>
        <p className="text-fs-body-sm text-ink m-0 leading-relaxed font-semibold">{description}</p>
        {sub !== "" && <p className="text-fs-micro text-ink-soft m-0 leading-relaxed">{sub}</p>}
      </div>
      {(hasRestricted || hasOpen) && (
        <div className={cn(
          "grid gap-3",
          hasRestricted && hasOpen ? "grid-cols-2" : "grid-cols-1",
        )}>
          {hasRestricted && (
            <KindBox access="restricted" label={accessLabel("restricted")} kinds={restricted} fileTypeKindLabel={fileTypeKindLabel} />
          )}
          {hasOpen && (
            <KindBox access="open" label={accessLabel("open")} kinds={open} fileTypeKindLabel={fileTypeKindLabel} />
          )}
        </div>
      )}
    </div>
  )
}

const KindBox = ({ access, label, kinds, fileTypeKindLabel }: {
  access: Access
  label: string
  kinds: readonly FileTypeKind[]
  fileTypeKindLabel: (kind: FileTypeKind) => string
}) => (
  <div className={cn(
    "rounded-button px-3 py-1.5 flex flex-col gap-1.5 items-start border",
    access === "restricted" ? "bg-warn-bg border-warn-border" : "bg-ok-bg border-ok-border",
  )}>
    <AccessBadge access={access} label={label} variant="outline" />
    <div className="flex flex-wrap gap-1">
      {kinds.map((k) => <Tag key={k} size="sm" kind="brand">{fileTypeKindLabel(k)}</Tag>)}
    </div>
  </div>
)

type StepItemProps = {
  lang: "ja" | "en"
  entries: readonly FileEntry[]
  presentServices: ReadonlySet<Service>
  serviceTitle: (service: Service) => string
  serviceDescription: (service: Service) => string
  fileTypeKindLabel: (kind: FileTypeKind) => string
  resolveNote: (messageKey: string) => string
  noteKindLabel: (kind: "warning" | "error") => string
  externalCtaLabel: string
  prereqHeading: string
  detailLinkLabel: string
}

const StepGroup = ({
  groupIndex, label, steps, accessBadge, ...ip
}: {
  groupIndex: number
  label: GroupLabel
  steps: readonly FlowStep[]
  accessBadge: { access: Access; label: string } | undefined
} & StepItemProps) => (
  <div>
    <div className="flex items-center gap-2 mb-1">
      <StepBadge index={groupIndex} pending={false} />
      <span className="text-fs-body font-bold text-ink leading-snug">{label.title}</span>
      <span className="text-fs-micro text-ink-soft leading-snug">{label.sub}</span>
      {accessBadge !== undefined && (
        <AccessBadge access={accessBadge.access} label={accessBadge.label} className="ml-auto" />
      )}
    </div>
    <ol className="flex flex-col m-0 list-none p-0 ml-3">
      {steps.map((step, i) => (
        <TimelineStepItem key={step.id} step={step} isFirst={i === 0} isLast={i === steps.length - 1} {...ip} />
      ))}
    </ol>
  </div>
)

const TimelineStepItem = ({
  step, isFirst, isLast, lang, entries, presentServices,
  serviceTitle, serviceDescription, fileTypeKindLabel,
  resolveNote, noteKindLabel, externalCtaLabel, prereqHeading, detailLinkLabel,
}: { step: FlowStep; isFirst: boolean; isLast: boolean } & StepItemProps) => {
  const meta = getSubmitMeta(step.service, lang)
  const isComp = isCompanionService(step.service)

  const scopeKinds = isComp ? [] : [...new Set(
    entries.filter((e) => step.scope.entryIds.includes(e.id)).map((e) => e.fileTypeKind),
  )]
  const warnNotes = step.notes.filter(
    (n): n is typeof n & { kind: "warning" | "error" } => n.kind === "warning" || n.kind === "error",
  )
  const prereqs = stepPrerequisites(step.service, presentServices)
    .filter((dep) => !isCompanionService(dep)).map(serviceTitle)

  return (
    <li data-testid="flow-step" data-service={step.service} className="flex gap-2.5">
      <div className="flex flex-col items-center w-2 shrink-0">
        <div className={cn("w-0.5 h-6 shrink-0", !isFirst && "bg-border-soft")} />
        <span className="w-2 h-2 rounded-full bg-ink-softer shrink-0" />
        <div className={cn("w-0.5 flex-1", !isLast && "bg-border-soft")} />
      </div>

      <div className={cn("flex-1 border border-border-soft rounded-card min-w-0 bg-surface", isComp ? "px-4 py-3" : "p-4", !isLast && "mb-3")}>
        {isComp
          ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-fs-body font-semibold text-ink leading-snug">
                {serviceTitle(step.service)}
              </span>
              <div className="flex items-center gap-3 shrink-0">
                <TextLink to={`/databases/${step.service}`} arrow>{detailLinkLabel}</TextLink>
                {meta?.externalUrl !== undefined && (
                  <ExternalLinkButton url={meta.externalUrl} label={externalCtaLabel} />
                )}
              </div>
            </div>
          )
          : (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-fs-body font-semibold text-ink leading-snug shrink-0">
                  {serviceTitle(step.service)}
                </span>
                {scopeKinds.length > 0 && (
                  <div className="flex gap-1 flex-wrap justify-end min-w-0">
                    {scopeKinds.map((k) => <Tag key={k} size="sm" kind="brand">{fileTypeKindLabel(k)}</Tag>)}
                  </div>
                )}
              </div>

              <p className="text-fs-micro text-ink-mid m-0 leading-relaxed">
                {serviceDescription(step.service)}
              </p>

              {warnNotes.length > 0 && (
                <ul className="flex flex-col gap-1 m-0 list-none p-0">
                  {warnNotes.map((note, ni) => (
                    <li key={ni} className="flex gap-1.5 items-start">
                      <Tag kind="status" tone={note.kind === "error" ? "critical" : "warning"} size="sm">
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
                  <span className="text-fs-body-sm text-ink leading-snug">{prereqs.join(" · ")}</span>
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap justify-end">
                <TextLink to={`/databases/${step.service}`} arrow>{detailLinkLabel}</TextLink>
                {meta?.externalUrl !== undefined && (
                  <ExternalLinkButton url={meta.externalUrl} label={externalCtaLabel} />
                )}
              </div>
            </div>
          )}
      </div>
    </li>
  )
}

const DDBJ_ACCOUNT_URL = "https://accounts.ddbj.nig.ac.jp"

const navigateToLogin = () => {
  if (typeof window === "undefined") return
  window.location.href = buildLoginUrl("/submit")
}

const AccountStep = ({ labels }: { labels: AccountStepLabels }) => (
  <div>
    <div className="flex items-center gap-2 mb-1">
      <StepBadge index={0} pending={true} />
      <span className="text-fs-body font-bold text-ink leading-snug">{labels.title}</span>
    </div>
    <div className="ml-3 flex gap-2.5">
      <div className="flex flex-col items-center w-2 shrink-0">
        <div className="w-0.5 h-6 shrink-0" />
        <span className="w-2 h-2 rounded-full bg-ink-softer shrink-0" />
        <div className="w-0.5 flex-1" />
      </div>
      <div className="flex-1 border border-border-soft rounded-card p-4 min-w-0 bg-surface">
        <p className="text-fs-micro text-ink-mid m-0 leading-relaxed">{labels.description}</p>
        <div className="flex items-center gap-3 flex-wrap mt-3">
          <TextLink href={DDBJ_ACCOUNT_URL} external>{labels.register}</TextLink>
          <Button kind="secondary" size="sm" onClick={navigateToLogin}>
            <span className="inline-flex items-center gap-1.5">
              <UserIcon size={14} aria-hidden />
              {labels.login}
            </span>
          </Button>
        </div>
      </div>
    </div>
  </div>
)
