export type FieldOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "starts_with"
  | "wildcard"
  | "between"
  | "gte"
  | "lte"

export type LogicOperator = "AND" | "OR" | "NOT"

export type AdvancedFieldType =
  | "identifier"
  | "text"
  | "organism"
  | "date"
  | "number"
  | "enum"

export interface AdvancedCondition {
  field: string
  operator: FieldOperator
  value: string | { from: string; to: string } | string[]
}

export type AdvancedNode =
  | { kind: "condition"; condition: AdvancedCondition }
  | { kind: "group"; logic: LogicOperator; children: AdvancedNode[] }
