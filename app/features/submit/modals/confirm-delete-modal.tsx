import { useId } from "react"

import { Button, Modal, ModalFooter, ModalHeader } from "~/ui"

type ConfirmDeleteModalLabels = {
  closeAriaLabel: string
  title: string
  description: string
  confirm: string
  cancel: string
}

type ConfirmDeleteModalProps = {
  open: boolean
  labels: ConfirmDeleteModalLabels
  onCancel: () => void
  onConfirm: () => void
}

export const ConfirmDeleteModal = ({
  open,
  labels,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) => {
  const titleId = useId()
  return (
    <Modal open={open} onClose={onCancel} ariaLabelledby={titleId} width={480}>
      <ModalHeader
        title={labels.title}
        titleId={titleId}
        description={labels.description}
        onClose={onCancel}
        closeLabel={labels.closeAriaLabel}
      />
      <ModalFooter
        actions={
          <>
            <Button kind="secondary" onClick={onCancel}>{labels.cancel}</Button>
            <Button kind="danger" onClick={onConfirm}>{labels.confirm}</Button>
          </>
        }
      />
    </Modal>
  )
}
