import { useState } from "react"

import { useT } from "~/lib/i18n"
import { Button, StableLabel } from "~/ui"

export type BuilderSummaryPanelProps = {
  dsl: string
  onClear?: () => void
  onEdit?: () => void
}

export const BuilderSummaryPanel = ({ dsl, onClear, onEdit }: BuilderSummaryPanelProps) => {
  const t = useT()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(dsl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard 拒否時は何もしない (HTTPS 経由でのみ動作する想定)
    }
  }

  return (
    <div className="rounded-card border border-border-soft bg-surface flex flex-col">
      <code
        className="font-mono text-fs-body-sm text-ink m-0 px-3 py-3 break-words whitespace-pre-wrap min-h-14"
        aria-label={t("search.a11y.queryPreview")}
      >
        {dsl || ""}
      </code>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border-soft bg-surface-subtle px-3 py-2">
        {onEdit && (
          <Button kind="secondary" size="sm" onClick={onEdit}>
            {t("search.preview.edit")}
          </Button>
        )}
        {onClear && (
          <Button kind="secondary" size="sm" onClick={onClear}>
            {t("search.preview.clear")}
          </Button>
        )}
        <Button kind="secondary" size="sm" onClick={handleCopy} disabled={!dsl}>
          <StableLabel reserve={[t("search.preview.copy"), t("search.preview.copied")]}>
            {copied ? t("search.preview.copied") : t("search.preview.copy")}
          </StableLabel>
        </Button>
      </div>
    </div>
  )
}
