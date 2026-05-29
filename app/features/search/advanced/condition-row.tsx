import { useT } from "~/lib/i18n"
import { CloseIcon, IconButton, Label, Select, type SelectOption, TextInput } from "~/ui"

import {
  ADVANCED_FIELDS,
  type AdvancedCombinator,
  type AdvancedField,
  type AdvancedOp,
  FIELD_OPS,
  isAdvancedField,
  isDateField,
} from "../types"
import type { AdvancedCondition } from "./reducer"

type CombinatorMode = "where" | "selectable"

const COMBINATOR_VALUES: readonly AdvancedCombinator[] = ["AND", "OR", "NOT"]

export type ConditionRowProps = {
  condition: AdvancedCondition
  combinatorMode: CombinatorMode
  removable: boolean
  onCombinatorChange: (combinator: AdvancedCombinator) => void
  onFieldChange: (field: AdvancedField) => void
  onOpChange: (op: AdvancedOp) => void
  onValueChange: (value: string) => void
  onRangeChange: (range: { from?: string; to?: string }) => void
  onRemove: () => void
}

export const ConditionRow = ({
  condition,
  combinatorMode,
  removable,
  onCombinatorChange,
  onFieldChange,
  onOpChange,
  onValueChange,
  onRangeChange,
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
  const combinatorOptions: SelectOption[] = COMBINATOR_VALUES.map((value) => ({
    value,
    label: t(`search.builder.combinator.${value.toLowerCase() as "and" | "or" | "not"}`),
  }))

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-20">
        {combinatorMode === "where"
          ? <Label>{t("search.builder.where")}</Label>
          : (
            <Select
              ariaLabel={t("search.a11y.builderConditions")}
              options={combinatorOptions}
              value={condition.combinator}
              onChange={(next) => {
                if (COMBINATOR_VALUES.includes(next as AdvancedCombinator)) {
                  onCombinatorChange(next as AdvancedCombinator)
                }
              }}
              width={92}
            />
          )}
      </div>
      <Select
        ariaLabel={t("search.a11y.fieldSelector")}
        options={fieldOptions}
        value={condition.field}
        onChange={(next) => {
          if (isAdvancedField(next)) onFieldChange(next)
        }}
        width={184}
      />
      <Select
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
            ariaLabel={t("search.builder.valuePlaceholder")}
            value={condition.value}
            onChange={(event) => onValueChange(event.currentTarget.value)}
            placeholder={t("search.builder.valuePlaceholder")}
            width={232}
          />
        )}
      <IconButton
        ariaLabel={t("search.builder.removeCondition")}
        onClick={onRemove}
        disabled={!removable}
      >
        <CloseIcon size={14} />
      </IconButton>
    </div>
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
