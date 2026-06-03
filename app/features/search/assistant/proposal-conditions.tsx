import { Fragment, type ReactNode } from "react"

import type { ParseNode } from "~/lib/api"
import { useT } from "~/lib/i18n"
import { cn } from "~/ui"

import { isIdentityAst } from "../ast"
import {
  type AdvancedOp,
  fieldLabelKey,
  isAdvancedField,
  predicateLabelKey,
} from "../types"

type ProposalConditionsProps = {
  node: ParseNode
}

// Render a parsed query (ParseNode AST) as a compact, read-only mirror of the
// query builder. Leaf clauses read as plain-Japanese "項目 述語 値" rows; AND /
// OR / NOT groups nest under a colored spine with a single operator badge. The
// negation of a single value/range leaf folds into the predicate ("と一致しない")
// the way the builder reads a clause; the negation of a group or free-text leaf
// shows a NOT badge instead, since those have no negated predicate form.
export const ProposalConditions = ({ node }: ProposalConditionsProps) => {
  if (isIdentityAst(node)) return null

  return <div className="flex min-w-0 flex-col gap-1.5">{renderNode(node)}</div>
}

const renderNode = (node: ParseNode): ReactNode => {
  switch (node.op) {
    case "free_text":
      return <FreeTextClause value={node.value} isPhrase={node.is_phrase} />
    case "eq":
    case "contains":
    case "wildcard":
      return <ValueClause field={node.field} op={node.op} value={node.value} negated={false} />
    case "between":
      return <RangeClause field={node.field} from={node.from} to={node.to} negated={false} />
    case "NOT": {
      const child = node.rules[0]
      if (child === undefined) return null
      // A negated value/range leaf reads as a single clause with the negated
      // predicate; only groups and free-text fall back to the NOT badge.
      if (child.op === "eq" || child.op === "contains" || child.op === "wildcard") {
        return <ValueClause field={child.field} op={child.op} value={child.value} negated />
      }
      if (child.op === "between") {
        return <RangeClause field={child.field} from={child.from} to={child.to} negated />
      }

      return <GroupBlock op="NOT">{renderNode(child)}</GroupBlock>
    }
    case "AND":
    case "OR": {
      const rules = node.rules
      if (rules.length === 0) return null
      // A one-child group carries no combinator meaning, so it reads as the
      // child alone (mirrors the builder hiding the AND/OR toggle below 2 rows).
      const [first] = rules
      if (rules.length === 1 && first !== undefined) return renderNode(first)

      return (
        <GroupBlock op={node.op}>
          {rules.map((rule, index) => (
            <Fragment key={keyFor(rule, index)}>{renderNode(rule)}</Fragment>
          ))}
        </GroupBlock>
      )
    }
  }
}

const keyFor = (node: ParseNode, index: number): string => {
  switch (node.op) {
    case "free_text":
      return `ft-${index}-${node.value}`
    case "between":
      return `${node.field}-between-${index}`
    case "AND":
    case "OR":
    case "NOT":
      return `${node.op}-${index}`
    default:
      return `${node.field}-${node.op}-${index}`
  }
}

type GroupOp = "AND" | "OR" | "NOT"

const COMBINATOR_KEY: Record<GroupOp, string> = {
  AND: "and",
  OR: "or",
  NOT: "not",
}

const GroupBlock = ({ op, children }: { op: GroupOp; children: ReactNode }) => {
  const t = useT()
  const negated = op === "NOT"

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="inline-flex items-baseline gap-1.5">
        <span
          className={cn(
            "inline-flex items-center rounded-tag px-1.5 py-px font-mono text-fs-micro font-bold tracking-tag",
            negated ? "bg-red/10 text-red" : "bg-brand-soft text-brand-deep",
          )}
        >
          {op}
        </span>
        <span className="text-fs-micro text-ink-soft">
          {t(`search.builder.combinator.${COMBINATOR_KEY[op]}`)}
        </span>
      </span>
      <div
        className={cn(
          "flex min-w-0 flex-col gap-1.5 border-l-2 pl-2.5",
          negated ? "border-red/40" : "border-brand-light/50",
        )}
      >
        {children}
      </div>
    </div>
  )
}

const ClauseRow = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">{children}</div>
)

const FieldChip = ({ field }: { field: string }) => {
  const t = useT()
  const known = isAdvancedField(field)

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-tag bg-brand-soft px-2 py-0.5 text-fs-label font-semibold text-brand-deep",
        !known && "font-mono",
      )}
    >
      {known ? t(`search.builder.field.${fieldLabelKey(field)}`) : field}
    </span>
  )
}

const PredicateText = ({ op, negated }: { op: AdvancedOp; negated: boolean }) => {
  const t = useT()

  return (
    <span className="shrink-0 text-fs-label text-ink-soft">
      {t(`search.builder.predicate.${predicateLabelKey({ op, negated })}`)}
    </span>
  )
}

const ClauseValue = ({ children }: { children: ReactNode }) => (
  <span className="min-w-0 break-words font-mono text-fs-body-sm font-semibold text-ink">
    {children}
  </span>
)

const ValueClause = (
  { field, op, value, negated }: { field: string; op: AdvancedOp; value: string; negated: boolean },
) => (
  <ClauseRow>
    <FieldChip field={field} />
    <PredicateText op={op} negated={negated} />
    <ClauseValue>{value}</ClauseValue>
  </ClauseRow>
)

const RangeClause = (
  { field, from, to, negated }: { field: string; from: string; to: string; negated: boolean },
) => (
  <ClauseRow>
    <FieldChip field={field} />
    <PredicateText op="between" negated={negated} />
    <ClauseValue>{`${from} 〜 ${to}`}</ClauseValue>
  </ClauseRow>
)

const FreeTextClause = ({ value, isPhrase }: { value: string; isPhrase: boolean }) => {
  const t = useT()

  return (
    <ClauseRow>
      <span className="inline-flex shrink-0 items-center rounded-tag bg-brand-tint px-2 py-px font-mono text-fs-micro font-bold tracking-tag text-brand-deep">
        {t("search.builder.freeText.field")}
      </span>
      <ClauseValue>{isPhrase ? `"${value}"` : value}</ClauseValue>
      {isPhrase && (
        <span className="shrink-0 text-fs-micro text-ink-soft">
          {t("search.builder.freeText.phrase")}
        </span>
      )}
    </ClauseRow>
  )
}
