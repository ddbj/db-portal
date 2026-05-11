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
import { useMemo } from "react"

import { UseCaseCard } from "@/components/ui"
import cn from "@/components/ui/cn"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import { USE_CASE_CARDS_ALT } from "@/lib/mock-data/submit-alt-tree"
import type {
  CardIdAlt,
  LeafNodeIdAlt,
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
  // Q&A の答えにマッチする leaf 候補一覧。relatedLeafIds と交差する Card を active 表示する。
  candidateLeaves: readonly LeafNodeIdAlt[]
  activeCardId: CardIdAlt | null
  onSelect: (card: UseCaseCardAlt) => void
  className?: string
}

const isCardRelevantToCandidates = (
  card: UseCaseCardAlt,
  candidateSet: ReadonlySet<LeafNodeIdAlt>,
): boolean => {
  if (candidateSet.size === 0) return false

  return card.relatedLeafIds.some((leafId) => candidateSet.has(leafId))
}

const UseCaseCardGridAlt = ({
  candidateLeaves,
  activeCardId,
  onSelect,
  className,
}: UseCaseCardGridAltProps) => {
  const { t } = useDynamicTranslation()
  const sorted = [...USE_CASE_CARDS_ALT].sort((a, b) => a.order - b.order)
  const candidateSet = useMemo(
    () => new Set(candidateLeaves),
    [candidateLeaves],
  )

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {sorted.map((card) => {
        const Icon = ICON_MAP[card.iconName] ?? Bug
        const relevant = isCardRelevantToCandidates(card, candidateSet)
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
