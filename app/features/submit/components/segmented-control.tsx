import { Button, cn } from "~/ui"

export type Segment = {
  value: string
  label: string
  sub?: string
  disabled?: boolean
  disabledReason?: string
}

type SegmentedControlProps = {
  ariaLabel: string
  value: string | null
  segments: readonly Segment[]
  onChange: (value: string) => void
}

// 前段 (Q1/Q2) の単一選択。radiogroup として描画し、disable された選択肢は理由を tip で示す
export const SegmentedControl = ({ ariaLabel, value, segments, onChange }: SegmentedControlProps) => (
  <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
    {segments.map((seg) => {
      const selected = seg.value === value

      return (
        <Button
          key={seg.value}
          kind={selected ? "primary" : "secondary"}
          size="md"
          role="radio"
          aria-checked={selected}
          disabled={seg.disabled}
          title={seg.disabled ? seg.disabledReason : undefined}
          onClick={() => onChange(seg.value)}
        >
          <span className="flex flex-col items-start gap-0.5">
            <span className="text-fs-body-sm font-semibold">{seg.label}</span>
            {seg.sub !== undefined && (
              <span className={cn("text-fs-micro font-normal", selected ? "opacity-90" : "text-ink-soft")}>
                {seg.sub}
              </span>
            )}
          </span>
        </Button>
      )
    })}
  </div>
)
