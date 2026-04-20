import { Plus, Trash2 } from "lucide-react"
import type { Dispatch } from "react"
import { useTranslation } from "react-i18next"

import { Badge, Button, EmptyState, Select, Tooltip } from "@/components/ui"
import { MAX_NEST_DEPTH } from "@/lib/advanced-search"
import type {
  AdvancedGroupNode,
  AdvancedSearchAction,
} from "@/lib/advanced-search/types"
import { getFieldsForDb } from "@/lib/mock-data"
import type { DbSelectValue } from "@/lib/search-url"
import type { LogicOperator } from "@/types/search"

import AdvancedSearchRow from "./AdvancedSearchRow"

interface AdvancedSearchGroupProps {
  group: AdvancedGroupNode
  path: readonly number[]
  depth: number
  db: DbSelectValue
  dispatch: Dispatch<AdvancedSearchAction>
}

const AdvancedSearchGroup = (props: AdvancedSearchGroupProps) => {
  const { group, path, depth, db, dispatch } = props
  const { t: tStrict } = useTranslation()
  const t = tStrict as unknown as (
    key: string,
    opts?: Record<string, unknown>,
  ) => string

  const availableFields = getFieldsForDb(db)
  const canAddGroup = depth + 1 < MAX_NEST_DEPTH
  const isNotGroup = group.logic === "NOT"
  const notLimitHit = isNotGroup && group.children.length >= 1

  const logicOptions = (["AND", "OR", "NOT"] as LogicOperator[]).map((l) => ({
    value: l,
    label: t(`routes.advancedSearch.logic.${l}`),
  }))

  const containerClass = depth === 0
    ? "flex flex-col gap-2"
    : "flex flex-col gap-2 rounded-md border-l-4 border-primary-200 bg-primary-50/30 p-3"

  return (
    <div className={containerClass}>
      {depth > 0 && (
        <div className="flex items-center gap-2">
          <Select
            options={logicOptions}
            value={group.logic}
            onChange={(e) =>
              dispatch({
                type: "SET_GROUP_LOGIC",
                path,
                logic: e.target.value as LogicOperator,
              })}
            selectSize="sm"
            className="w-20"
          />
          <Badge variant="gray" size="sm">
            {t("routes.advancedSearch.builder.depthBadge", {
              current: depth,
              max: MAX_NEST_DEPTH,
            })}
          </Badge>
          {notLimitHit && (
            <span className="text-xs text-gray-500">
              {t("routes.advancedSearch.builder.notGroupLock")}
            </span>
          )}
          <div className="ml-auto">
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => dispatch({ type: "REMOVE_NODE", path })}
              aria-label={t("routes.advancedSearch.builder.removeAria")}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
      {group.children.length === 0 && depth === 0 && (
        <EmptyState
          title={t("routes.advancedSearch.builder.emptyState")}
          description=""
        />
      )}
      {group.children.map((child, idx) => {
        if (child.kind === "condition") {
          const showLogicPrefix = depth === 0 && idx > 0

          return (
            <AdvancedSearchRow
              key={child.id}
              condition={child.condition}
              availableFields={availableFields}
              onChange={(patch) =>
                dispatch({
                  type: "UPDATE_CONDITION",
                  path: [...path, idx],
                  patch,
                })}
              onRemove={() =>
                dispatch({
                  type: "REMOVE_NODE",
                  path: [...path, idx],
                })}
              hasLogicPrefix={showLogicPrefix}
              {...(showLogicPrefix && {
                logic: group.logic,
                onLogicChange: (logic) =>
                  dispatch({ type: "SET_GROUP_LOGIC", path, logic }),
              })}
            />
          )
        }

        return (
          <AdvancedSearchGroup
            key={child.id}
            group={child}
            path={[...path, idx]}
            depth={depth + 1}
            db={db}
            dispatch={dispatch}
          />
        )
      })}
      <div className="flex gap-2">
        <Button
          variant="tertiary"
          size="sm"
          onClick={() => dispatch({ type: "ADD_CONDITION", path })}
          disabled={notLimitHit}
        >
          <Plus className="mr-1 h-3 w-3" />
          {t("routes.advancedSearch.builder.addCondition")}
        </Button>
        {canAddGroup && !notLimitHit && (
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => dispatch({ type: "ADD_GROUP", path })}
          >
            <Plus className="mr-1 h-3 w-3" />
            {t("routes.advancedSearch.builder.addGroup")}
          </Button>
        )}
        {!canAddGroup && (
          <Tooltip
            content={t("routes.advancedSearch.builder.depthLimitTooltip")}
          >
            <Button variant="tertiary" size="sm" disabled>
              <Plus className="mr-1 h-3 w-3" />
              {t("routes.advancedSearch.builder.addGroup")}
            </Button>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

export default AdvancedSearchGroup
