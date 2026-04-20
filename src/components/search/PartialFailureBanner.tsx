import { useTranslation } from "react-i18next"

import { Button, Callout } from "@/components/ui"
import type { DbHitCount } from "@/types/db"

export type BannerKind = "all_error" | "partial" | null

export const classifyBanner = (dbs: readonly DbHitCount[]): BannerKind => {
  const total = dbs.length
  if (total === 0) return null
  const errorCount = dbs.filter((d) => d.state === "error").length
  if (errorCount === total) return "all_error"
  if (errorCount >= Math.ceil(total / 2)) return "partial"

  return null
}

export interface PartialFailureBannerProps {
  databases: readonly DbHitCount[]
  onRetryAll: () => void
}

const PartialFailureBanner = ({ databases, onRetryAll }: PartialFailureBannerProps) => {
  const { t } = useTranslation()
  const kind = classifyBanner(databases)

  if (kind === null) return null

  if (kind === "all_error") {
    return (
      <Callout type="error">
        <div className="flex items-center justify-between gap-3">
          <p>{t("routes.search.crossMode.partialFailure.allError")}</p>
          <Button variant="tertiary" size="sm" onClick={onRetryAll}>
            {t("routes.search.crossMode.retryAll")}
          </Button>
        </div>
      </Callout>
    )
  }

  return (
    <Callout type="warning">
      {t("routes.search.crossMode.partialFailure.partial")}
    </Callout>
  )
}

export default PartialFailureBanner
