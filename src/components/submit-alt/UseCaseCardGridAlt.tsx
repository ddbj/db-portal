import {
  BarChart3,
  Bug,
  FileText,
  FlaskConical,
  GitBranch,
  LayoutGrid,
  Lock,
  type LucideIcon,
  Microscope,
  TestTube,
  Trees,
} from "lucide-react"

import { UseCaseCard } from "@/components/ui"
import cn from "@/components/ui/cn"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import {
  isCardRelevant,
  USE_CASE_CARDS_ALT,
} from "@/lib/mock-data/submit-alt-tree"
import type {
  CardIdAlt,
  DataTypeId,
  UseCaseCardAlt,
} from "@/types/submit-alt"

const ICON_MAP: Record<string, LucideIcon> = {
  Bug,
  Trees,
  Microscope,
  BarChart3,
  LayoutGrid,
  GitBranch,
  FlaskConical,
  TestTube,
  FileText,
  Lock,
}

interface UseCaseCardGridAltProps {
  selectedTypes: ReadonlySet<DataTypeId>
  activeCardId: CardIdAlt | null
  onSelect: (card: UseCaseCardAlt) => void
  className?: string
}

// types= に該当するカードを relatedDataTypes 経由で active 表示する。
// activeCardId は ?for= から解決された card ID で、明示的に「選択された」状態を示す。
const UseCaseCardGridAlt = ({
  selectedTypes,
  activeCardId,
  onSelect,
  className,
}: UseCaseCardGridAltProps) => {
  const { t } = useDynamicTranslation()
  const sorted = [...USE_CASE_CARDS_ALT].sort((a, b) => a.order - b.order)

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {sorted.map((card) => {
        const Icon = ICON_MAP[card.iconName] ?? Bug
        const relevant = isCardRelevant(card, selectedTypes)
        const explicit = activeCardId === card.id

        return (
          <UseCaseCard
            key={card.id}
            title={t(card.titleKey)}
            description={t(card.descriptionKey)}
            icon={Icon}
            active={explicit || relevant}
            onClick={() => onSelect(card)}
          />
        )
      })}
    </div>
  )
}

export default UseCaseCardGridAlt
