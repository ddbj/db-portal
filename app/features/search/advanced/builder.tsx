import type { Dispatch } from "react"
import { Fragment, useState } from "react"

import { useT } from "~/lib/i18n"
import {
  Button,
  CloseIcon,
  IconButton,
  Label,
  Select,
  type SelectOption,
  Tag,
  TextInput,
} from "~/ui"

import { ConditionRow, ExcludeToggle } from "./condition-row"
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
  // not yank the caret out from under the user; the trimmed predicate still
  // drives the leading "かつ" connector and the empty placeholder.
  const keywordRowVisible = keywordWired && (hasFreeText || keywordFocused)

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
      {root.children.length >= 2 && (
        <div className="flex items-center gap-2">
          <Label>{t("search.builder.matchLabel")}</Label>
          <MatchSelector
            value={root.innerCombinator}
            onChange={(innerCombinator) =>
              dispatch({ type: "updateInnerCombinator", id: root.id, innerCombinator })}
          />
        </div>
      )}
      <GroupChildren
        group={root}
        depth={0}
        dispatch={dispatch}
        leadWithAnd={keywordRowVisible}
      />
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
    <div className="flex flex-wrap items-center gap-2 rounded-button bg-brand-soft/40 px-2.5 py-2">
      <Tag kind="brand" mono size="sm">{t("search.builder.freeText.field")}</Tag>
      <span className="text-fs-body-sm text-ink-mid">{t("search.builder.freeText.allFields")}</span>
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

type MatchSelectorProps = {
  value: AdvancedInnerCombinator
  onChange: (value: AdvancedInnerCombinator) => void
}

// A single AND/OR control per group/root: "すべての条件に一致" (AND) or
// "いずれかの条件に一致" (OR). It drives the group's innerCombinator, which is
// what actually joins the conditions in the AST.
const MatchSelector = ({ value, onChange }: MatchSelectorProps) => {
  const t = useT()
  const options: SelectOption[] = [
    { value: "AND", label: t("search.builder.match.all") },
    { value: "OR", label: t("search.builder.match.any") },
  ]

  return (
    <Select
      size="md"
      ariaLabel={t("search.a11y.builderConditions")}
      options={options}
      value={value}
      onChange={(next) => onChange(next as AdvancedInnerCombinator)}
      width={200}
    />
  )
}

type ConnectorLineProps = {
  index: number
  leadWithAnd: boolean
  innerCombinator: AdvancedInnerCombinator
}

// The read-only word shown between rows so the chosen AND/OR is visible inline.
// The first row's connector is the keyword anchor ("かつ") when a keyword row is
// present, and nothing otherwise.
const ConnectorLine = ({ index, leadWithAnd, innerCombinator }: ConnectorLineProps) => {
  const t = useT()
  let word: string | null = null
  if (index === 0) {
    word = leadWithAnd ? t("search.builder.connector.and") : null
  } else {
    word = innerCombinator === "OR"
      ? t("search.builder.connector.or")
      : t("search.builder.connector.and")
  }
  if (word === null) return null

  return <div className="text-fs-label text-ink-soft font-medium pl-0.5">{word}</div>
}

type GroupChildrenProps = {
  group: AdvancedGroup
  depth: number
  dispatch: Dispatch<AdvancedAction>
  leadWithAnd?: boolean
}

const GroupChildren = ({ group, depth, dispatch, leadWithAnd = false }: GroupChildrenProps) => (
  <div className="flex flex-col gap-2">
    {group.children.map((child, index) => (
      <Fragment key={child.id}>
        <ConnectorLine index={index} leadWithAnd={leadWithAnd} innerCombinator={group.innerCombinator} />
        <NodeRow
          node={child}
          index={index}
          depth={depth}
          dispatch={dispatch}
          leadWithAnd={leadWithAnd}
        />
      </Fragment>
    ))}
  </div>
)

type NodeRowProps = {
  node: AdvancedNode
  index: number
  depth: number
  dispatch: Dispatch<AdvancedAction>
  leadWithAnd: boolean
}

const NodeRow = ({ node, index, depth, dispatch, leadWithAnd }: NodeRowProps) => {
  // The root's first child is pinned to AND by the reducer, so it cannot be
  // negated; every other row can. The root's first structured condition stays
  // removable only when a keyword row anchors the query.
  const canExclude = !(depth === 0 && index === 0)
  const removable = depth > 0 || index > 0 || leadWithAnd

  if (node.kind === "condition") {
    return (
      <ConditionRow
        condition={node}
        excluded={node.combinator === "NOT"}
        canExclude={canExclude}
        removable={removable}
        onFieldChange={(field) => dispatch({ type: "updateField", id: node.id, field })}
        onOpChange={(op) => dispatch({ type: "updateOp", id: node.id, op })}
        onValueChange={(value) => dispatch({ type: "updateValue", id: node.id, value })}
        onRangeChange={(range) => dispatch({ type: "updateRange", id: node.id, ...range })}
        onToggleExclude={() =>
          dispatch({
            type: "updateCombinator",
            id: node.id,
            combinator: node.combinator === "NOT" ? "AND" : "NOT",
          })}
        onRemove={() => dispatch({ type: "removeNode", id: node.id })}
      />
    )
  }

  return (
    <GroupBlock
      group={node}
      canExclude={canExclude}
      depth={depth}
      dispatch={dispatch}
    />
  )
}

type GroupBlockProps = {
  group: AdvancedGroup
  canExclude: boolean
  depth: number
  dispatch: Dispatch<AdvancedAction>
}

const GroupBlock = ({ group, canExclude, depth, dispatch }: GroupBlockProps) => {
  const t = useT()

  return (
    <div className="rounded-button border border-border-soft border-l-4 border-l-brand bg-surface-subtle/40 p-2.5 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Tag kind="brand" mono size="sm">{t("search.builder.group")}</Tag>
        <MatchSelector
          value={group.innerCombinator}
          onChange={(innerCombinator) =>
            dispatch({ type: "updateInnerCombinator", id: group.id, innerCombinator })}
        />
        <span className="ml-auto flex items-center gap-1.5">
          <ExcludeToggle
            excluded={group.combinator === "NOT"}
            disabled={!canExclude}
            onToggle={() =>
              dispatch({
                type: "updateCombinator",
                id: group.id,
                combinator: group.combinator === "NOT" ? "AND" : "NOT",
              })}
          />
          <Button
            kind="secondary"
            size="sm"
            onClick={() => dispatch({ type: "removeNode", id: group.id })}
          >
            {t("search.builder.removeGroup")}
          </Button>
        </span>
      </div>
      <GroupChildren group={group} depth={depth + 1} dispatch={dispatch} />
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
