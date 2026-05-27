import type { ButtonType } from "~/schemas/submit"
import { Button } from "~/ui"

import { FileTypeIcon } from "../components/file-type-icon"

type FileTypeButtonProps = {
  buttonType: ButtonType
  label: string
  ext: string
  hint: string
  onClick: () => void
}

export const FileTypeButton = ({
  buttonType,
  label,
  ext,
  hint,
  onClick,
}: FileTypeButtonProps) => (
  <Button
    kind="secondary"
    size="md"
    block
    onClick={onClick}
    title={hint}
    aria-label={`${label} (${ext})`}
  >
    <span className="text-brand-deep shrink-0 inline-flex items-center">
      <FileTypeIcon buttonType={buttonType} size={20} />
    </span>
    <span className="flex-1 text-fs-body-sm font-semibold text-ink overflow-hidden text-ellipsis whitespace-nowrap">
      {label}
    </span>
    <span className="font-mono text-fs-micro text-ink-soft shrink-0">{ext}</span>
  </Button>
)
