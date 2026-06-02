import type { FileTypeKind } from "~/schemas/submit"
import { Button, CheckIcon } from "~/ui"

import { FileTypeIcon } from "../components/file-type-icon"

type FileTypeButtonProps = {
  fileTypeKind: FileTypeKind
  label: string
  hint: string
  selected: boolean
  disabled?: boolean
  disabledReason?: string
  onClick: () => void
}

export const FileTypeButton = ({
  fileTypeKind,
  label,
  hint,
  selected,
  disabled,
  disabledReason,
  onClick,
}: FileTypeButtonProps) => (
  <Button
    kind={selected ? "accent" : "secondary"}
    size="md"
    block
    aria-pressed={selected}
    disabled={disabled}
    onClick={onClick}
    title={disabled ? disabledReason : hint}
  >
    <span className="text-brand-deep shrink-0 inline-flex items-center">
      <FileTypeIcon fileTypeKind={fileTypeKind} size={20} />
    </span>
    <span className="flex-1 text-fs-body-sm font-semibold text-ink overflow-hidden text-ellipsis whitespace-nowrap">
      {label}
    </span>
    {selected && (
      <span className="text-brand-deep shrink-0 inline-flex items-center">
        <CheckIcon size={16} aria-hidden />
      </span>
    )}
  </Button>
)
