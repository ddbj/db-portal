import type { Dispatch } from "react"
import { useState } from "react"

import { useT } from "~/lib/i18n"
import { Button, CloseIcon, cn, IconButton, InfoHint, Label, Segmented, Tag, TextInput } from "~/ui"

import type { Predicate } from "../types"
import { ConditionRow } from "./condition-row"
import type {
  AdvancedAction,
  AdvancedGroup,
  AdvancedInnerCombinator,
  AdvancedNode,
  AdvancedState,
} from "./reducer"

type AdvancedBuilderProps = {
  state: AdvancedState
  dispatch: Dispatch<AdvancedAction>
  freeText?: string
  onFreeTextChange?: (value: string) => void
  onFreeTextRemove?: () => void
}

export const AdvancedBuilder = ({
  state,
  dispatch,
  freeText = "",
  onFreeTextChange,
  onFreeTextRemove,
}: AdvancedBuilderProps) => {
  const t = useT()
  const [keywordFocused, setKeywordFocused] = useState(false)
  const root = state.root
  const keywordWired = onFreeTextChange !== undefined && onFreeTextRemove !== undefined
  const hasFreeText = freeText.trim().length > 0
  // Keep the row mounted while its input has focus so deleting to empty does
  // not yank the caret out from under the user.
  const keywordRowVisible = keywordWired && (hasFreeText || keywordFocused)
  const showCombinator = root.children.length >= 2

  if (root.children.length === 0 && !keywordRowVisible) {
    return (
      <div className="rounded-card border border-border-soft p-6 flex flex-col items-center gap-3 bg-surface">
        <Label>{t("search.builder.empty.label")}</Label>
        <p className="text-fs-body-sm text-ink-mid m-0 text-center max-w-md">
          {t("search.builder.empty.description")}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Button kind="primary" onClick={() => dispatch({ type: "addCondition", parentId: root.id })}>
            {t("search.builder.addCondition")}
          </Button>
          <Button kind="secondary" onClick={() => dispatch({ type: "addGroup", parentId: root.id })}>
            {t("search.builder.addGroup")}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-card border border-border-soft p-4 flex flex-col gap-3 bg-surface">
      {keywordRowVisible && onFreeTextChange !== undefined && onFreeTextRemove !== undefined && (
        <FreeTextRow
          value={freeText}
          onChange={onFreeTextChange}
          onRemove={onFreeTextRemove}
          onFocusChange={setKeywordFocused}
        />
      )}
      {showCombinator && (
        <div className="flex items-center gap-2">
          <Label>{t("search.builder.matchLabel")}</Label>
          <Segmented
            options={AND_OR_OPTIONS}
            value={root.innerCombinator}
            ariaLabel={t("search.a11y.builderConditions")}
            onChange={(next) =>
              dispatch({
                type: "updateInnerCombinator",
                id: root.id,
                innerCombinator: next as AdvancedInnerCombinator,
              })}
          />
        </div>
      )}
      <GroupChildren group={root} depth={0} dispatch={dispatch} branchGuide={showCombinator} />
      <div className="flex justify-end gap-2 mt-2">
        <Button kind="secondary" onClick={() => dispatch({ type: "addCondition", parentId: root.id })}>
          {t("search.builder.addCondition")}
        </Button>
        <Button kind="secondary" onClick={() => dispatch({ type: "addGroup", parentId: root.id })}>
          {t("search.builder.addGroup")}
        </Button>
      </div>
    </div>
  )
}

type FreeTextRowProps = {
  value: string
  onChange: (value: string) => void
  onRemove: () => void
  onFocusChange: (focused: boolean) => void
}

const FreeTextRow = ({ value, onChange, onRemove, onFocusChange }: FreeTextRowProps) => {
  const t = useT()

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-button bg-brand-soft px-2.5 py-2">
      <span className="inline-flex items-center rounded-tag font-mono font-bold tracking-tag whitespace-nowrap leading-snug px-2 py-px text-fs-micro bg-brand-tint text-brand-deep">
        {t("search.builder.freeText.field")}
      </span>
      <span className="flex items-center gap-1 text-fs-body-sm text-ink-mid">
        {t("search.builder.freeText.scopeLabel")}
        <InfoHint
          label={t("search.builder.freeText.scopeTooltip")}
          ariaLabel={t("search.builder.freeText.scopeLabel")}
        />
      </span>
      <TextInput
        size="md"
        ariaLabel={t("search.builder.freeText.field")}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        onFocus={() => onFocusChange(true)}
        onBlur={() => onFocusChange(false)}
        placeholder={t("search.builder.freeText.placeholder")}
        width={232}
      />
      <span className="ml-auto">
        <IconButton ariaLabel={t("search.builder.freeText.remove")} onClick={onRemove}>
          <CloseIcon size={14} />
        </IconButton>
      </span>
    </div>
  )
}

