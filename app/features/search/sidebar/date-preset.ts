import type { DateRangeKey } from "~/ui"

// Date-range preset math, shared by emit (fromSidebar), URL restore (split), and
// display (FacetPanel). A preset ("1y" / "5y" / "10y") is a relative window
// anchored on `now`; "all" and "custom" have no derivable bounds.

const YEARS_BACK: Partial<Record<DateRangeKey, number>> = { "1y": 1, "5y": 5, "10y": 10 }

const isoDate = (date: Date): string => date.toISOString().slice(0, 10)

// Concrete [from, to] for a preset relative to `now`, or null for "all" / "custom"
// (whose bounds are either absent or user-entered).
export const presetRangeToDates = (
  key: DateRangeKey,
  now: Date,
): { from: string; to: string } | null => {
  const years = YEARS_BACK[key]
  if (years === undefined) return null
  const from = new Date(now)
  from.setFullYear(now.getFullYear() - years)

  return { from: isoDate(from), to: isoDate(now) }
}

// Reverse of presetRangeToDates: classify a concrete [from, to] back into the
// preset it matches relative to `now`, or "custom" when it matches none. Lets a
// preset survive the URL round-trip (the URL only carries the absolute between).
export const matchDatePreset = (from: string, to: string, now: Date): DateRangeKey => {
  for (const key of ["1y", "5y", "10y"] as const) {
    const preset = presetRangeToDates(key, now)
    if (preset && preset.from === from && preset.to === to) return key
  }

  return "custom"
}
