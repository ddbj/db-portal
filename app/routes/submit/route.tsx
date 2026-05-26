import {
  countConfiguredRows,
  FileTable,
  FileTypeGrid,
  FlowStepCards,
  ModalRouter,
  PartialFailureBanner,
  selectSteps,
  selectValidations,
  TagProgress,
  useSubmitState,
} from "~/features/submit"
import { useT } from "~/lib/i18n"
import type {
  Access,
  ButtonType,
  FileEntry,
  Organism,
  Service,
} from "~/schemas/submit"
import { PageTitle, Section, SectionHeading } from "~/ui"

export const handle = {
  lang: undefined,
  i18n: { en: "complete" },
} as const

const SubmitRoute = () => {
  const t = useT()
  const { state, actions } = useSubmitState()
  const steps = selectSteps(state)
  const validations = selectValidations(state)
  const { configured, total } = countConfiguredRows(state)

  const remainingText = t("submit.progress.remaining", { count: total - configured })
  const validationHeading = t("submit.validations.heading", { count: validations.length })

  const buttonTypeLabel = (bt: ButtonType): string => t(`submit.buttons.${bt}.label`)
  const buttonTypeExt = (bt: ButtonType): string => t(`submit.buttons.${bt}.ext`)
  const buttonTypeHint = (bt: ButtonType): string => t(`submit.buttons.${bt}.hint`)
  const organismLabel = (o: Organism | ""): string =>
    o === "" ? t("submit.organism.empty") : t(`submit.organism.${o}`)
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

  const rowIndexOf = (entryId: string): number =>
    state.submission.fileEntries.findIndex((e) => e.id === entryId)

  const buttonTypeLabelForEntry = (entryId: string): string => {
    const entry = state.submission.fileEntries.find((e) => e.id === entryId)
    return entry === undefined ? "" : buttonTypeLabel(entry.buttonType)
  }

  return (
    <>
      <PageTitle title={t("submit.pageTitle")} />
      <Section padTop="snug" padBottom="mid">
        <SectionHeading>{t("submit.sections.table")}</SectionHeading>
        <p className="text-fs-body-sm text-ink-mid mt-0 mb-4 leading-relaxed">
          {t("submit.table.headingDescription")}
        </p>
        <div className="mb-6">
          <FileTypeGrid
            onClick={actions.addRow}
            getLabel={buttonTypeLabel}
            getExt={buttonTypeExt}
            getHint={buttonTypeHint}
          />
        </div>
        <FileTable
          state={state}
          labels={{
            caption: t("submit.table.caption"),
            columnButtonType: t("submit.table.columnButtonType"),
            columnFilename: t("submit.table.columnFilename"),
            columnOrganism: t("submit.table.columnOrganism"),
            columnAccess: t("submit.table.columnAccess"),
            columnDetail: t("submit.table.columnDetail"),
            columnDelete: t("submit.table.columnDelete"),
            empty: t("submit.table.empty"),
            filenamePlaceholder: t("submit.table.filenamePlaceholder"),
            filenameAria: t("submit.a11y.filenameCell"),
            organismAria: t("submit.a11y.organismCell"),
            accessAria: t("submit.a11y.accessCell"),
            detailUnsetLabel: t("submit.table.detailUnset"),
            editDetailAria: t("submit.a11y.editDetail"),
            deleteAria: t("submit.a11y.deleteRow"),
            buttonTypeLabel,
            organismLabel,
            accessLabel,
          }}
          onFilenameChange={(entryId, value) => actions.editRowCell(entryId, { filename: value })}
          onOrganismChange={(entryId, value) =>
            actions.editRowCell(entryId, { organism: (value === "" ? "" : value) as FileEntry["organism"] })}
          onAccessChange={(entryId, value) => actions.editRowCell(entryId, { access: value })}
          onEditDetail={actions.openEditRow}
          onRequestDelete={actions.openConfirmDelete}
        />
      </Section>
      <Section padTop="snug" padBottom="lg">
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
          filenameMissingLabel={t("submit.flow.filenameMissing")}
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
        buttonTypeLabelFor={buttonTypeLabelForEntry}
      />
    </>
  )
}

export default SubmitRoute
