import { useT } from "~/lib/i18n"
import { Tag } from "~/ui"

import type { SyncStatus } from "./types"

export type SyncStatusChipProps = {
  status: SyncStatus
}

// A status-only pill for the live URL sync. Retry lives on the query-preview
// warning callout, not here, so the chip carries no action.
export const SyncStatusChip = ({ status }: SyncStatusChipProps) => {
  const t = useT()
  if (status === "idle" || status === "synced") return null
  if (status === "syncing") {
    return (
      <Tag kind="status" tone="info" size="sm">
        {t("search.sync.syncing")}
      </Tag>
    )
  }

  return (
    <Tag kind="status" tone="warning" size="sm">
      {t("search.sync.failed")}
    </Tag>
  )
}
