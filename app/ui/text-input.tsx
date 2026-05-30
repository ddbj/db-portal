import type { CSSProperties, InputHTMLAttributes } from "react"

import { cn } from "./cn"

type TextInputState = "default" | "warn"

type TextInputSize = "sm" | "md" | "lg"

type TextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "aria-label" | "aria-describedby" | "aria-invalid" | "size"
> & {
  ariaLabel: string
  ariaDescribedby?: string
  state?: TextInputState
  mono?: boolean
  size?: TextInputSize
  width?: number
}

// Fixed heights (with leading-none so single-line text stays centered) so a
// sized TextInput lines up exactly with a sized Select; the unsized default
// keeps the original padding for existing call sites.
const sizeClass: Record<TextInputSize, string> = {
  sm: "h-7 leading-none text-fs-body",
  md: "h-8 leading-none text-fs-body",
  lg: "h-10 leading-none text-fs-body",
}

export const TextInput = ({
  ariaLabel,
  ariaDescribedby,
  state = "default",
  mono = false,
  size,
  width,
  type = "text",
  ...rest
}: TextInputProps) => {
  const wrapperStyle: CSSProperties | undefined = width === undefined ? undefined : { width }
  const isWarn = state === "warn"

  return (
    <input
      {...rest}
      type={type}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      aria-invalid={isWarn || undefined}
      style={wrapperStyle}
      className={cn(
        "px-3 rounded-button font-sans",
        size === undefined ? "py-2 text-fs-body" : sizeClass[size],
        isWarn
          ? "border border-warn-border bg-warn-bg text-ink"
          : "border border-border-soft bg-surface text-ink",
        mono && "font-mono tracking-mono",
      )}
    />
  )
}
