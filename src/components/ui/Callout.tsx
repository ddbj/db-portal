import type { ReactNode } from "react"

const typeStyles = {
  info: "border-info bg-blue-50",
  success: "border-success bg-green-50",
  warning: "border-warning bg-yellow-50",
  error: "border-error bg-red-50",
} as const

interface CalloutProps {
  type: keyof typeof typeStyles
  children: ReactNode
  className?: string
}

const Callout = ({ type, children, className = "" }: CalloutProps) => {

  return (
    <div className={`rounded border-l-4 p-3 ${typeStyles[type]} ${className}`}>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  )
}

export default Callout
