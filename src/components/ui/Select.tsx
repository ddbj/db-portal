import type { ComponentProps } from "react"

import cn from "./cn"

const sizeStyles = {
  sm: "px-2.5 py-1.5 pr-8 text-xs",
  md: "px-3 py-2 pr-8 text-sm",
  lg: "px-4 py-2.5 pr-10 text-base",
} as const

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

type SelectProps = Omit<ComponentProps<"select">, "size"> & {
  options: readonly SelectOption[]
  invalid?: boolean
  selectSize?: keyof typeof sizeStyles
}

const Select = ({
  options,
  invalid,
  selectSize = "md",
  className,
  ...props
}: SelectProps) => {

  return (
    <select
      className={cn(
        "block w-full rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-200",
        sizeStyles[selectSize],
        invalid && "border-red-300 focus:border-red-500 focus:ring-red-200",
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

export default Select
