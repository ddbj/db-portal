import { useState } from "react"

import cn from "@/components/ui/cn"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import type { ChipAxis, ChipTag } from "@/types/submit-alt3"

import ChipEditPopover from "./ChipEditPopover"

interface Props {
  fileId: string
  chipTags: readonly ChipTag[]
  onSetChip: (
    fileId: string,
    axis: ChipAxis,
    value: string | undefined,
    manualOverride?: boolean,
  ) => void
  onResetChipManual: (fileId: string, axis: ChipAxis) => void
}

// 行内 chip 表示 + 編集 popover
// SSOT: docs/submit-alt3-tags.md §5.2
const ChipList = ({
  fileId,
  chipTags,
  onSetChip,
  onResetChipManual,
}: Props) => {
  const { t } = useDynamicTranslation()
  const [openAxis, setOpenAxis] = useState<ChipAxis | null>(null)

  if (chipTags.length === 0) {
    return <span className="text-xs text-gray-400">—</span>
  }

  return (
    <div className="relative flex flex-wrap gap-1">
      {chipTags.map((c) => {
        const isManual =
          c.axis === "functional-genomics" && c.manualOverride === true
        const isOpen = openAxis === c.axis

        return (
          <span
            key={c.axis}
            className="relative"
            data-testid={`file-cell-chip-${fileId}-${c.axis}`}
          >
            <button
              type="button"
              onClick={() => setOpenAxis((cur) => (cur === c.axis ? null : c.axis))}
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                "transition-colors hover:bg-gray-200",
                isManual
                  ? "bg-primary-100 text-primary-700"
                  : "bg-gray-100 text-gray-700",
              )}
            >
              {t(`routes.submitAlt3.chips.${c.axis}.values.${c.value}`, {
                defaultValue: c.value,
              })}
            </button>
            {isOpen && (
              <ChipEditPopover
                fileId={fileId}
                chip={c}
                onChangeValue={(next) => {
                  onSetChip(
                    fileId,
                    c.axis,
                    next,
                    c.axis === "functional-genomics" ? true : undefined,
                  )
                  setOpenAxis(null)
                }}
                onRemove={() => {
                  onSetChip(fileId, c.axis, undefined)
                  setOpenAxis(null)
                }}
                onResetManual={() => {
                  onResetChipManual(fileId, c.axis)
                  setOpenAxis(null)
                }}
                onClose={() => setOpenAxis(null)}
              />
            )}
          </span>
        )
      })}
    </div>
  )
}

export default ChipList
