import { useT } from "~/lib/i18n"
import {
  CloseIcon,
  Combobox,
  type ComboboxOption,
  IconButton,
  Label,
  Select,
  type SelectOption,
  TextInput,
} from "~/ui"

import { rowByDslField } from "../sidebar/facet-config"
import {
  type AdvancedField,
  fieldLabelKey,
  fieldPredicates,
  fieldsForScope,
  isAdvancedField,
  isDateField,
  parsePredicate,
  type Predicate,
  predicateLabelKey,
  predicateValue,
} from "../types"
import type { AdvancedCondition } from "./reducer"
import { useScopeDb, useScopeFacetData } from "./scope-context"

export type ConditionRowProps = {
  condition: AdvancedCondition
  removable: boolean
  onFieldChange: (field: AdvancedField) => void
  onPredicateChange: (predicate: Predicate) => void
  onValueChange: (value: string) => void
  onRangeChange: (range: { from?: string; to?: string }) => void
  onRemove: () => void
}

// Facet bucket shape read from the scope's aggregation (organism carries a label).
type Bucket = { value: string; count: number; label?: string }

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
  const scopeDb = useScopeDb()
  const facetData = useScopeFacetData()
  const dateField = isDateField(condition.field)
  const negated = condition.combinator === "NOT"
  // Offer the active scope's fields, but always keep the row's current field
  // selectable even when a scope switch made it out-of-scope (the db-aware sync
  // flags such a stale clause; it is never silently dropped from the dropdown).
  const scopeFields = fieldsForScope(scopeDb)
  const fieldList: readonly AdvancedField[] = scopeFields.includes(condition.field)
    ? scopeFields
    : [...scopeFields, condition.field]
  const fieldOptions: SelectOption[] = fieldList.map((field) => ({
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

  // A field that maps to a facet row in this scope offers its aggregation buckets
  // as value suggestions (an editable combobox, so free entry is still allowed).
  // organism shows the scientific name but commits the taxID it carries.
  const facetRow = rowByDslField(scopeDb).get(condition.field)
  const facetName = facetRow?.kind === "facet" ? facetRow.facetName : undefined
  const isOrganismFacet = facetRow?.organism ?? false
  const facetOptions: ComboboxOption[] = facetName === undefined
    ? []
    : ((facetData?.[facetName] ?? []) as readonly Bucket[]).map((bucket) => ({
      value: bucket.value,
      label: isOrganismFacet && bucket.label !== undefined
        ? `${bucket.label} (${bucket.value})`
        : bucket.value,
      count: bucket.count,
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
        : facetName !== undefined
          ? (
            <Combobox
              size="md"
              ariaLabel={t("search.builder.valuePlaceholder")}
              options={facetOptions}
              value={condition.value}
              onChange={onValueChange}
              placeholder={t("search.builder.valuePlaceholder")}
              emptyLabel={t("search.builder.facetEmpty")}
              width={232}
            />
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
