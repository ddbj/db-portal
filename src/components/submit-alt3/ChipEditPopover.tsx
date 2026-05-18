import { RotateCcw, Trash2 } from "lucide-react"
import { useEffect, useRef } from "react"

import { Select } from "@/components/ui"
import cn from "@/components/ui/cn"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import { CHIP_AXIS_VALUES } from "@/lib/mock-data/submit-alt3"
import type { ChipAxis, ChipTag } from "@/types/submit-alt3"

interface Props {
  fileId: string
  chip: ChipTag
  onChangeValue: (next: string) => void
  onRemove: () => void
  onResetManual: () => void
  onClose: () => void
}

// chip クリック時に出る inline popover
// SSOT: docs/submit-alt3-tags.md §5.2「chip クリック編集 UX」
const ChipEditPopover = ({
  fileId: _fileId,
  chip,
  onChangeValue,
  onRemove,
  onResetManual,
  onClose,
}: Props) => {
  const { t } = useDynamicTranslation()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    // 1tick 遅らせて、popover を開いた直後の click を拾わない
    const t1 = setTimeout(() => {
      window.addEventListener("mousedown", handler)
    }, 0)
    window.addEventListener("keydown", escHandler)

    return () => {
      clearTimeout(t1)
      window.removeEventListener("mousedown", handler)
      window.removeEventListener("keydown", escHandler)
    }
  }, [onClose])

  const values = CHIP_AXIS_VALUES[chip.axis as ChipAxis]
  const options = values.map((v) => ({
    value: v,
    label: t(`routes.submitAlt3.chips.${chip.axis}.values.${v}`, {
      defaultValue: v,
    }),
  }))

  const isManual =
    chip.axis === "functional-genomics" && chip.manualOverride === true

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-40 mt-1 min-w-[200px] rounded-md border border-gray-200 bg-white p-2 shadow-lg",
      )}
    >
      <div className="mb-1.5 text-xs font-semibold text-gray-600">
        {t(`routes.submitAlt3.chips.${chip.axis}.label`, {
          defaultValue: chip.axis,
        })}
      </div>
      <Select
        selectSize="sm"
        options={options}
        value={chip.value}
        onChange={(e) => onChangeValue(e.target.value)}
      />
      <div className="mt-2 flex justify-between gap-2">
        {isManual ? (
          <button
            type="button"
            onClick={onResetManual}
            className="text-primary-700 inline-flex items-center gap-1 text-xs hover:underline"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            {t("routes.submitAlt3.chips.actions.resetManual")}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline"
        >
          <Trash2 className="h-3 w-3" aria-hidden="true" />
          {t("routes.submitAlt3.chips.actions.remove")}
        </button>
      </div>
    </div>
  )
}

export default ChipEditPopover
