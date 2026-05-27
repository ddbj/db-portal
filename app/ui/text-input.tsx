import type { CSSProperties, InputHTMLAttributes } from "react"

import { cn } from "./cn"

type TextInputState = "default" | "warn"

type TextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "aria-label" | "aria-describedby" | "aria-invalid"
> & {
  ariaLabel: string
  ariaDescribedby?: string
  state?: TextInputState
  mono?: boolean
  width?: number
}

export const TextInput = ({
  ariaLabel,
  ariaDescribedby,
  state = "default",
  mono = false,
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
        "text-fs-body py-2 px-3 rounded-button font-sans",
        isWarn
          ? "border border-warn-border bg-warn-bg text-ink"
          : "border border-border-soft bg-surface text-ink",
        mono && "font-mono tracking-mono",
      )}
    />
  )
}
