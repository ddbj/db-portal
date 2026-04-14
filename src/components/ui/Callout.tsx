import type { ReactNode } from "react"

import cn from "./cn"

const typeStyles = {
  info: { container: "border-info bg-blue-50", text: "text-blue-800", role: "status" as const },
  success: { container: "border-success bg-green-50", text: "text-green-800", role: "status" as const },
  warning: { container: "border-warning bg-yellow-50", text: "text-yellow-800", role: "alert" as const },
  error: { container: "border-error bg-red-50", text: "text-red-800", role: "alert" as const },
} as const

interface CalloutProps {
  type: keyof typeof typeStyles
  children: ReactNode
  className?: string
}

const Callout = ({ type, children, className }: CalloutProps) => {
  const s = typeStyles[type]

  return (
    <div role={s.role} className={cn("rounded border-l-4 p-3", s.container, className)}>
      <div className={cn("text-sm", s.text)}>{children}</div>
    </div>
  )
}

export default Callout
