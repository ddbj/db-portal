import type { Dispatch } from "react"
import { useState } from "react"

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

import type { AdvancedCombinator } from "../types"
import { ConditionRow } from "./condition-row"
import type {
  AdvancedAction,
  AdvancedGroup,
  AdvancedInnerCombinator,
  AdvancedNode,
  AdvancedNodeId,
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
  // drives the AND/WHERE lead label and the empty placeholder.
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
    <div className="flex flex-wrap items-center gap-2 rounded-button bg-brand-soft/40 px-2 py-1.5">
      <div className="min-w-20">
        <Label>{t("search.builder.where")}</Label>
      </div>
      <Tag kind="brand" mono>{t("search.builder.freeText.field")}</Tag>
      <span aria-hidden className="font-mono text-fs-meta text-ink-soft">*</span>
      <span className="sr-only">{t("search.builder.freeText.allFields")}</span>
      <span className="text-fs-body-sm text-ink-soft">{t("search.builder.op.contains")}</span>
      <TextInput
        ariaLabel={t("search.builder.freeText.field")}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        onFocus={() => onFocusChange(true)}
        onBlur={() => onFocusChange(false)}
        placeholder={t("search.builder.freeText.placeholder")}
        width={232}
      />
      <IconButton ariaLabel={t("search.builder.freeText.remove")} onClick={onRemove}>
        <CloseIcon size={14} />
      </IconButton>
    </div>
  )
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
      <NodeRow
        key={child.id}
        node={child}
        index={index}
        parentId={group.id}
        depth={depth}
        dispatch={dispatch}
        leadWithAnd={leadWithAnd}
      />
    ))}
  </div>
)

type LeadMode = "where" | "and"

const leadModeFor = (index: number, leadWithAnd: boolean): LeadMode | null => {
  if (index !== 0) return null

  return leadWithAnd ? "and" : "where"
}

type NodeRowProps = {
  node: AdvancedNode
  index: number
  parentId: AdvancedNodeId
  depth: number
  dispatch: Dispatch<AdvancedAction>
  leadWithAnd: boolean
}

const NodeRow = ({ node, index, parentId, depth, dispatch, leadWithAnd }: NodeRowProps) => {
  const lead = leadModeFor(index, leadWithAnd)
  if (node.kind === "condition") {
    return (
      <ConditionRow
        condition={node}
        combinatorMode={lead ?? "selectable"}
        removable={depth > 0 || index > 0 || lead === "and"}
        onCombinatorChange={(combinator) => handleCombinator(dispatch, node.id, parentId, combinator)}
        onFieldChange={(field) => dispatch({ type: "updateField", id: node.id, field })}
        onOpChange={(op) => dispatch({ type: "updateOp", id: node.id, op })}
        onValueChange={(value) => dispatch({ type: "updateValue", id: node.id, value })}
        onRangeChange={(range) => dispatch({ type: "updateRange", id: node.id, ...range })}
        onRemove={() => dispatch({ type: "removeNode", id: node.id })}
      />
    )
  }

  return (
    <GroupBlock
      group={node}
      lead={lead}
      parentId={parentId}
      depth={depth}
      dispatch={dispatch}
    />
  )
}

type GroupBlockProps = {
  group: AdvancedGroup
  lead: LeadMode | null
  parentId: AdvancedNodeId
  depth: number
  dispatch: Dispatch<AdvancedAction>
}

const GroupBlock = ({ group, lead, parentId, depth, dispatch }: GroupBlockProps) => {
  const t = useT()
  const innerOptions: SelectOption[] = (["AND", "OR"] as const).map((value) => ({
    value,
    label: t(`search.builder.combinator.${value.toLowerCase() as "and" | "or"}`),
  }))

  return (
    <div className="border-l-4 border-brand pl-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Tag kind="brand" mono size="sm">{t("search.builder.group")}</Tag>
        {lead === "where"
          ? <Label>{t("search.builder.where")}</Label>
          : lead === "and"
            ? <Label>{t("search.builder.combinator.and")}</Label>
            : (
              <CombinatorPicker
                combinator={group.combinator}
                onChange={(combinator) => handleCombinator(dispatch, group.id, parentId, combinator)}
              />
            )}
        <Label>{t("search.builder.combinator.and")} / {t("search.builder.combinator.or")}</Label>
        <Select
          ariaLabel={t("search.a11y.builderConditions")}
          options={innerOptions}
          value={group.innerCombinator}
          onChange={(next) =>
            dispatch({
              type: "updateInnerCombinator",
              id: group.id,
              innerCombinator: next as AdvancedInnerCombinator,
            })}
          width={88}
        />
        <span className="ml-auto">
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

type CombinatorPickerProps = {
  combinator: AdvancedCombinator
  onChange: (combinator: AdvancedCombinator) => void
}

const CombinatorPicker = ({ combinator, onChange }: CombinatorPickerProps) => {
  const t = useT()
  const options: SelectOption[] = (["AND", "OR", "NOT"] as const).map((value) => ({
    value,
    label: t(`search.builder.combinator.${value.toLowerCase() as "and" | "or" | "not"}`),
  }))

  return (
    <Select
      ariaLabel={t("search.a11y.builderConditions")}
      options={options}
      value={combinator}
      onChange={(next) => onChange(next as AdvancedCombinator)}
      width={92}
    />
  )
}

const handleCombinator = (
  dispatch: Dispatch<AdvancedAction>,
  id: AdvancedNodeId,
  parentId: AdvancedNodeId,
  combinator: AdvancedCombinator,
): void => {
  dispatch({ type: "updateCombinator", id, combinator })
  if (combinator === "AND" || combinator === "OR") {
    dispatch({ type: "updateInnerCombinator", id: parentId, innerCombinator: combinator })
  }
}
