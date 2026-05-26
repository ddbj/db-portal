import type { ButtonType } from "~/schemas/submit"
import { ButtonType as ButtonTypeEnum } from "~/schemas/submit"

import { FileTypeButton } from "./file-type-button"

type FileTypeGridProps = {
  onClick: (buttonType: ButtonType) => void
  getLabel: (buttonType: ButtonType) => string
  getExt: (buttonType: ButtonType) => string
  getHint: (buttonType: ButtonType) => string
}

export const FileTypeGrid = ({ onClick, getLabel, getExt, getHint }: FileTypeGridProps) => (
  <div className="grid grid-cols-3 gap-2">
    {ButtonTypeEnum.options.map((bt) => (
      <FileTypeButton
        key={bt}
        buttonType={bt}
        label={getLabel(bt)}
        ext={getExt(bt)}
        hint={getHint(bt)}
        onClick={() => onClick(bt)}
      />
    ))}
  </div>
)
