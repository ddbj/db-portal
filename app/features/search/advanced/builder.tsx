import type { Dispatch } from "react"

import { useT } from "~/lib/i18n"
import { Button, Label, Select, type SelectOption, Tag } from "~/ui"

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
}

export const AdvancedBuilder = ({ state, dispatch }: AdvancedBuilderProps) => {
  const t = useT()
  const root = state.root

  if (root.children.length === 0) {
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
      <GroupChildren
        group={root}
        depth={0}
        dispatch={dispatch}
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

type GroupChildrenProps = {
  group: AdvancedGroup
  depth: number
  dispatch: Dispatch<AdvancedAction>
}

const GroupChildren = ({ group, depth, dispatch }: GroupChildrenProps) => (
  <div className="flex flex-col gap-2">
    {group.children.map((child, index) => (
      <NodeRow
        key={child.id}
        node={child}
        index={index}
        parentId={group.id}
        depth={depth}
        dispatch={dispatch}
      />
    ))}
  </div>
)

type NodeRowProps = {
  node: AdvancedNode
  index: number
  parentId: AdvancedNodeId
  depth: number
  dispatch: Dispatch<AdvancedAction>
}

const NodeRow = ({ node, index, parentId, depth, dispatch }: NodeRowProps) => {
  if (node.kind === "condition") {
    return (
      <ConditionRow
        condition={node}
        combinatorMode={index === 0 ? "where" : "selectable"}
        removable={depth > 0 || index > 0}
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
      index={index}
      parentId={parentId}
      depth={depth}
      dispatch={dispatch}
    />
  )
}

type GroupBlockProps = {
  group: AdvancedGroup
  index: number
  parentId: AdvancedNodeId
  depth: number
  dispatch: Dispatch<AdvancedAction>
}

const GroupBlock = ({ group, index, parentId, depth, dispatch }: GroupBlockProps) => {
  const t = useT()
  const innerOptions: SelectOption[] = (["AND", "OR"] as const).map((value) => ({
    value,
    label: t(`search.builder.combinator.${value.toLowerCase() as "and" | "or"}`),
  }))

  return (
    <div className="border-l-4 border-brand pl-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Tag kind="brand" mono size="sm">{t("search.builder.group")}</Tag>
        {index === 0
          ? <Label>{t("search.builder.where")}</Label>
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
