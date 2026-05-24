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
    onClick={onClick}
    title={hint}
    aria-label={`${label} (${ext})`}
  >
    <span className="flex items-center gap-3 w-full">
      <span className="text-brand-deep shrink-0">
        <FileTypeIcon buttonType={buttonType} size={20} />
      </span>
      <span className="flex flex-col items-start min-w-0">
        <span className="text-fs-body font-semibold">{label}</span>
        <span className="font-mono text-fs-micro text-ink-mid">{ext}</span>
      </span>
    </span>
  </Button>
)
