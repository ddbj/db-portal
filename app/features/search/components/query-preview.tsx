import { useState } from "react"

import { useT } from "~/lib/i18n"
import { Button, Label } from "~/ui"

export type QueryPreviewProps = {
  dsl: string
  onClear?: () => void
  onEdit?: () => void
}

export const QueryPreview = ({ dsl, onClear, onEdit }: QueryPreviewProps) => {
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
    <div className="rounded-card border border-border-soft bg-surface-subtle px-3 py-2 flex items-center gap-3">
      <Label>{t("search.preview.label")}</Label>
      <code
        className="min-w-0 flex-1 font-mono text-fs-body text-ink whitespace-pre-wrap break-all"
        aria-label={t("search.a11y.queryPreview")}
      >
        {dsl || ""}
      </code>
      <span className="shrink-0 inline-flex items-center gap-2">
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
          {copied ? t("search.preview.copied") : t("search.preview.copy")}
        </Button>
      </span>
    </div>
  )
}
