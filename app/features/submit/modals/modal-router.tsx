import type { DataForm, FileEntryChip, GroupType, Service } from "~/schemas/submit"

import type { UIState } from "../state/types"
import type { SubmitDispatch } from "../state/use-submit-state"
import { ConfirmDeleteModal } from "./confirm-delete-modal"
import { EditRowModal } from "./edit-row-modal"

type ModalRouterLabels = {
  closeAriaLabel: string
  editModal: {
    title: string
    description: string
    save: string
    cancel: string
    statusReady: string
    previewLabel: string
    previewFootnote: string
    groupLabel: (id: string) => string
    optionLabel: (key: string) => string
    optionSub: (key: string | undefined) => string | undefined
    previewTitle: (service: Service) => string
    previewBody: (service: Service) => string
    serviceCode: (service: Service) => string
  }
  confirmDelete: {
    title: string
    description: string
    confirm: string
    cancel: string
  }
}

type ModalRouterProps = {
  state: UIState
  actions: SubmitDispatch
  labels: ModalRouterLabels
  buttonTypeLabelFor: (entryId: string) => string
}

export const ModalRouter = ({
  state,
  actions,
  labels,
  buttonTypeLabelFor,
}: ModalRouterProps) => {
  const editing = state.editing
  if (editing === null) return null

  if (editing.kind === "row") {
    const entry = state.submission.fileEntries.find((e) => e.id === editing.entryId)
    if (!entry) return null
    const group = state.submission.fileGroups.find((g) => g.id === entry.groupId)
    return (
      <EditRowModal
        open={true}
        entry={entry}
        group={group}
        baseSubmission={state.submission}
        labels={{
          closeAriaLabel: labels.closeAriaLabel,
          title: labels.editModal.title,
          description: labels.editModal.description,
          saveLabel: labels.editModal.save,
          cancelLabel: labels.editModal.cancel,
          statusReady: labels.editModal.statusReady,
          previewLabel: labels.editModal.previewLabel,
          previewFootnote: labels.editModal.previewFootnote,
          buttonTypeLabel: buttonTypeLabelFor(entry.id),
          groupLabel: labels.editModal.groupLabel,
          optionLabel: labels.editModal.optionLabel,
          optionSub: labels.editModal.optionSub,
          previewTitle: labels.editModal.previewTitle,
          previewBody: labels.editModal.previewBody,
          serviceCode: labels.editModal.serviceCode,
        }}
        onClose={actions.closeModal}
        onCommit={(patch: { groupType: GroupType; dataForm: DataForm; chipTags: FileEntryChip[] }) =>
          actions.commitRowEdit(entry.id, patch)}
      />
    )
  }

  if (editing.kind === "confirm-delete") {
    return (
      <ConfirmDeleteModal
        open={true}
        labels={{
          closeAriaLabel: labels.closeAriaLabel,
          title: labels.confirmDelete.title,
          description: labels.confirmDelete.description,
          confirm: labels.confirmDelete.confirm,
          cancel: labels.confirmDelete.cancel,
        }}
        onCancel={actions.closeModal}
        onConfirm={() => actions.removeRow(editing.entryId)}
      />
    )
  }

  return null
}
