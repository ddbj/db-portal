import { cn } from "./cn"

export type SegmentedOption = { value: string; label: string }

type SegmentedProps = {
  ariaLabel: string
  options: readonly SegmentedOption[]
  value: string
  onChange: (value: string) => void
  size?: "sm" | "md"
}

// A joined two-or-more-segment toggle (AND/OR 等)。プルダウンではなく即時に値が
// 見える切替が要るときに使う。active セグメントを brand 塗りで示す。
export const Segmented = ({ ariaLabel, options, value, onChange, size = "sm" }: SegmentedProps) => (
  <div
    role="group"
    aria-label={ariaLabel}
    className="inline-flex rounded-button border border-border-strong overflow-hidden select-none"
  >
    {options.map((option, index) => {
      const active = option.value === value

      return (
        <button
          key={option.value}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(option.value)}
          className={cn(
            "font-bold leading-none cursor-pointer transition-colors",
            size === "sm" ? "px-3 py-1 text-fs-label" : "px-3.5 py-1.5 text-fs-body-sm",
            index > 0 && "border-l border-border-strong",
            active ? "bg-brand text-white" : "bg-surface text-ink-mid hover:bg-surface-subtle",
          )}
        >
          {option.label}
        </button>
      )
    })}
  </div>
)
