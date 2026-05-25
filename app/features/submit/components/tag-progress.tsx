import { Label } from "~/ui"

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
  const containerColor = isComplete ? "bg-ok-bg text-ok-fg" : "bg-warn-bg text-warn-fg"

  return (
    <div data-testid="tag-progress" className={`flex flex-col gap-2 px-3.5 py-2.5 rounded-card ${containerColor}`}>
      <div className="flex items-center gap-3 flex-wrap">
        <Label as="span">{heading}</Label>
        <span className="font-mono text-fs-micro font-bold">{countLabel}</span>
        <div
          className="flex-1 h-1.5 bg-surface-subtle rounded-pill overflow-hidden"
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
        <span className="font-mono text-fs-micro font-bold w-10 text-right">{percent}%</span>
      </div>
      <p className="text-fs-micro text-ink-mid m-0 leading-relaxed">
        {isComplete ? completeText : remainingText}
      </p>
    </div>
  )
}
