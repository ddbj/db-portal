import { useMemo } from "react"

import {
  countConfiguredRows,
  DataDetailPanel,
  FileTypeGrid,
  FlowSummaryCard,
  isKindEnabled,
  RadioCardGroup,
  rowIsConfigured,
  selectSteps,
  selectValidations,
  TagProgress,
  useSubmitState,
} from "~/features/submit"
import { useAuth } from "~/lib/auth"
import { pageTitleMeta } from "~/lib/content"
import { useT } from "~/lib/i18n"
import type { Access, FileTypeKind, Q2, Service } from "~/schemas/submit"
import { Q2 as Q2Enum } from "~/schemas/submit"
import type { AccessSection } from "~/schemas/submit/submission"
import { PageTitle, Section, SectionHeading, Toggle } from "~/ui"
import { cn } from "~/ui/cn"

export const handle = {
  lang: undefined,
  i18n: { en: "complete" },
  titleSegments: ["Submit"],
} as const

export const meta = pageTitleMeta

const SubmitRoute = () => {
  const t = useT()
  const auth = useAuth()
  const { state, actions } = useSubmitState()
  const { q2 } = state.submission.preconditions
  const { accessSection } = state.submission
  const isHuman = q2 === "human"

  const { fileEntries } = state.submission
  const accessByKind = useMemo(() => {
    if (q2 === null) return new Map<Access, FileTypeKind[]>()
    const map = new Map<Access, FileTypeKind[]>()
    for (const e of fileEntries) {
      const list = map.get(e.access) ?? []
      if (!list.includes(e.fileTypeKind)) list.push(e.fileTypeKind)
      map.set(e.access, list)
    }
    if (fileEntries.length === 0 && q2 === "human") {
      const { restrictedPreference, ethicsCompliance, publiclyAvailable, microbialAnalysis } = accessSection
      if (restrictedPreference) {
        map.set("restricted", [])
      } else if (ethicsCompliance) {
        map.set("restricted", [])
        map.set("open", [])
      } else if (publiclyAvailable || microbialAnalysis) {
        map.set("open", [])
      } else {
        map.set("restricted", [])
      }
    }
    return map
  }, [q2, fileEntries, accessSection])
  const steps = selectSteps(state)
  const validations = selectValidations(state)
  const { configured, total } = countConfiguredRows(state)

  const accessOverview = (() => {
    if (!isHuman || accessByKind.size === 0) return null
    const hasRestricted = accessByKind.has("restricted")
    const hasOpen = accessByKind.has("open")
    if (hasRestricted && hasOpen) {
      return { description: t("submit.flow.accessOverview.mixed"), sub: t("submit.flow.accessOverview.mixedSub") }
    }
    if (hasRestricted) {
      return { description: t("submit.flow.accessOverview.allRestricted"), sub: t("submit.flow.accessOverview.allRestrictedSub") }
    }
    return { description: t("submit.flow.accessOverview.allOpen"), sub: t("submit.flow.accessOverview.allOpenSub") }
  })()

  const groupLabels = {
    companion: { title: t("submit.flow.group.companion.title"), sub: t("submit.flow.group.companion.sub") },
    restricted: { title: t("submit.flow.group.restricted.title"), sub: t("submit.flow.group.restricted.sub") },
    open: { title: t("submit.flow.group.open.title"), sub: t("submit.flow.group.open.sub") },
    destination: { title: t("submit.flow.group.destination.title"), sub: t("submit.flow.group.destination.sub") },
  }

  const validationHeading = t("submit.validations.heading", { count: validations.length })

  const fileTypeKindLabel = (k: FileTypeKind): string => t(`submit.fileType.${k}`)
  const serviceTitle = (s: Service): string => t(`submit.flow.${s}.title`)
  const serviceDescription = (s: Service): string => t(`submit.flow.${s}.description`)
  const noteKindLabel = (kind: "warning" | "error"): string =>
    kind === "warning" ? t("submit.flow.noteWarning") : t("submit.flow.noteError")

  const resolveNote = (key: string): string => {
    const value = t(key)

    return value === key ? "" : value
  }

  const optionSub = (subKey: string | undefined): string | undefined => {
    if (subKey === undefined) return undefined
    const value = t(subKey)

    return value === subKey ? undefined : value
  }

  const q2Options = Q2Enum.options.map((v) => ({
    value: v,
    label: t(`submit.preconditions.q2.${v}.label`),
    sub: t(`submit.preconditions.q2.${v}.sub`),
  }))
  const gridDisabledReason = q2 === null
    ? t("submit.preconditions.q2Required")
    : t("submit.preconditions.kindDisabledReason")

  const selectedKinds = new Set(state.submission.fileEntries.map((e) => e.fileTypeKind))
  const onToggleKind = (k: FileTypeKind): void => {
    const existing = state.submission.fileEntries.find((e) => e.fileTypeKind === k)
    if (existing) actions.removeRow(existing.id)
    else actions.addRow(k)
  }

  const scrollToKinds = (): void => {
    if (typeof document === "undefined") return
    document.getElementById("submit-kind-selection")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <>
      <PageTitle title={t("submit.pageTitle")} />
      <Section padTop="none" padBottom="lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-10 items-start">
          <div className="flex flex-col gap-8 min-w-0 lg:col-span-6">
            <div>
              <SectionHeading>{t("submit.sections.preconditions")}</SectionHeading>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-fs-body-sm font-semibold text-ink mt-0 mb-2">
                    {t("submit.preconditions.q2Heading")}
                  </p>
                  <RadioCardGroup
                    ariaLabel={t("submit.preconditions.q2Heading")}
                    name="precondition-q2"
                    value={q2}
                    options={q2Options}
                    onChange={(v) => actions.setQ2(v as Q2)}
                  />
                </div>
                <AccessSectionPanel
                  q2={q2}
                  section={accessSection}
                  isHuman={isHuman}
                  onChange={actions.setAccessSection}
                />
              </div>
            </div>

            <div id="submit-kind-selection">
              <SectionHeading>{t("submit.sections.table")}</SectionHeading>
              <FileTypeGrid
                onToggle={onToggleKind}
                getLabel={fileTypeKindLabel}
                isSelected={(k) => selectedKinds.has(k)}
                isEnabled={(k) => isKindEnabled(q2, k)}
                disabledReason={gridDisabledReason}
                conflictReason={t("submit.preconditions.kindConflictReason")}
              />
            </div>

            {total > 0 && (
              <div>
                <SectionHeading>{t("submit.detail.heading")}</SectionHeading>
                <div className="flex flex-col gap-3">
                  <TagProgress
                    configured={configured}
                    total={total}
                    heading={t("submit.progress.heading")}
                    countLabel={`${configured} / ${total}`}
                  />
                  <DataDetailPanel
                    entries={state.submission.fileEntries}
                    groups={state.submission.fileGroups}
                    labels={{
                      empty: t("submit.detail.empty"),
                      configured: t("submit.detail.statusReady"),
                      unset: t("submit.table.detailUnset"),
                      fileTypeKindLabel,
                      groupLabel: (labelKey: string) => t(labelKey),
                      optionLabel: (labelKey: string) => t(labelKey),
                      optionSub,
                    }}
                    isConfigured={(entryId) => rowIsConfigured(state, entryId)}
                    onCommit={actions.commitRowEdit}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6 min-w-0 lg:col-span-6">
            <div>
              <SectionHeading>
                {t("submit.sections.flow")}
              </SectionHeading>
              <FlowSummaryCard
                steps={steps}
                entries={state.submission.fileEntries}
                isHuman={isHuman}
                isAuthenticated={auth.status === "authenticated"}
                accessByKind={accessByKind}
                accessHeading={t("submit.access.heading")}
                accessLabel={(a) => a === "restricted" ? t("submit.access.restricted") : t("submit.access.open")}
                accessOverview={accessOverview}
                groupLabels={groupLabels}
                accountLabels={{
                  title: t("submit.flow.account.title"),
                  description: t("submit.flow.account.description"),
                  register: t("submit.flow.account.register"),
                  login: t("submit.flow.account.login"),
                }}
                serviceTitle={serviceTitle}
                serviceDescription={serviceDescription}
                fileTypeKindLabel={fileTypeKindLabel}
                resolveNote={resolveNote}
                noteKindLabel={noteKindLabel}
                externalCtaLabel={t("submit.flow.ctaLabel")}
                prereqHeading={t("submit.flow.prereqHeading")}
                detailLinkLabel={t("submit.flow.detailLinkLabel")}
                validations={validations}
                validationHeading={validationHeading}
                validationLabel={(v) => t(`submit.validations.${v.kind}`)}
                onJumpToRow={() => scrollToKinds()}
              />
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}

const ACCESS_BASIS_KEYS = ["ethicsCompliance", "publiclyAvailable", "microbialAnalysis"] as const

const AccessSectionPanel = ({
  q2,
  section,
  isHuman,
  onChange,
}: {
  q2: Q2 | null
  section: AccessSection
  isHuman: boolean
  onChange: (patch: Partial<AccessSection>) => void
}) => {
  const t = useT()
  const disabled = q2 === null || !isHuman

  return (
    <div>
      <div className="flex items-baseline gap-2 mt-0 mb-2">
        <p className="text-fs-body-sm font-semibold text-ink m-0">
          {t("submit.access.heading")}
        </p>
        {disabled && q2 !== null && (
          <p className="text-fs-micro font-normal text-ink-mid m-0">
            {t("submit.access.nonHumanReason")}
          </p>
        )}
      </div>
      <div className={cn("flex flex-col gap-3", disabled && "pointer-events-none")}>
        <Toggle
          label={t("submit.access.restrictedPreference.label")}
          sub={t("submit.access.restrictedPreference.sub")}
          checked={section.restrictedPreference}
          disabled={disabled}
          onChange={() => onChange({ restrictedPreference: !section.restrictedPreference })}
        />
        <p className="text-fs-micro font-semibold text-ink-mid mt-1 mb-0">
          {t("submit.access.basisHeading")}
        </p>
        {ACCESS_BASIS_KEYS.map((key) => (
          <Toggle
            key={key}
            label={t(`submit.access.${key}.label`)}
            sub={t(`submit.access.${key}.sub`)}
            checked={section[key]}
            disabled={disabled || section.restrictedPreference}
            onChange={() => onChange({ [key]: !section[key] })}
          />
        ))}
      </div>
    </div>
  )
}

export default SubmitRoute
