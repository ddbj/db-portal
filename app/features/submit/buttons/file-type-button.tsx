import type { FileTypeKind } from "~/schemas/submit"
import { AlertIcon, Button, CheckIcon } from "~/ui"

import { FileTypeIcon } from "../components/file-type-icon"

type FileTypeButtonProps = {
  fileTypeKind: FileTypeKind
  label: string
  selected: boolean
  disabled?: boolean
  conflict?: boolean
  disabledReason?: string
  conflictReason?: string
  onClick: () => void
}

export const FileTypeButton = ({
  fileTypeKind,
  label,
  selected,
  disabled,
  conflict,
  disabledReason,
  conflictReason,
  onClick,
}: FileTypeButtonProps) => (
  <Button
    kind={conflict ? "danger" : selected ? "accent" : "secondary"}
    size="md"
    block
    aria-pressed={selected}
    disabled={disabled}
    onClick={onClick}
    title={conflict ? conflictReason : disabled ? disabledReason : undefined}
  >
    <span className="text-brand-deep shrink-0 inline-flex items-center">
      <FileTypeIcon fileTypeKind={fileTypeKind} size={20} />
    </span>
    <span className="flex-1 text-fs-body-sm font-semibold text-ink overflow-hidden text-ellipsis whitespace-nowrap">
      {label}
    </span>
    {conflict
      ? (
        <span className="text-red shrink-0 inline-flex items-center">
          <AlertIcon size={16} aria-hidden />
        </span>
      )
      : selected && (
        <span className="text-brand-deep shrink-0 inline-flex items-center">
          <CheckIcon size={16} aria-hidden />
        </span>
      )}
  </Button>
)
