import { useT } from "~/lib/i18n"
import { CloseIcon, IconButton, Label, Select, type SelectOption, TextInput } from "~/ui"

import {
  ADVANCED_FIELDS,
  type AdvancedField,
  fieldLabelKey,
  fieldPredicates,
  isAdvancedField,
  isDateField,
  parsePredicate,
  type Predicate,
  predicateLabelKey,
  predicateValue,
} from "../types"
import type { AdvancedCondition } from "./reducer"

export type ConditionRowProps = {
  condition: AdvancedCondition
  removable: boolean
  onFieldChange: (field: AdvancedField) => void
  onPredicateChange: (predicate: Predicate) => void
  onValueChange: (value: string) => void
  onRangeChange: (range: { from?: string; to?: string }) => void
  onRemove: () => void
}

export const ConditionRow = ({
  condition,
  removable,
  onFieldChange,
  onPredicateChange,
  onValueChange,
  onRangeChange,
  onRemove,
}: ConditionRowProps) => {
  const t = useT()
  const dateField = isDateField(condition.field)
  const negated = condition.combinator === "NOT"
  const fieldOptions: SelectOption[] = ADVANCED_FIELDS.map((field) => ({
    value: field,
    label: t(`search.builder.field.${fieldLabelKey(field)}`),
  }))
  // Operator + negation folded into one predicate dropdown so the row reads as a
  // clause ("タイトル を含まない …"); there is no separate exclude toggle.
  const predicateOptions: SelectOption[] = fieldPredicates(condition.field).map((predicate) => ({
    value: predicateValue(predicate),
    label: t(`search.builder.predicate.${predicateLabelKey(predicate)}`),
  }))
  const currentPredicate = predicateValue({ op: condition.op, negated })

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
        ariaLabel={t("search.a11y.predicateSelector")}
        options={predicateOptions}
        value={currentPredicate}
        onChange={(next) => onPredicateChange(parsePredicate(next))}
        width={184}
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
      <span className="ml-auto">
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
