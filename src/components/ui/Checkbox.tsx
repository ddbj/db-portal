import type { ComponentProps, ReactNode } from "react"

import cn from "./cn"

type CheckboxProps = Omit<ComponentProps<"input">, "type"> & {
  label?: ReactNode
  invalid?: boolean
}

const Checkbox = ({ label, invalid, className, ...props }: CheckboxProps) => {

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        className={cn(
          "rounded border-gray-300 text-primary-600 focus:ring-primary-200",
          invalid && "border-red-300 focus:border-red-500 focus:ring-red-200",
          className,
        )}
        aria-invalid={invalid || undefined}
        {...props}
      />
      {label && <span>{label}</span>}
    </label>
  )
}

export default Checkbox
