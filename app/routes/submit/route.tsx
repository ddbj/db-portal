import {
  accessToggleVisible,
  countConfiguredRows,
  DataDetailPanel,
  FileTypeGrid,
  FileTypeIcon,
  FlowSummaryCard,
  isKindEnabled,
  isQ2Enabled,
  RadioCardGroup,
  rowIsConfigured,
  selectSteps,
  selectValidations,
  TagProgress,
  useSubmitState,
} from "~/features/submit"
import { pageTitleMeta } from "~/lib/content"
import { useT } from "~/lib/i18n"
import type { Access, FileTypeKind, Q1, Q2, Service } from "~/schemas/submit"
import { Access as AccessEnum, Q1 as Q1Enum, Q2 as Q2Enum, serviceRoleTagKey } from "~/schemas/submit"
import { PageTitle, Section, SectionHeading, Select } from "~/ui"

export const handle = {
  lang: undefined,
  i18n: { en: "complete" },
  titleSegments: ["Submit"],
} as const

export const meta = pageTitleMeta

const SubmitRoute = () => {
  const t = useT()
  const { state, actions } = useSubmitState()
  const { q1, q2 } = state.submission.preconditions
  const steps = selectSteps(state)
  const validations = selectValidations(state)
  const { configured, total } = countConfiguredRows(state)

  const countSuffix = t("common.countSuffix")
  const validationHeading = t("submit.validations.heading", { count: validations.length })

  const fileTypeKindLabel = (k: FileTypeKind): string => t(`submit.fileType.${k}.label`)
  const fileTypeKindHint = (k: FileTypeKind): string => t(`submit.fileType.${k}.hint`)
  const accessLabel = (a: Access): string => t(`submit.access.${a}`)
  const serviceTitle = (s: Service): string => t(`submit.flow.${s}.title`)
  const roleLabel = (s: Service): string => t(`submit.flow.roleTag.${serviceRoleTagKey(s)}`)
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

  const q1Options = Q1Enum.options.map((v) => ({
    value: v,
    label: t(`submit.preconditions.q1.${v}.label`),
    sub: t(`submit.preconditions.q1.${v}.sub`),
  }))
  const q2Options = Q2Enum.options.map((v) => ({
    value: v,
    label: t(`submit.preconditions.q2.${v}.label`),
    sub: t(`submit.preconditions.q2.${v}.sub`),
    disabled: !isQ2Enabled(q1, v),
    disabledReason: t("submit.preconditions.q2DisabledReason"),
  }))
  const gridDisabledReason = q1 === null || q2 === null
    ? t("submit.preconditions.q1Required")
    : t("submit.preconditions.kindDisabledReason")

  const selectedKinds = new Set(state.submission.fileEntries.map((e) => e.fileTypeKind))
  const onToggleKind = (k: FileTypeKind): void => {
    const existing = state.submission.fileEntries.find((e) => e.fileTypeKind === k)
    if (existing) actions.removeRow(existing.id)
    else actions.addRow(k)
  }
  const accessEntries = state.submission.fileEntries.filter((e) =>
    accessToggleVisible(q1, q2, e.fileTypeKind),
  )
  const accessOptions = AccessEnum.options.map((a) => ({ value: a, label: accessLabel(a) }))

  const scrollToKinds = (): void => {
    if (typeof document === "undefined") return
    document.getElementById("submit-kind-selection")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <>
      <PageTitle title={t("submit.pageTitle")} />
      <Section padTop="none" padBottom="lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-10 items-start">
          <div className="flex flex-col gap-8 min-w-0 lg:col-span-5">
            <div>
              <SectionHeading>{t("submit.sections.preconditions")}</SectionHeading>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <div>
                  <p className="text-fs-body-sm font-semibold text-ink mt-0 mb-2">
                    {t("submit.preconditions.q1Heading")}
                  </p>
                  <RadioCardGroup
                    ariaLabel={t("submit.preconditions.q1Heading")}
                    name="precondition-q1"
                    value={q1}
                    options={q1Options}
                    onChange={(v) => actions.setQ1(v as Q1)}
                  />
                </div>
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
              </div>
            </div>

            <div id="submit-kind-selection">
              <SectionHeading>{t("submit.sections.table")}</SectionHeading>
              <FileTypeGrid
                onToggle={onToggleKind}
                getLabel={fileTypeKindLabel}
                getHint={fileTypeKindHint}
                isSelected={(k) => selectedKinds.has(k)}
                isEnabled={(k) => isKindEnabled(q1, q2, k)}
                disabledReason={gridDisabledReason}
                conflictReason={t("submit.preconditions.kindConflictReason")}
              />
              {accessEntries.length > 0 && (
                <div className="mt-5 flex flex-col gap-2">
                  <p className="text-fs-body-sm font-semibold text-ink mt-0 mb-1">
                    {t("submit.access.heading")}
                  </p>
                  {accessEntries.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between gap-3 border border-border-soft rounded-card bg-surface px-3 py-2"
                    >
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <span className="text-brand-deep shrink-0 inline-flex items-center">
                          <FileTypeIcon fileTypeKind={e.fileTypeKind} size={16} />
                        </span>
                        <span className="text-fs-body-sm text-ink truncate">
                          {fileTypeKindLabel(e.fileTypeKind)}
                        </span>
                      </span>
                      <div className="shrink-0 w-36">
                        <Select
                          ariaLabel={`${fileTypeKindLabel(e.fileTypeKind)} ${t("submit.access.heading")}`}
                          options={accessOptions}
                          value={e.access}
                          onChange={(next) => actions.editRowCell(e.id, { access: next as Access })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                      pairNeedsFasta: t("submit.detail.pairNeedsFasta"),
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

          <div className="flex flex-col gap-6 min-w-0 lg:col-span-7">
            <div>
              <SectionHeading
                count={steps.length > 0 ? steps.length : undefined}
                countSuffix={countSuffix}
              >
                {t("submit.sections.flow")}
              </SectionHeading>
              <FlowSummaryCard
                steps={steps}
                entries={state.submission.fileEntries}
                emptyMessage={t("submit.flow.empty")}
                serviceTitle={serviceTitle}
                fileTypeKindLabel={fileTypeKindLabel}
                roleLabel={roleLabel}
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

export default SubmitRoute
