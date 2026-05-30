import { useEffect, useState } from "react"

import { cn } from "./cn"
import { FacetGroup } from "./facet-group"
import { ChevronDownIcon } from "./icons"
import { Label } from "./label"

// "custom" = a manually entered FROM/TO range that matches no preset; it
// highlights none of the preset buttons but still drives the date filter.
export type DateRangeKey = "all" | "1y" | "5y" | "10y" | "custom"

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

const dateInputClass =
  "mt-1 w-full px-2.5 py-1.5 text-fs-body-sm border border-border-soft rounded-button text-ink-mid font-mono box-border"

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
}: DateFacetProps) => {
  // Reveal the FROM/TO detail whenever a preset is picked or a custom range is
  // set, so the resulting window is visible immediately; collapse follows "all".
  const [open, setOpen] = useState(active !== "all")
  useEffect(() => {
    if (active !== "all") setOpen(true)
  }, [active])

  return (
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
                  "flex-1 py-1 text-fs-label font-semibold rounded-button cursor-pointer font-sans border",
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
        <details
          className="mt-2"
          open={open}
          onToggle={(e) => setOpen(e.currentTarget.open)}
        >
          <summary className="cursor-pointer list-none text-fs-micro text-ink-mid font-semibold inline-flex items-center gap-1 py-0.5">
            <ChevronDownIcon size={9} />
            日付を指定
          </summary>
          <div className="mt-2 flex flex-col gap-3">
            <div>
              <Label as="div">FROM</Label>
              <input
                type="date"
                value={from ?? ""}
                onChange={(e) => onFromChange?.(e.target.value)}
                aria-label="開始日"
                className={dateInputClass}
              />
            </div>
            <div>
              <Label as="div">TO</Label>
              <input
                type="date"
                value={to ?? ""}
                onChange={(e) => onToChange?.(e.target.value)}
                aria-label="終了日"
                className={dateInputClass}
              />
            </div>
          </div>
        </details>
      </li>
    </FacetGroup>
  )
}
