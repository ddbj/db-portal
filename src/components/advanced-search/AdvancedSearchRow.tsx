import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button, Combobox, Input, Select } from "@/components/ui"
import type { AdvancedFieldDef } from "@/lib/advanced-search/types"
import type {
  AdvancedCondition,
  FieldOperator,
  LogicOperator,
} from "@/types/search"

import DateFieldInput from "./DateFieldInput"

interface AdvancedSearchRowProps {
  condition: AdvancedCondition
  availableFields: readonly AdvancedFieldDef[]
  onChange: (patch: Partial<AdvancedCondition>) => void
  onRemove: () => void
  hasLogicPrefix: boolean
  logic?: LogicOperator
  onLogicChange?: (logic: LogicOperator) => void
}

const AdvancedSearchRow = (props: AdvancedSearchRowProps) => {
  const {
    condition,
    availableFields,
    onChange,
    onRemove,
    hasLogicPrefix,
    logic,
    onLogicChange,
  } = props
  const { t: tStrict } = useTranslation()
  const t = tStrict as unknown as (key: string) => string

  const fieldDef = availableFields.find((f) => f.id === condition.field)

  const fieldOptions = availableFields.map((f) => ({
    value: f.id,
    label: t(`routes.advancedSearch.fields.${f.id}.label`),
  }))
  const operatorOptions = fieldDef
    ? fieldDef.availableOps.map((op) => ({
      value: op,
      label: t(`routes.advancedSearch.operators.${op}`),
    }))
    : []

  const logicOptions = (["AND", "OR", "NOT"] as const).map((l) => ({
    value: l,
    label: t(`routes.advancedSearch.logic.${l}`),
  }))

  return (
    <div className="flex flex-wrap items-start gap-2 rounded-md bg-white p-2 ring-1 ring-gray-200">
      {hasLogicPrefix && (
        <Select
          options={logicOptions}
          value={logic ?? "AND"}
          onChange={(e) => onLogicChange?.(e.target.value as LogicOperator)}
          selectSize="sm"
          className="w-20"
        />
      )}
      <Combobox
        options={fieldOptions}
        value={condition.field}
        onChange={(v) => onChange({ field: v })}
        inputSize="sm"
        className="w-48"
      />
      <Select
        options={operatorOptions}
        value={condition.operator}
        onChange={(e) =>
          onChange({ operator: e.target.value as FieldOperator })}
        selectSize="sm"
        className="w-28"
      />
      <div className="min-w-0 flex-1">
        <ValueInput
          condition={condition}
          fieldDef={fieldDef}
          onChange={onChange}
        />
      </div>
      <Button
        variant="tertiary"
        size="sm"
        onClick={onRemove}
        aria-label={t("routes.advancedSearch.builder.removeAria")}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

interface ValueInputProps {
  condition: AdvancedCondition
  fieldDef: AdvancedFieldDef | undefined
  onChange: (patch: Partial<AdvancedCondition>) => void
}

const ValueInput = ({ condition, fieldDef, onChange }: ValueInputProps) => {
  const { t: tStrict } = useTranslation()
  const t = tStrict as unknown as (key: string) => string

  if (!fieldDef) {
    return <Input placeholder="(unknown field)" disabled inputSize="sm" />
  }

  if (fieldDef.type === "date") {
    return <DateFieldInput condition={condition} onChange={onChange} />
  }

  if (fieldDef.type === "number") {
    if (condition.operator === "between") {
      const v = typeof condition.value === "object"
          && !Array.isArray(condition.value)
        ? condition.value as { from: string; to: string }
        : { from: "", to: "" }

      return (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={v.from}
            onChange={(e) =>
              onChange({ value: { from: e.target.value, to: v.to } })}
            inputSize="sm"
          />
          <span className="text-gray-400">〜</span>
          <Input
            type="number"
            value={v.to}
            onChange={(e) =>
              onChange({ value: { from: v.from, to: e.target.value } })}
            inputSize="sm"
          />
        </div>
      )
    }
    const s = typeof condition.value === "string" ? condition.value : ""

    return (
      <Input
        type="number"
        value={s}
        onChange={(e) => onChange({ value: e.target.value })}
        inputSize="sm"
      />
    )
  }

  if (fieldDef.type === "enum" && fieldDef.enumValues) {
    const options = fieldDef.enumValues.map((ev) => ({
      value: ev.value,
      label: t(ev.labelKey),
    }))
    const currentValue = typeof condition.value === "string"
      ? condition.value
      : ""
    if (options.length <= 5) {
      return (
        <Select
          options={options}
          value={currentValue}
          onChange={(e) => onChange({ value: e.target.value })}
          selectSize="sm"
        />
      )
    }

    return (
      <Combobox
        options={options}
        value={currentValue}
        onChange={(v) => onChange({ value: v })}
        inputSize="sm"
      />
    )
  }

  const placeholder = (() => {
    if (condition.operator === "wildcard") return "foo* / b?r"
    if (fieldDef.placeholderKey) return t(fieldDef.placeholderKey)

    return ""
  })()

  const s = typeof condition.value === "string" ? condition.value : ""

  return (
    <Input
      value={s}
      onChange={(e) => onChange({ value: e.target.value })}
      placeholder={placeholder}
      inputSize="sm"
    />
  )
}

export default AdvancedSearchRow
