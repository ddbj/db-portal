import type { ReactNode } from "react"

import cn from "./cn"

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

const EmptyState = ({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) => {

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-4 py-12 text-center",
        className,
      )}
    >
      {icon && <div className="text-gray-400">{icon}</div>}
      <h3 className="text-base font-semibold text-gray-700">{title}</h3>
      {description && (
        <p className="max-w-md text-sm text-gray-500">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export default EmptyState
