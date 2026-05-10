import { Callout } from "@/components/ui"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import {
  PATTERN_CALLOUT_VARIANT,
  PATTERN_I18N_KEYS,
} from "@/lib/submit-alt/multi-select-patterns"
import type { MultiSelectPattern } from "@/types/submit-alt"

interface MultiSelectGuidanceProps {
  pattern: MultiSelectPattern
}

// pattern が "single" 以外の時のみ Callout を表示する動的案内。
const MultiSelectGuidance = ({ pattern }: MultiSelectGuidanceProps) => {
  const { t } = useDynamicTranslation()

  if (pattern === "single") return null

  const variant = PATTERN_CALLOUT_VARIANT[pattern]
  const keys = PATTERN_I18N_KEYS[pattern]

  return (
    <Callout type={variant}>
      <strong className="block text-sm font-semibold">{t(keys.title)}</strong>
      <p className="mt-1 text-sm leading-relaxed">{t(keys.description)}</p>
    </Callout>
  )
}

export default MultiSelectGuidance
