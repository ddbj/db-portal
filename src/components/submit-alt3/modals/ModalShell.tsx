import { type ReactNode,useEffect } from "react"

import { Button } from "@/components/ui"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"

interface Props {
  open: boolean
  title: string
  onClose: () => void
  onSubmit: () => void
  submitLabel?: string
  cancelLabel?: string
  canSubmit?: boolean
  ariaId: string
  children: ReactNode
}

// 9 modal で共通利用する overlay + 閉じる + ヘッダ + フッタ
// SSOT: docs/submit-alt3-modals.md §6.2 「modal 内表記規約」
const ModalShell = ({
  open,
  title,
  onClose,
  onSubmit,
  submitLabel,
  cancelLabel,
  canSubmit = true,
  ariaId,
  children,
}: Props) => {
  const { t } = useDynamicTranslation()

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)

    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaId}
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 id={ariaId} className="heading-2 mb-4">
          {title}
        </h2>
        <div className="space-y-4">{children}</div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="tertiary" onClick={onClose}>
            {cancelLabel ?? t("routes.submitAlt3.modals.common.cancel")}
          </Button>
          <Button variant="primary" onClick={onSubmit} disabled={!canSubmit}>
            {submitLabel ?? t("routes.submitAlt3.modals.common.add")}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ModalShell
