import { useT } from "~/lib/i18n"
import { Button, Tag } from "~/ui"

import type { SyncStatus } from "./types"

export type SyncStatusChipProps = {
  status: SyncStatus
  onRetry: () => void
}

export const SyncStatusChip = ({ status, onRetry }: SyncStatusChipProps) => {
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
    <span className="inline-flex items-center gap-2">
      <Tag kind="status" tone="warning" size="sm">
        {t("search.sync.failed")}
      </Tag>
      <Button kind="link" onClick={onRetry}>
        {t("search.sync.retry")}
      </Button>
    </span>
  )
}
