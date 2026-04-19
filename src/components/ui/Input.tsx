import { Search } from "lucide-react"
import type { ComponentProps } from "react"

import cn from "./cn"

const sizeStyles = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3 py-2 text-sm",
  lg: "px-4 py-2.5 text-base",
} as const

type InputProps = Omit<ComponentProps<"input">, "size"> & {
  invalid?: boolean
  variant?: "default" | "search"
  inputSize?: keyof typeof sizeStyles
}

const Input = ({
  invalid,
  variant = "default",
  inputSize = "md",
  className,
  type = "text",
  ...props
}: InputProps) => {
  if (variant === "search") {
    return (
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <input
          type={type}
          className={cn(
            "block w-full rounded-md border-gray-300 pl-8 focus:border-primary-500 focus:ring-primary-200",
            sizeStyles[inputSize],
            invalid && "border-red-300 focus:border-red-500 focus:ring-red-200",
            className,
          )}
          aria-invalid={invalid || undefined}
          {...props}
        />
      </div>
    )
  }

  return (
    <input
      type={type}
      className={cn(
        "block w-full rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-200",
        sizeStyles[inputSize],
        invalid && "border-red-300 focus:border-red-500 focus:ring-red-200",
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}

export default Input
