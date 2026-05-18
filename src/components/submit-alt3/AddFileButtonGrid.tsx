import {
  BarChart3,
  ClipboardList,
  Dna,
  FlaskConical,
  GitBranch,
  Grid3x3,
  Hexagon,
  Layers,
  type LucideIcon,
  Tags,
} from "lucide-react"

import cn from "@/components/ui/cn"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import { BUTTON_GRID_ORDER, BUTTON_META } from "@/lib/mock-data/submit-alt3"
import type { ButtonType } from "@/types/submit-alt3"

interface Props {
  enabledButtons: readonly ButtonType[]
  onSelectButton: (type: ButtonType) => void
}

const ICONS: Readonly<Record<string, LucideIcon>> = {
  Dna,
  Layers,
  Tags,
  GitBranch,
  ClipboardList,
  Grid3x3,
  BarChart3,
  FlaskConical,
  Hexagon,
}

// 9 種ファイル追加ボタンの 3x3 grid
// SSOT: docs/submit-alt3.md §3 / docs/submit-alt3-modals.md §6.1
// Phase A では enabledButtons で「+ 配列リード」のみ enabled、他 8 個は disabled
const AddFileButtonGrid = ({ enabledButtons, onSelectButton }: Props) => {
  const { t } = useDynamicTranslation()
  const enabledSet = new Set(enabledButtons)

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {BUTTON_GRID_ORDER.map((type) => {
        const meta = BUTTON_META[type]
        const Icon = ICONS[meta.iconName] ?? Dna
        const enabled = enabledSet.has(type)
        const label = t(`routes.submitAlt3.buttons.${meta.i18nKey}.label`)

        return (
          <button
            key={type}
            type="button"
            data-testid={`add-file-button-${type}`}
            disabled={!enabled}
            onClick={() => enabled && onSelectButton(type)}
            className={cn(
              "flex items-center gap-3 rounded-md border px-4 py-3 text-left text-sm font-medium transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-2",
              enabled
                ? "border-gray-300 bg-white text-gray-800 hover:border-primary-300 hover:bg-primary-50"
                : "cursor-not-allowed border-dashed border-gray-200 bg-gray-50 text-gray-400",
            )}
            aria-label={label}
          >
            <Icon
              className={cn(
                "h-5 w-5 flex-shrink-0",
                enabled ? "text-primary-600" : "text-gray-300",
              )}
              aria-hidden="true"
            />
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default AddFileButtonGrid
