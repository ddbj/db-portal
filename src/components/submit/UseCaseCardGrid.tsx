import { BarChart3, Bug, FileText, FlaskConical, GitBranch, Lock, type LucideIcon, Microscope, TestTube, Trees } from "lucide-react"
import { useTranslation } from "react-i18next"

import { UseCaseCard } from "@/components/ui"
import cn from "@/components/ui/cn"
import { USE_CASE_CARDS } from "@/lib/mock-data"
import type { CardId } from "@/types/submit"

const ICON_MAP: Record<string, LucideIcon> = {
  Bug,
  Trees,
  Microscope,
  BarChart3,
  GitBranch,
  FlaskConical,
  TestTube,
  FileText,
  Lock,
}

interface UseCaseCardGridProps {
  activeCardId: CardId | null
  onSelect: (cardId: CardId) => void
  className?: string
}

const UseCaseCardGrid = ({ activeCardId, onSelect, className }: UseCaseCardGridProps) => {
  const { t } = useTranslation()
  const sorted = [...USE_CASE_CARDS].sort((a, b) => a.order - b.order)

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {sorted.map((card) => {
        const Icon = ICON_MAP[card.iconName] ?? Bug

        return (
          <UseCaseCard
            key={card.id}
            title={t(card.titleKey)}
            description={t(card.descriptionKey)}
            icon={Icon}
            active={activeCardId === card.id}
            onClick={() => onSelect(card.id)}
          />
        )
      })}
    </div>
  )
}

export default UseCaseCardGrid
