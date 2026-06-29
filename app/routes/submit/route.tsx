import { useEffect, useMemo, useRef, useState } from "react"
import { useLoaderData, useSearchParams } from "react-router"

import {
  countConfiguredRows,
  DataDetailPanel,
  FileTypeGrid,
  FlowSummaryCard,
  hydrateFromUrl,
  isKindEnabled,
  projectStateToUrl,
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
import { writeSubmitParams } from "~/lib/submit-url"
import { type Access, type FileTypeKind, OrganismDomain, type Service } from "~/schemas/submit"
import type { AccessSection } from "~/schemas/submit/submission"
import { PageTitle, Section, SectionHeading, Toggle } from "~/ui"
import { cn } from "~/ui/cn"

import { loader } from "./loader"

export { loader }

export const handle = {
  lang: undefined,
  i18n: { en: "complete" },
  titleSegments: ["Submit"],
} as const

export const meta = pageTitleMeta

const SubmitRoute = () => {
  const t = useT()
  const auth = useAuth()
  const data = useLoaderData<typeof loader>()
  const [initialState] = useState(() => hydrateFromUrl(data.urlState))
  const { state, actions } = useSubmitState(initialState)
  const [, setSearchParams] = useSearchParams()
  const lastSyncedRef = useRef<string>(
    writeSubmitParams(projectStateToUrl(initialState)).toString(),
  )
  useEffect(() => {
    const next = writeSubmitParams(projectStateToUrl(state)).toString()
    if (next === lastSyncedRef.current) return
    lastSyncedRef.current = next
    setSearchParams(new URLSearchParams(next), { replace: true, preventScrollReset: true })
  }, [state, setSearchParams])

  const { organismDomain } = state.submission.preconditions
  const { accessSection } = state.submission
  const isHuman = organismDomain === "human"

  const { fileEntries } = state.submission
  const accessByKind = useMemo(() => {
    if (organismDomain === null) return new Map<Access, FileTypeKind[]>()
    const map = new Map<Access, FileTypeKind[]>()
    for (const e of fileEntries) {
      const list = map.get(e.access) ?? []
      if (!list.includes(e.fileTypeKind)) list.push(e.fileTypeKind)
      map.set(e.access, list)
    }
    if (fileEntries.length === 0 && organismDomain === "human") {
      const { restrictedPreference, hasIdentifier, ethicsCompliance, publiclyAvailable, microbialAnalysis } = accessSection
      if (restrictedPreference) {
        map.set("restricted", [])
      } else if (hasIdentifier) {
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
  }, [organismDomain, fileEntries, accessSection])
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
    nhaOrientation: { title: t("submit.flow.group.nhaOrientation.title"), sub: t("submit.flow.group.nhaOrientation.sub") },
  }

  const showNhaOrientation = isHuman && fileEntries.length === 0 && accessByKind.has("open")

  const validationHeading = t("submit.validations.heading", { count: validations.length })

  const fileTypeKindLabel = (k: FileTypeKind): string => t(`submit.fileType.${k}`)
  const serviceTitle = (s: Service): string => t(`submit.flow.${s}.title`)
  const serviceDescription = (s: Service): string => t(`submit.flow.${s}.description`)
  const servicePrereqLabel = (s: Service): string => {
    if (s === "humandbs") return t("submit.flow.humandbs.prereqLabel")
    if (s === "dra") return t("submit.flow.dra.prereqLabel")
    return t(`submit.flow.${s}.title`)
  }
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

  const organismDomainOptions = OrganismDomain.options.map((v) => ({
    value: v,
    label: t(`submit.preconditions.organismDomain.${v}.label`),
    sub: t(`submit.preconditions.organismDomain.${v}.sub`),
  }))
  const gridDisabledReason = organismDomain === null
    ? t("submit.preconditions.organismDomainRequired")
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <SectionHeading>{t("submit.preconditions.organismDomainHeading")}</SectionHeading>
                <RadioCardGroup
                  ariaLabel={t("submit.preconditions.organismDomainHeading")}
                  name="precondition-organismDomain"
                  value={organismDomain}
                  options={organismDomainOptions}
                  onChange={(v) => actions.setOrganismDomain(v as OrganismDomain)}
                />
              </div>
              <div>
                <AccessSectionPanel
                  organismDomain={organismDomain}
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
                isEnabled={(k) => isKindEnabled(organismDomain, k)}
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
                    organismDomain={state.submission.preconditions.organismDomain}
                    hasIdentifier={accessSection.hasIdentifier}
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
                nhaHintLabels={{
                  title: t("submit.flow.nha.title"),
                  description: t("submit.flow.nha.description"),
                  statisticsLabel: t("submit.flow.nha.statisticsLabel"),
                  statisticsItems: t("submit.flow.nha.statisticsItems"),
                  pathologyLabel: t("submit.flow.nha.pathologyLabel"),
                }}
                showNhaOrientation={showNhaOrientation}
                serviceTitle={serviceTitle}
                serviceDescription={serviceDescription}
                servicePrereqLabel={servicePrereqLabel}
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
  organismDomain,
  section,
  isHuman,
  onChange,
}: {
  organismDomain: OrganismDomain | null
  section: AccessSection
  isHuman: boolean
  onChange: (patch: Partial<AccessSection>) => void
}) => {
  const t = useT()
  const disabled = organismDomain === null || !isHuman
  const basisDisabled = disabled || section.restrictedPreference || section.hasIdentifier

  return (
    <div>
      <SectionHeading
        hint={disabled && organismDomain !== null ? (
          <span className="rounded-full bg-brand/10 px-2.5 py-1 text-fs-micro font-semibold leading-none text-brand">
            {t("submit.access.nonHumanReason")}
          </span>
        ) : undefined}
      >
        {t("submit.access.heading")}
      </SectionHeading>
      <div className={cn("flex flex-col gap-3", disabled && "pointer-events-none")}>
        <Toggle
          label={t("submit.access.restrictedPreference.label")}
          sub={t("submit.access.restrictedPreference.sub")}
          checked={!disabled && section.restrictedPreference}
          disabled={disabled}
          onChange={() => onChange({ restrictedPreference: !section.restrictedPreference })}
        />
        <Toggle
          label={t("submit.access.hasIdentifier.label")}
          sub={t("submit.access.hasIdentifier.sub")}
          checked={!disabled && section.hasIdentifier}
          disabled={disabled}
          onChange={() => onChange({ hasIdentifier: !section.hasIdentifier })}
        />
        <p className="text-fs-micro font-semibold text-ink-mid mt-1 mb-0">
          {t("submit.access.basisHeading")}
        </p>
        {ACCESS_BASIS_KEYS.map((key) => (
          <Toggle
            key={key}
            label={t(`submit.access.${key}.label`)}
            sub={t(`submit.access.${key}.sub`)}
            checked={!disabled && section[key]}
            disabled={basisDisabled}
            onChange={() => onChange({ [key]: !section[key] })}
          />
        ))}
      </div>
    </div>
  )
}

export default SubmitRoute