// One AND/OR control per group/root ("1 group = 1 combinator"). Mixing AND and OR
// is expressed by nesting a group, so a single segmented toggle drives the whole
// group's innerCombinator — no per-row connector words.
const AND_OR_OPTIONS = [
  { value: "AND", label: "AND" },
  { value: "OR", label: "OR" },
] as const

type GroupChildrenProps = {
  group: AdvancedGroup
  depth: number
  dispatch: Dispatch<AdvancedAction>
  branchGuide: boolean
}

const GroupChildren = ({ group, depth, dispatch, branchGuide }: GroupChildrenProps) => (
  <div
    className={cn(
      "flex flex-col gap-2",
      branchGuide && "border-l-2 border-brand-light/40 pl-3",
    )}
  >
    {group.children.map((child) => (
      <NodeRow key={child.id} node={child} depth={depth} dispatch={dispatch} />
    ))}
  </div>
)

type NodeRowProps = {
  node: AdvancedNode
  depth: number
  dispatch: Dispatch<AdvancedAction>
}

const NodeRow = ({ node, depth, dispatch }: NodeRowProps) => {
  if (node.kind === "condition") {
    return (
      <ConditionRow
        condition={node}
        removable
        onFieldChange={(field) => dispatch({ type: "updateField", id: node.id, field })}
        onPredicateChange={(predicate: Predicate) => {
          dispatch({ type: "updateOp", id: node.id, op: predicate.op })
          dispatch({
            type: "updateCombinator",
            id: node.id,
            combinator: predicate.negated ? "NOT" : "AND",
          })
        }}
        onValueChange={(value) => dispatch({ type: "updateValue", id: node.id, value })}
        onRangeChange={(range) => dispatch({ type: "updateRange", id: node.id, ...range })}
        onRemove={() => dispatch({ type: "removeNode", id: node.id })}
      />
    )
  }

  return <GroupBlock group={node} depth={depth} dispatch={dispatch} />
}

type GroupBlockProps = {
  group: AdvancedGroup
  depth: number
  dispatch: Dispatch<AdvancedAction>
}

const GroupBlock = ({ group, depth, dispatch }: GroupBlockProps) => {
  const t = useT()
  const negated = group.combinator === "NOT"

  return (
    <div
      className={cn(
        "rounded-button border border-l-4 p-2.5 flex flex-col gap-2",
        negated
          ? "border-l-red border-red/30 bg-red/5"
          : "border-l-brand border-border-soft bg-surface-subtle/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Tag kind="brand" mono size="sm">{t("search.builder.group")}</Tag>
        {group.children.length >= 2 && (
          <Segmented
            options={AND_OR_OPTIONS}
            value={group.innerCombinator}
            ariaLabel={t("search.a11y.builderConditions")}
            onChange={(next) =>
              dispatch({
                type: "updateInnerCombinator",
                id: group.id,
                innerCombinator: next as AdvancedInnerCombinator,
              })}
          />
        )}
        <span className="ml-auto flex items-center gap-1.5">
          <Button
            kind={negated ? "danger" : "secondary"}
            size="sm"
            aria-pressed={negated}
            aria-label={t("search.builder.negateGroup")}
            onClick={() =>
              dispatch({
                type: "updateCombinator",
                id: group.id,
                combinator: negated ? "AND" : "NOT",
              })}
          >
            NOT
          </Button>
          <Button
            kind="secondary"
            size="sm"
            onClick={() => dispatch({ type: "removeNode", id: group.id })}
          >
            {t("search.builder.removeGroup")}
          </Button>
        </span>
      </div>
      <GroupChildren group={group} depth={depth + 1} dispatch={dispatch} branchGuide={false} />
      <div className="flex justify-end gap-2">
        <Button
          kind="secondary"
          size="sm"
          onClick={() => dispatch({ type: "addCondition", parentId: group.id })}
        >
          {t("search.builder.addCondition")}
        </Button>
        <Button
          kind="secondary"
          size="sm"
          onClick={() => dispatch({ type: "addGroup", parentId: group.id })}
        >
          {t("search.builder.addGroup")}
        </Button>
      </div>
    </div>
  )
}
