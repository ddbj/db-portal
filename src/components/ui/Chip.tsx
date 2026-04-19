import { X } from "lucide-react"
import type { ReactNode } from "react"

import cn from "./cn"

type ChipVariant = "default" | "selected" | "removable"

interface ChipProps {
  variant?: ChipVariant
  onClick?: () => void
  onRemove?: () => void
  children: ReactNode
  className?: string
}

const variantStyles: Record<ChipVariant, string> = {
  default: "bg-gray-100 text-gray-700 hover:bg-primary-50 hover:text-primary-700",
  selected: "bg-primary-100 text-primary-700 ring-1 ring-primary-300",
  removable: "bg-gray-100 text-gray-700",
}

const Chip = ({
  variant = "default",
  onClick,
  onRemove,
  children,
  className,
}: ChipProps) => {
  const base = cn(
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs",
    variantStyles[variant],
    className,
  )
  if (variant === "removable") {
    return (
      <span className={base}>
        <span>{children}</span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="削除"
            className="hover:text-error-600 -mr-1 rounded p-0.5 text-gray-500 hover:bg-gray-200"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        )}
      </span>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(base, "cursor-pointer")}>
        {children}
      </button>
    )
  }

  return <span className={base}>{children}</span>
}

export default Chip
