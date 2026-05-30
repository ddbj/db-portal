import { useT } from "~/lib/i18n"
import { Button, CloseIcon, IconButton, Label, Select, type SelectOption, TextInput } from "~/ui"

import {
  ADVANCED_FIELDS,
  type AdvancedField,
  type AdvancedOp,
  FIELD_OPS,
  isAdvancedField,
  isDateField,
} from "../types"
import type { AdvancedCondition } from "./reducer"

export type ConditionRowProps = {
  condition: AdvancedCondition
  excluded: boolean
  canExclude: boolean
  removable: boolean
  onFieldChange: (field: AdvancedField) => void
  onOpChange: (op: AdvancedOp) => void
  onValueChange: (value: string) => void
  onRangeChange: (range: { from?: string; to?: string }) => void
  onToggleExclude: () => void
  onRemove: () => void
}

export const ConditionRow = ({
  condition,
  excluded,
  canExclude,
  removable,
  onFieldChange,
  onOpChange,
  onValueChange,
  onRangeChange,
  onToggleExclude,
  onRemove,
}: ConditionRowProps) => {
  const t = useT()
  const dateField = isDateField(condition.field)
  const opOptions: SelectOption[] = FIELD_OPS[condition.field].map((op) => ({
    value: op,
    label: t(`search.builder.op.${op}`),
  }))
  const fieldOptions: SelectOption[] = ADVANCED_FIELDS.map((field) => ({
    value: field,
    label: t(`search.builder.field.${camelize(field)}`),
  }))

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        size="md"
        ariaLabel={t("search.a11y.fieldSelector")}
        options={fieldOptions}
        value={condition.field}
        onChange={(next) => {
          if (isAdvancedField(next)) onFieldChange(next)
        }}
        width={184}
      />
      <Select
        size="md"
        ariaLabel={t("search.a11y.opSelector")}
        options={opOptions}
        value={condition.op}
        onChange={(next) => onOpChange(next as AdvancedOp)}
        width={148}
      />
      {dateField || condition.op === "between"
        ? (
          <div className="flex items-center gap-2">
            <Label>{t("search.builder.rangeFromLabel")}</Label>
            <TextInput
              size="md"
              type="date"
              ariaLabel={t("search.builder.rangeFromLabel")}
              value={condition.from}
              onChange={(event) => onRangeChange({ from: event.currentTarget.value })}
              placeholder={t("search.builder.rangeFromPlaceholder")}
              mono
              width={156}
            />
            <Label>{t("search.builder.rangeToLabel")}</Label>
            <TextInput
              size="md"
              type="date"
              ariaLabel={t("search.builder.rangeToLabel")}
              value={condition.to}
              onChange={(event) => onRangeChange({ to: event.currentTarget.value })}
              placeholder={t("search.builder.rangeToPlaceholder")}
              mono
              width={156}
            />
          </div>
        )
        : (
          <TextInput
            size="md"
            ariaLabel={t("search.builder.valuePlaceholder")}
            value={condition.value}
            onChange={(event) => onValueChange(event.currentTarget.value)}
            placeholder={t("search.builder.valuePlaceholder")}
            width={232}
          />
        )}
      <span className="ml-auto flex items-center gap-1.5">
        <ExcludeToggle excluded={excluded} disabled={!canExclude} onToggle={onToggleExclude} />
        <IconButton
          ariaLabel={t("search.builder.removeCondition")}
          onClick={onRemove}
          disabled={!removable}
        >
          <CloseIcon size={14} />
        </IconButton>
      </span>
    </div>
  )
}

type ExcludeToggleProps = {
  excluded: boolean
  disabled: boolean
  onToggle: () => void
}

// "除外 (NOT)" negates a single condition. It is the only per-row boolean control;
// AND/OR is chosen once per group, so there is no per-row combinator picker.
export const ExcludeToggle = ({ excluded, disabled, onToggle }: ExcludeToggleProps) => {
  const t = useT()

  return (
    <Button
      kind={excluded ? "danger" : "secondary"}
      size="sm"
      aria-pressed={excluded}
      disabled={disabled}
      onClick={onToggle}
    >
      {t("search.builder.exclude")}
    </Button>
  )
}

const camelize = (
  field: AdvancedField,
): "identifier" | "title" | "description" | "organismId" | "organismName" | "accessibility" | "datePublished" | "dateModified" | "dateCreated" | "submitter" | "publication" => {
  switch (field) {
    case "organism_id":
      return "organismId"
    case "organism_name":
      return "organismName"
    case "date_published":
      return "datePublished"
    case "date_modified":
      return "dateModified"
    case "date_created":
      return "dateCreated"
    case "identifier":
    case "title":
    case "description":
    case "accessibility":
    case "submitter":
    case "publication":
      return field
  }
}
