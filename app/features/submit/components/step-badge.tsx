import { cn } from "~/ui"

type StepBadgeProps = {
  index: number
  pending: boolean
}

export const StepBadge = ({ index, pending }: StepBadgeProps) => (
  <span
    aria-hidden="true"
    className={cn(
      "inline-flex items-center justify-center font-mono font-bold text-fs-body shrink-0",
      "w-7 h-7 rounded-pill border",
      pending
        ? "bg-warn-bg text-warn-fg border-warn-border border-dashed"
        : "bg-brand-soft text-brand-deep border-brand-light",
    )}
  >
    {index}
  </span>
)
