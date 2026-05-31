import {
  countConfiguredRows,
  DataDetailPanel,
  FileTable,
  FileTypeGrid,
  FlowOverview,
  FlowStepCards,
  getSubmitCard,
  isKindEnabled,
  isQ2Enabled,
  PartialFailureBanner,
  RadioCardGroup,
  rowIsConfigured,
  selectSteps,
  selectValidations,
  TagProgress,
  useSubmitState,
} from "~/features/submit"
import { pageTitleMeta } from "~/lib/content"
import { useLang, useT } from "~/lib/i18n"
import type { Access, FileTypeKind, Q1, Q2, Service } from "~/schemas/submit"
import { Q1 as Q1Enum, Q2 as Q2Enum, serviceRole } from "~/schemas/submit"
import { PageTitle, Section, SectionHeading } from "~/ui"

export const handle = {
  lang: undefined,
  i18n: { en: "complete" },
  titleSegments: ["Submit"],
} as const

export const meta = pageTitleMeta

const SubmitRoute = () => {
  const t = useT()
  const lang = useLang()
  const { state, actions } = useSubmitState()
  const { q1, q2 } = state.submission.preconditions
  const steps = selectSteps(state)
  const validations = selectValidations(state)
  const { configured, total } = countConfiguredRows(state)

  const countSuffix = t("common.countSuffix")
  const validationHeading = t("submit.validations.heading", { count: validations.length })

  const fileTypeKindLabel = (k: FileTypeKind): string => t(`submit.fileType.${k}.label`)
  const fileTypeKindExt = (k: FileTypeKind): string => t(`submit.fileType.${k}.ext`)
  const fileTypeKindHint = (k: FileTypeKind): string => t(`submit.fileType.${k}.hint`)
  const accessLabel = (a: Access): string => t(`submit.access.${a}`)
  const serviceTitle = (s: Service): string => t(`submit.flow.${s}.title`)
  const serviceDescription = (s: Service): string => t(`submit.flow.${s}.description`)
  const roleLabel = (s: Service): string => t(`submit.flow.roleTag.${serviceRole(s)}`)
  const cardCopy = (s: Service) => {
    const card = getSubmitCard(s)

    return {
      wizardSteps: card.wizardSteps[lang],
      prepare: card.prepare[lang],
      gotcha: card.gotcha?.[lang],
      issuedNote: card.issuedNote?.[lang],
    }
  }
  const sourceTagLabel = (source: "DDBJ" | "DBCLS"): string => source
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

  const rowIndexOf = (entryId: string): number =>
    state.submission.fileEntries.findIndex((e) => e.id === entryId)

  const scrollToRow = (entryId: string): void => {
    if (typeof document === "undefined") return
    document
      .querySelector(`[data-testid="file-row"][data-entry-id="${entryId}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" })
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

            <div>
              <SectionHeading>{t("submit.sections.table")}</SectionHeading>
              <p className="text-fs-body-sm text-ink-mid mt-0 mb-4 leading-relaxed">
                {t("submit.table.headingDescription")}
              </p>
              <div className="mb-6">
                <FileTypeGrid
                  onClick={actions.addRow}
                  getLabel={fileTypeKindLabel}
                  getExt={fileTypeKindExt}
                  getHint={fileTypeKindHint}
                  isEnabled={(k) => isKindEnabled(q1, q2, k)}
                  disabledReason={gridDisabledReason}
                />
              </div>
              <FileTable
                state={state}
                labels={{
                  caption: t("submit.table.caption"),
                  columnFileType: t("submit.table.columnFileType"),
                  columnFilename: t("submit.table.columnFilename"),
                  columnAccess: t("submit.table.columnAccess"),
                  columnDelete: t("submit.table.columnDelete"),
                  empty: t("submit.table.empty"),
                  accessAria: t("submit.a11y.accessCell"),
                  deleteAria: t("submit.a11y.deleteRow"),
                  detailUnset: t("submit.table.detailUnset"),
                  fileTypeKindLabel,
                  accessLabel,
                }}
                onAccessChange={(entryId, value) => actions.editRowCell(entryId, { access: value })}
                onDelete={actions.removeRow}
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
                      pairPartnerLabel: t("submit.detail.pairPartnerLabel"),
                      pairPartnerPlaceholder: t("submit.detail.pairPartnerPlaceholder"),
                      pairPartnerEmpty: t("submit.detail.pairPartnerEmpty"),
                      fileTypeKindLabel,
                      groupLabel: (labelKey: string) => t(labelKey),
                      optionLabel: (labelKey: string) => t(labelKey),
                      optionSub,
                    }}
                    isConfigured={(entryId) => rowIsConfigured(state, entryId)}
                    onCommit={actions.commitRowEdit}
                    onSetPairPartner={actions.setPairPartner}
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
              <FlowOverview
                steps={steps}
                serviceName={serviceTitle}
                fileCountLabel={(n) => t("submit.flowOverview.fileCount", { count: n })}
                gotoLabel={(name) => `${t("submit.a11y.gotoStep")}: ${name}`}
              />
            </div>
            {steps.length > 0 && (
              <hr className="w-full border-0 border-t border-border-soft m-0" />
            )}
            <FlowStepCards
              steps={steps}
              groups={state.submission.fileGroups}
              entries={state.submission.fileEntries}
              emptyMessage={t("submit.flow.empty")}
              serviceTitle={serviceTitle}
              serviceDescription={serviceDescription}
              roleLabel={roleLabel}
              cardCopy={cardCopy}
              prereqHeading={t("submit.flow.prereqHeading")}
              wizardHeading={t("submit.flow.wizardHeading")}
              prepareHeading={t("submit.flow.prepareHeading")}
              filesHeading={t("submit.flow.filesHeading")}
              gotchaHeading={t("submit.flow.gotchaHeading")}
              resolveNote={resolveNote}
              noteKindLabel={noteKindLabel}
              externalCtaLabel={t("submit.flow.ctaLabel")}
              sourceTagLabel={sourceTagLabel}
            />
            {validations.length > 0 && (
              <PartialFailureBanner
                validations={validations}
                rowIndexOf={rowIndexOf}
                headingText={validationHeading}
                rowLabel={(index) => t("submit.validations.rowReference", { index })}
                validationLabel={(v) => t(`submit.validations.${v.kind}`)}
                onJumpToRow={scrollToRow}
              />
            )}
          </div>
        </div>
      </Section>
    </>
  )
}

export default SubmitRoute
