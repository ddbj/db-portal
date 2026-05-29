import type { FileTypeKind } from "~/schemas/submit"
import { Button } from "~/ui"

import { FileTypeIcon } from "../components/file-type-icon"

type FileTypeButtonProps = {
  fileTypeKind: FileTypeKind
  label: string
  ext: string
  hint: string
  disabled?: boolean
  disabledReason?: string
  onClick: () => void
}

export const FileTypeButton = ({
  fileTypeKind,
  label,
  ext,
  hint,
  disabled,
  disabledReason,
  onClick,
}: FileTypeButtonProps) => (
  <Button
    kind="secondary"
    size="md"
    block
    disabled={disabled}
    onClick={onClick}
    title={disabled ? disabledReason : hint}
    aria-label={`${label} (${ext})`}
  >
    <span className="text-brand-deep shrink-0 inline-flex items-center">
      <FileTypeIcon fileTypeKind={fileTypeKind} size={20} />
    </span>
    <span className="flex-1 text-fs-body-sm font-semibold text-ink overflow-hidden text-ellipsis whitespace-nowrap">
      {label}
    </span>
    <span className="font-mono text-fs-micro text-ink-soft shrink-0">{ext}</span>
  </Button>
)
