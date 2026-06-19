import type { FileTypeKind } from "~/schemas/submit"
import { FileTypeKind as FileTypeKindEnum } from "~/schemas/submit"

import { FileTypeButton } from "./file-type-button"

type FileTypeGridProps = {
  onToggle: (fileTypeKind: FileTypeKind) => void
  getLabel: (fileTypeKind: FileTypeKind) => string
  isSelected: (fileTypeKind: FileTypeKind) => boolean
  isEnabled: (fileTypeKind: FileTypeKind) => boolean
  disabledReason: string
  conflictReason: string
}

export const FileTypeGrid = ({
  onToggle,
  getLabel,
  isSelected,
  isEnabled,
  disabledReason,
  conflictReason,
}: FileTypeGridProps) => (
  <div className="grid grid-cols-2 gap-2">
    {FileTypeKindEnum.options.map((kind) => {
      const enabled = isEnabled(kind)
      const selected = isSelected(kind)
      const conflict = selected && !enabled

      return (
        <FileTypeButton
          key={kind}
          fileTypeKind={kind}
          label={getLabel(kind)}
          selected={selected}
          // disable は「新規選択」だけをブロックする。選択済みは conflict でも解除できるよう clickable に保つ
          disabled={!enabled && !selected}
          conflict={conflict}
          disabledReason={disabledReason}
          conflictReason={conflictReason}
          onClick={() => onToggle(kind)}
        />
      )
    })}
  </div>
)
