import { format, isValid, parse } from "date-fns"

import { DatePicker } from "@/components/ui"
import type { AdvancedCondition } from "@/types/search"

interface DateFieldInputProps {
  condition: AdvancedCondition
  onChange: (patch: Partial<AdvancedCondition>) => void
  invalid?: boolean
  disabled?: boolean
}

const FORMAT = "yyyy-MM-dd"

const toDate = (s: string): Date | undefined => {
  if (!s) return undefined
  const d = parse(s, FORMAT, new Date())

  return isValid(d) ? d : undefined
}

const toIso = (d: Date | undefined): string =>
  d !== undefined ? format(d, FORMAT) : ""

const DateFieldInput = ({
  condition,
  onChange,
  invalid,
  disabled,
}: DateFieldInputProps) => {
  const invalidProp = invalid === true ? { invalid: true as const } : {}

  if (condition.operator === "between") {
    const v = typeof condition.value === "object"
        && !Array.isArray(condition.value)
      ? condition.value as { from: string; to: string }
      : { from: "", to: "" }
    const fromDate = toDate(v.from)
    const toDateValue = toDate(v.to)

    return (
      <div className="flex items-center gap-1">
        <DatePicker
          {...(fromDate !== undefined && { value: fromDate })}
          onChange={(d) =>
            onChange({ value: { from: toIso(d), to: v.to } })}
          {...invalidProp}
          inputSize="sm"
        />
        <span className="text-gray-400">〜</span>
        <DatePicker
          {...(toDateValue !== undefined && { value: toDateValue })}
          onChange={(d) =>
            onChange({ value: { from: v.from, to: toIso(d) } })}
          {...invalidProp}
          inputSize="sm"
        />
      </div>
    )
  }

  const s = typeof condition.value === "string" ? condition.value : ""
  const singleDate = toDate(s)

  return (
    <DatePicker
      {...(singleDate !== undefined && { value: singleDate })}
      onChange={(d) => onChange({ value: toIso(d) })}
      {...invalidProp}
      inputSize="sm"
      className={disabled ? "pointer-events-none opacity-50" : ""}
    />
  )
}

export default DateFieldInput
