import type { LucideIcon } from "lucide-react"

import cn from "./cn"

interface UseCaseCardProps {
  title: string
  description: string
  icon: LucideIcon
  active?: boolean
  onClick: () => void
  className?: string
}

// ユースケース選択カード（Phase 4 Submit 画面の 9 枚グリッド）。
// primary 色は「状態変化のアクセント」原則に従い、active / hover のみで発色。
const UseCaseCard = ({
  title,
  description,
  icon: Icon,
  active = false,
  onClick,
  className,
}: UseCaseCardProps) => {

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group flex w-full items-start gap-3 rounded-lg border p-5 text-left transition-all",
        active
          ? "border-primary-600 bg-primary-50 shadow-sm"
          : "border-gray-200 bg-white hover:-translate-y-px hover:border-primary-300 hover:bg-primary-50/40 hover:shadow-md",
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "h-6 w-6 shrink-0 transition-colors",
          active
            ? "text-primary-700"
            : "text-primary-600 group-hover:text-primary-700",
        )}
      />
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "text-sm font-semibold transition-colors",
            active
              ? "text-primary-900"
              : "text-gray-900 group-hover:text-primary-800",
          )}
        >
          {title}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-gray-600">{description}</p>
      </div>
    </button>
  )
}

export default UseCaseCard
