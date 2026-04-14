import type { ReactNode } from "react"

import cn from "./cn"

const variantStyles = {
  primary: "bg-primary-100 text-primary-700",
  secondary: "bg-secondary-100 text-secondary-700",
  gray: "bg-gray-100 text-gray-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  error: "bg-red-100 text-red-700",
} as const

const sizeStyles = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
} as const

interface BadgeProps {
  variant?: keyof typeof variantStyles
  size?: keyof typeof sizeStyles
  children: ReactNode
  className?: string
}

const Badge = ({ variant = "gray", size = "md", children, className }: BadgeProps) => {

  return (
    <span className={cn("inline-flex items-center rounded-full font-medium", sizeStyles[size], variantStyles[variant], className)}>
      {children}
    </span>
  )
}

export default Badge
