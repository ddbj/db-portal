import { cn } from "~/ui"

type TagProgressProps = {
  configured: number
  total: number
  heading: string
  remainingText: string
  completeText: string
  countLabel: string
}

export const TagProgress = ({
  configured,
  total,
  heading,
  remainingText,
  completeText,
  countLabel,
}: TagProgressProps) => {
  const percent = total === 0 ? 100 : Math.round((configured / total) * 100)
  const isComplete = total > 0 && configured === total
  const barColor = isComplete ? "bg-ok-fg" : "bg-brand"
  const container = isComplete
    ? "bg-ok-bg border-ok-border text-ok-fg"
    : "bg-surface border-border-soft text-ink-mid"
  const descriptionColor = isComplete ? "text-ok-fg" : "text-ink-mid"

  return (
    <div
      data-testid="tag-progress"
      className={cn(
        "flex flex-col gap-2 border rounded-card",
        container,
      )}
      style={{ padding: "14px 16px 12px" }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-fs-meta font-semibold text-ink-mid">{heading}</span>
        <span className="font-mono text-fs-label text-ink-mid font-semibold">{countLabel}</span>
        <div
          className="flex-1 h-1.5 bg-border-soft rounded-pill overflow-hidden"
          style={{ minWidth: 160 }}
          role="progressbar"
          aria-label={heading}
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${configured} / ${total} (${percent}%)`}
        >
          <div
            className={`h-full ${barColor}`}
            style={{ width: `${percent}%`, transition: "width 200ms" }}
          />
        </div>
        <span className="font-mono text-fs-label text-ink-mid font-semibold min-w-9 text-right">
          {percent}%
        </span>
      </div>
      <p className={cn("text-fs-meta m-0 leading-body", descriptionColor)}>
        {isComplete ? completeText : remainingText}
      </p>
    </div>
  )
}
