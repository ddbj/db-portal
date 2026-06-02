import type { FileTypeKind } from "~/schemas/submit"
import { FileTypeKind as FileTypeKindEnum } from "~/schemas/submit"

import { FileTypeButton } from "./file-type-button"

type FileTypeGridProps = {
  onToggle: (fileTypeKind: FileTypeKind) => void
  getLabel: (fileTypeKind: FileTypeKind) => string
  getHint: (fileTypeKind: FileTypeKind) => string
  isSelected: (fileTypeKind: FileTypeKind) => boolean
  isEnabled: (fileTypeKind: FileTypeKind) => boolean
  disabledReason: string
}

export const FileTypeGrid = ({
  onToggle,
  getLabel,
  getHint,
  isSelected,
  isEnabled,
  disabledReason,
}: FileTypeGridProps) => (
  <div className="grid grid-cols-2 gap-2">
    {FileTypeKindEnum.options.map((kind) => {
      const enabled = isEnabled(kind)

      return (
        <FileTypeButton
          key={kind}
          fileTypeKind={kind}
          label={getLabel(kind)}
          hint={getHint(kind)}
          selected={isSelected(kind)}
          disabled={!enabled}
          disabledReason={disabledReason}
          onClick={() => onToggle(kind)}
        />
      )
    })}
  </div>
)
