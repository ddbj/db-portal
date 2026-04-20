import {
  findField,
  isFieldAvailableForDb,
} from "@/lib/mock-data/advanced-search-fields"
import { ALL_DB_VALUE } from "@/lib/search-url"
import type { AdvancedCondition } from "@/types/search"

import { countDepth, MAX_NEST_DEPTH } from "./dsl"
import type {
  AdvancedConditionNode,
  AdvancedGroupNode,
  AdvancedNodeWithId,
  ValidationError,
  ValidationMode,
} from "./types"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/
const WILDCARD_VALID = /^[A-Za-z0-9_*?-]+$/

const isBetweenValue = (
  v: AdvancedCondition["value"],
): v is { from: string; to: string } =>
  typeof v === "object" && v !== null && !Array.isArray(v)
  && "from" in v && "to" in v

const validateCondition = (
  node: AdvancedConditionNode,
  path: readonly number[],
  mode: ValidationMode,
): ValidationError[] => {
  const errors: ValidationError[] = []
  const { field: fieldId, operator, value } = node.condition
  const field = findField(fieldId)
  if (field === undefined) {
    errors.push({ code: "UNKNOWN_FIELD", path, field: fieldId })

    return errors
  }

  if (!field.availableOps.includes(operator)) {
    errors.push({
      code: "INVALID_OPERATOR_FOR_FIELD",
      path,
      field: fieldId,
      operator,
    })
  }

  const db = mode === "cross" ? ALL_DB_VALUE : mode.db
  if (!isFieldAvailableForDb(fieldId, db)) {
    if (mode === "cross" && field.tier === 3) {
      errors.push({ code: "FIELD_NOT_AVAILABLE_IN_CROSS_DB", path, field: fieldId })
    }
  }

  if (operator === "between") {
    if (!isBetweenValue(value)) {
      errors.push({ code: "MISSING_VALUE", path })

      return errors
    }
    if (value.from === "" || value.to === "") {
      errors.push({ code: "MISSING_VALUE", path })

      return errors
    }
    if (field.type === "date") {
      if (!ISO_DATE.test(value.from)) {
        errors.push({ code: "INVALID_DATE_FORMAT", path, value: value.from })
      }
      if (!ISO_DATE.test(value.to)) {
        errors.push({ code: "INVALID_DATE_FORMAT", path, value: value.to })
      }
    }
    if (field.type === "number") {
      if (!NUMBER_PATTERN.test(value.from)) {
        errors.push({ code: "INVALID_NUMBER", path, value: value.from })
      }
      if (!NUMBER_PATTERN.test(value.to)) {
        errors.push({ code: "INVALID_NUMBER", path, value: value.to })
      }
    }

    return errors
  }

  const stringValue = typeof value === "string"
    ? value
    : isBetweenValue(value)
      ? value.from
      : Array.isArray(value) ? value.join(" ") : ""

  if (stringValue === "") {
    errors.push({ code: "MISSING_VALUE", path })

    return errors
  }

  if (operator === "gte" || operator === "lte") {
    if (field.type === "date" && !ISO_DATE.test(stringValue)) {
      errors.push({ code: "INVALID_DATE_FORMAT", path, value: stringValue })
    }
    if (field.type === "number" && !NUMBER_PATTERN.test(stringValue)) {
      errors.push({ code: "INVALID_NUMBER", path, value: stringValue })
    }
  }

  if (operator === "equals" || operator === "not_equals") {
    if (field.type === "date" && !ISO_DATE.test(stringValue)) {
      errors.push({ code: "INVALID_DATE_FORMAT", path, value: stringValue })
    }
    if (field.type === "number" && !NUMBER_PATTERN.test(stringValue)) {
      errors.push({ code: "INVALID_NUMBER", path, value: stringValue })
    }
  }

  if (operator === "wildcard") {
    if (!WILDCARD_VALID.test(stringValue)) {
      errors.push({ code: "WILDCARD_VALUE_CONTAINS_QUOTE", path, value: stringValue })
    }
  }

  return errors
}

const validateGroup = (
  node: AdvancedGroupNode,
  path: readonly number[],
  mode: ValidationMode,
): ValidationError[] => {
  const errors: ValidationError[] = []
  if (node.logic === "NOT" && node.children.length > 1) {
    errors.push({ code: "NOT_REQUIRES_SINGLE_CHILD", path })
  }
  node.children.forEach((child, i) => {
    errors.push(...validateNode(child, mode, [...path, i]))
  })

  return errors
}

export const validateNode = (
  node: AdvancedNodeWithId,
  mode: ValidationMode,
  path: readonly number[] = [],
): ValidationError[] => {
  if (node.kind === "condition") {
    return validateCondition(node, path, mode)
  }

  const errors = validateGroup(node, path, mode)
  if (path.length === 0 && countDepth(node) > MAX_NEST_DEPTH) {
    errors.unshift({ code: "NEST_DEPTH_EXCEEDED", path })
  }

  return errors
}
