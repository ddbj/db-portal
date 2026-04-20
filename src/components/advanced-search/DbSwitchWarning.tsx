import { useTranslation } from "react-i18next"

import { Button, Callout } from "@/components/ui"
import { nodeToDsl } from "@/lib/advanced-search"
import { walkTree } from "@/lib/advanced-search/tree"
import type { AdvancedSearchState } from "@/lib/advanced-search/types"
import { DATABASES } from "@/lib/mock-data"
import { ALL_DB_VALUE } from "@/lib/search-url"

interface DbSwitchWarningProps {
  state: AdvancedSearchState
  onConfirm: () => void
  onCancel: () => void
}

const DbSwitchWarning = ({ state, onConfirm, onCancel }: DbSwitchWarningProps) => {
  const { t } = useTranslation()
  if (state.pendingDb === null) return null

  const currentDbDisplay = state.db === ALL_DB_VALUE
    ? t("routes.advancedSearch.db.all")
    : DATABASES.find((d) => d.id === state.db)?.displayName ?? state.db

  const idSet = new Set(state.pendingDb.toRemoveIds)
  const rows: { key: string; dsl: string }[] = []
  for (const entry of walkTree(state.tree)) {
    if (entry.node.kind !== "condition") continue
    if (!idSet.has(entry.node.id)) continue
    const dsl = nodeToDsl(entry.node)
    rows.push({
      key: entry.node.id,
      dsl: dsl === "" ? entry.node.condition.field : dsl,
    })
  }

  return (
    <Callout type="warning">
      <div className="flex flex-col gap-3">
        <p>
          {t("routes.advancedSearch.dbSwitchWarning.heading", {
            currentDb: currentDbDisplay,
          })}
        </p>
        <ul className="ml-4 list-disc space-y-0.5">
          {rows.map((r) => (
            <li key={r.key}>
              <code className="font-mono text-xs">{r.dsl}</code>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onConfirm}>
            {t("routes.advancedSearch.dbSwitchWarning.confirm")}
          </Button>
          <Button variant="tertiary" size="sm" onClick={onCancel}>
            {t("routes.advancedSearch.dbSwitchWarning.cancel")}
          </Button>
        </div>
      </div>
    </Callout>
  )
}

export default DbSwitchWarning
