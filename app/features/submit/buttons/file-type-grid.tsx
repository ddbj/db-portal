import type { FileTypeKind } from "~/schemas/submit"
import { FileTypeKind as FileTypeKindEnum } from "~/schemas/submit"

import { FileTypeButton } from "./file-type-button"

type FileTypeGridProps = {
  onClick: (fileTypeKind: FileTypeKind) => void
  getLabel: (fileTypeKind: FileTypeKind) => string
  getExt: (fileTypeKind: FileTypeKind) => string
  getHint: (fileTypeKind: FileTypeKind) => string
  isEnabled: (fileTypeKind: FileTypeKind) => boolean
  disabledReason: string
}

export const FileTypeGrid = ({
  onClick,
  getLabel,
  getExt,
  getHint,
  isEnabled,
  disabledReason,
}: FileTypeGridProps) => (
  <div className="grid grid-cols-3 gap-2">
    {FileTypeKindEnum.options.map((kind) => {
      const enabled = isEnabled(kind)

      return (
        <FileTypeButton
          key={kind}
          fileTypeKind={kind}
          label={getLabel(kind)}
          ext={getExt(kind)}
          hint={getHint(kind)}
          disabled={!enabled}
          disabledReason={disabledReason}
          onClick={() => onClick(kind)}
        />
      )
    })}
  </div>
)
