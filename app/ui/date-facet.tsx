import { useEffect, useState } from "react"

import { cn } from "./cn"
import { FacetGroup } from "./facet-group"
import { ChevronDownIcon } from "./icons"
import { Label } from "./label"

// "custom" = a manually entered FROM/TO range that matches no preset; it
// highlights none of the preset buttons but still drives the date filter.
export type DateRangeKey = "all" | "1y" | "5y" | "10y" | "custom"

// Preset buttons render in this order; "custom" has no button (it highlights none).
type PresetKey = Exclude<DateRangeKey, "custom">

type PresetLabels = Record<PresetKey, string>

type DateFacetProps = {
  label?: string
  active?: DateRangeKey
  appliedCount?: number
  onClear?: () => void
  clearLabel?: string
  onRangeChange?: (key: DateRangeKey) => void
  from?: string
  to?: string
  onFromChange?: (value: string) => void
  onToChange?: (value: string) => void
  presetLabels?: PresetLabels
  specifyLabel?: string
  fromLabel?: string
  toLabel?: string
  fromAriaLabel?: string
  toAriaLabel?: string
}

const PRESET_ORDER: readonly PresetKey[] = ["all", "1y", "5y", "10y"]

const DEFAULT_PRESET_LABELS: PresetLabels = {
  all: "すべて",
  "1y": "1年",
  "5y": "5年",
  "10y": "10年",
}

const dateInputClass =
  "mt-1 w-full px-2.5 py-1.5 text-fs-body-sm border border-border-soft rounded-button text-ink-mid font-mono box-border"

export const DateFacet = ({
  label = "公開日",
  active = "all",
  appliedCount = 0,
  onClear,
  clearLabel = "解除",
  onRangeChange,
  from,
  to,
  onFromChange,
  onToChange,
  presetLabels = DEFAULT_PRESET_LABELS,
  specifyLabel = "日付を指定",
  fromLabel = "FROM",
  toLabel = "TO",
  fromAriaLabel = "開始日",
  toAriaLabel = "終了日",
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
      clearLabel={clearLabel}
      {...(onClear === undefined ? {} : { onClear })}
    >
      <li className="list-none p-0 m-0 block">
        <div className="flex gap-1">
          {PRESET_ORDER.map((key) => {
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
                {presetLabels[key]}
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
            {specifyLabel}
          </summary>
          <div className="mt-2 flex flex-col gap-3">
            <div>
              <Label as="div">{fromLabel}</Label>
              <input
                type="date"
                value={from ?? ""}
                onChange={(e) => onFromChange?.(e.target.value)}
                aria-label={fromAriaLabel}
                className={dateInputClass}
              />
            </div>
            <div>
              <Label as="div">{toLabel}</Label>
              <input
                type="date"
                value={to ?? ""}
                onChange={(e) => onToChange?.(e.target.value)}
                aria-label={toAriaLabel}
                className={dateInputClass}
              />
            </div>
          </div>
        </details>
      </li>
    </FacetGroup>
  )
}
