import type { CSSProperties, SelectHTMLAttributes } from "react"

import { cn } from "./cn"
import { ChevronDownIcon } from "./icons"

type NativeSelectState = "default" | "warn"

export type NativeSelectOption = string | { value: string; label: string }

type NativeSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "className" | "aria-label" | "aria-describedby" | "aria-invalid"
> & {
  ariaLabel: string
  ariaDescribedby?: string
  options: readonly NativeSelectOption[]
  width?: number
  state?: NativeSelectState
}

export const NativeSelect = ({
  ariaLabel,
  ariaDescribedby,
  options,
  width,
  state = "default",
  value,
  defaultValue,
  ...rest
}: NativeSelectProps) => {
  const wrapperStyle: CSSProperties = { width: width ?? "auto" }
  const isWarn = state === "warn"
  const isEmpty = (value ?? defaultValue ?? "") === ""

  return (
    <div className="relative inline-block" style={wrapperStyle}>
      <select
        {...rest}
        value={value}
        defaultValue={defaultValue}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedby}
        aria-invalid={isWarn || undefined}
        className={cn(
          "w-full appearance-none text-fs-body py-2 pl-3 pr-8 rounded-button cursor-pointer font-sans",
          isWarn
            ? "border border-warn-border bg-warn-bg"
            : "border border-border-soft bg-surface",
          isWarn && isEmpty ? "text-ink-soft" : "text-ink",
        )}
      >
        {options.map((option) => {
          const value = typeof option === "string" ? option : option.value
          const label = typeof option === "string" ? option : option.label

          return <option key={value} value={value}>{label}</option>
        })}
      </select>
      <ChevronDownIcon
        size={14}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-mid"
      />
    </div>
  )
}
