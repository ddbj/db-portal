import {
  countConfiguredRows,
  FileTable,
  FileTypeGrid,
  FlowStepCards,
  isKindEnabled,
  isQ2Enabled,
  ModalRouter,
  PartialFailureBanner,
  SegmentedControl,
  selectSteps,
  selectValidations,
  TagProgress,
  useSubmitState,
} from "~/features/submit"
import { pageTitleMeta } from "~/lib/content"
import { useT } from "~/lib/i18n"
import type { Access, FileTypeKind, Q1, Q2, Service } from "~/schemas/submit"
import { Q1 as Q1Enum, Q2 as Q2Enum } from "~/schemas/submit"
import { PageTitle, Section, SectionHeading } from "~/ui"

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

  const remainingText = t("submit.progress.remaining", { count: total - configured })
  const validationHeading = t("submit.validations.heading", { count: validations.length })

  const fileTypeKindLabel = (k: FileTypeKind): string => t(`submit.fileType.${k}.label`)
  const fileTypeKindExt = (k: FileTypeKind): string => t(`submit.fileType.${k}.ext`)
  const fileTypeKindHint = (k: FileTypeKind): string => t(`submit.fileType.${k}.hint`)
  const accessLabel = (a: Access): string => t(`submit.access.${a}`)
  const serviceTitle = (s: Service): string => t(`submit.flow.${s}.title`)
  const serviceDescription = (s: Service): string => t(`submit.flow.${s}.description`)
  const externalCtaLabel = (s: Service): string => t(`submit.flow.${s}.cta`)
  const previewTitle = (s: Service): string => t(`submit.preview.title.${s}`)
  const previewBody = (s: Service): string => t(`submit.preview.body.${s}`)
  const serviceCode = (s: Service): string => t(`submit.preview.serviceCode.${s}`)
  const sourceTagLabel = (source: "DDBJ" | "DBCLS"): string => source
  const noteKindLabel = (kind: "warning" | "error"): string =>
    kind === "warning" ? t("submit.flow.noteWarning") : t("submit.flow.noteError")

  const resolveNote = (key: string): string => {
    const value = t(key)

    return value === key ? "" : value
  }

  const q1Segments = Q1Enum.options.map((v) => ({
    value: v,
    label: t(`submit.preconditions.q1.${v}.label`),
    sub: t(`submit.preconditions.q1.${v}.sub`),
  }))
  const q2Segments = Q2Enum.options.map((v) => ({
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

  const fileTypeKindLabelForEntry = (entryId: string): string => {
    const entry = state.submission.fileEntries.find((e) => e.id === entryId)

    return entry === undefined ? "" : fileTypeKindLabel(entry.fileTypeKind)
  }

  return (
    <>
      <PageTitle title={t("submit.pageTitle")} subtitle={t("submit.pageSubtitle")} />
      <Section padTop="sm" padBottom="mid">
        <SectionHeading>{t("submit.sections.preconditions")}</SectionHeading>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-fs-body-sm font-semibold text-ink mt-0 mb-2">
              {t("submit.preconditions.q1Heading")}
            </p>
            <SegmentedControl
              ariaLabel={t("submit.preconditions.q1Heading")}
              value={q1}
              segments={q1Segments}
              onChange={(v) => actions.setQ1(v as Q1)}
            />
          </div>
          <div>
            <p className="text-fs-body-sm font-semibold text-ink mt-0 mb-2">
              {t("submit.preconditions.q2Heading")}
            </p>
            <SegmentedControl
              ariaLabel={t("submit.preconditions.q2Heading")}
              value={q2}
              segments={q2Segments}
              onChange={(v) => actions.setQ2(v as Q2)}
            />
          </div>
        </div>
      </Section>
      <Section padTop="sm" padBottom="mid">
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
            columnDetail: t("submit.table.columnDetail"),
            columnDelete: t("submit.table.columnDelete"),
            empty: t("submit.table.empty"),
            accessAria: t("submit.a11y.accessCell"),
            detailUnsetLabel: t("submit.table.detailUnset"),
            editDetailAria: t("submit.a11y.editDetail"),
            deleteAria: t("submit.a11y.deleteRow"),
            fileTypeKindLabel,
            accessLabel,
          }}
          onAccessChange={(entryId, value) => actions.editRowCell(entryId, { access: value })}
          onEditDetail={actions.openEditRow}
          onRequestDelete={actions.openConfirmDelete}
        />
      </Section>
      <Section padTop="sm" padBottom="lg">
        <SectionHeading
          count={steps.length > 0 ? steps.length : undefined}
          countSuffix={t("common.countSuffix")}
        >
          {t("submit.sections.flow")}
        </SectionHeading>
        {total > 0 && (
          <div className="mb-4">
            <TagProgress
              configured={configured}
              total={total}
              heading={t("submit.progress.heading")}
              remainingText={remainingText}
              completeText={t("submit.progress.complete")}
              countLabel={`${configured} / ${total}`}
            />
          </div>
        )}
        <FlowStepCards
          steps={steps}
          groups={state.submission.fileGroups}
          entries={state.submission.fileEntries}
          emptyMessage={t("submit.flow.empty")}
          serviceTitle={serviceTitle}
          serviceDescription={serviceDescription}
          accessionLabel={t("submit.flow.accessionLabel")}
          resolveNote={resolveNote}
          noteKindLabel={noteKindLabel}
          externalCtaLabel={externalCtaLabel}
          sourceTagLabel={sourceTagLabel}
        />
        {validations.length > 0 && (
          <div className="mt-4">
            <PartialFailureBanner
              validations={validations}
              rowIndexOf={rowIndexOf}
              headingText={validationHeading}
              rowLabel={(index) => t("submit.validations.rowReference", { index })}
              validationLabel={(v) => t(`submit.validations.${v.kind}`)}
              onJumpToRow={actions.openEditRow}
            />
          </div>
        )}
      </Section>
      <ModalRouter
        state={state}
        actions={actions}
        labels={{
          closeAriaLabel: t("submit.a11y.modalClose"),
          editModal: {
            title: t("submit.modal.title"),
            description: t("submit.modal.description"),
            save: t("submit.modal.save"),
            cancel: t("submit.modal.cancel"),
            statusReady: t("submit.modal.statusReady"),
            previewLabel: t("submit.modal.previewLabel"),
            previewFootnote: t("submit.modal.previewFootnote"),
            groupLabel: (labelKey: string) => t(labelKey),
            optionLabel: (labelKey: string) => t(labelKey),
            optionSub: (subKey: string | undefined) => {
              if (subKey === undefined) return undefined
              const value = t(subKey)

              return value === subKey ? undefined : value
            },
            previewTitle,
            previewBody,
            serviceCode,
          },
          confirmDelete: {
            title: t("submit.modal.confirmDelete.title"),
            description: t("submit.modal.confirmDelete.description"),
            confirm: t("submit.modal.confirmDelete.confirm"),
            cancel: t("submit.modal.confirmDelete.cancel"),
          },
        }}
        fileTypeKindLabelFor={fileTypeKindLabelForEntry}
      />
    </>
  )
}

export default SubmitRoute
