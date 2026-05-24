import { cn } from "./cn"
import { FacetGroup } from "./facet-group"
import { ChevronDownIcon } from "./icons"
import { Label } from "./label"

export type DateRangeKey = "all" | "1y" | "5y" | "10y"

type DateFacetProps = {
  label?: string
  active?: DateRangeKey
  appliedCount?: number
  onClear?: () => void
  onRangeChange?: (key: DateRangeKey) => void
  from?: string
  to?: string
  onFromChange?: (value: string) => void
  onToChange?: (value: string) => void
}

const RANGES: readonly { key: DateRangeKey; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "1y", label: "1年" },
  { key: "5y", label: "5年" },
  { key: "10y", label: "10年" },
]

export const DateFacet = ({
  label = "公開日",
  active = "all",
  appliedCount = 0,
  onClear,
  onRangeChange,
  from,
  to,
  onFromChange,
  onToChange,
}: DateFacetProps) => (
  <FacetGroup
    label={label}
    appliedCount={appliedCount}
    {...(onClear === undefined ? {} : { onClear })}
  >
    <li className="list-none p-0 m-0 block">
      <div className="flex gap-1">
        {RANGES.map(({ key, label: rangeLabel }) => {
          const on = key === active
          return (
            <button
              key={key}
              type="button"
              onClick={() => onRangeChange?.(key)}
              aria-pressed={on}
              className={cn(
                "flex-1 py-1 text-[12px] font-semibold rounded-button cursor-pointer font-sans border",
                on
                  ? "bg-brand-soft text-brand-deep border-brand/35"
                  : "bg-transparent text-ink-mid border-border-soft",
              )}
            >
              {rangeLabel}
            </button>
          )
        })}
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer list-none text-[11.5px] text-ink-mid font-semibold inline-flex items-center gap-1 py-0.5">
          <ChevronDownIcon size={12} />
          日付を指定
        </summary>
        <div className="mt-2">
          <Label as="div">FROM</Label>
          <input
            type="date"
            value={from ?? ""}
            onChange={(e) => onFromChange?.(e.target.value)}
            aria-label="開始日"
            className="mt-1 w-full px-2.5 py-1.5 text-[13px] border border-border-soft rounded-button text-ink-mid font-mono box-border"
          />
          <Label as="div">TO</Label>
          <input
            type="date"
            value={to ?? ""}
            onChange={(e) => onToChange?.(e.target.value)}
            aria-label="終了日"
            className="mt-1 w-full px-2.5 py-1.5 text-[13px] border border-border-soft rounded-button text-ink-mid font-mono box-border"
          />
        </div>
      </details>
    </li>
  </FacetGroup>
)
