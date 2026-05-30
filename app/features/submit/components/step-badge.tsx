import { cn } from "~/ui"

type StepBadgeProps = {
  index: number
  pending: boolean
}

export const StepBadge = ({ index, pending }: StepBadgeProps) => (
  <span
    aria-hidden="true"
    className={cn(
      "inline-flex items-center justify-center font-mono font-semibold shrink-0",
      "w-7 h-7 rounded-pill text-fs-label",
      pending
        ? "bg-surface text-ink-soft border border-dashed border-border-soft"
        : "bg-brand-tint text-brand-deep",
    )}
  >
    {index}
  </span>
)
