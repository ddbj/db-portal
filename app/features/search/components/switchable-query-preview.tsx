import { useState } from "react"

import type { ParseNode } from "~/lib/api"
import { useT } from "~/lib/i18n"
import { Button, Label, Segmented } from "~/ui"

import { ProposalConditions } from "../assistant"
import { isIdentityAst } from "../ast"

export type SwitchableQueryPreviewProps = {
  dsl: string
  ast: ParseNode | null
  onClear?: () => void
  onEdit?: () => void
}

type View = "dsl" | "graph"

// The results-page query preview. It mirrors the committed query in two
// interchangeable views: the raw DSL string (default) and the same read-only
// builder graph the AI proposal uses (ProposalConditions). The DSL is the SSOT;
// the graph is a visual rendering of `ast`.
export const SwitchableQueryPreview = (
  { dsl, ast, onClear, onEdit }: SwitchableQueryPreviewProps,
) => {
  const t = useT()
  const [view, setView] = useState<View>("dsl")
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

  const showGraph = view === "graph" && ast !== null && !isIdentityAst(ast)

  return (
    <div className="rounded-card border border-border-soft bg-surface-subtle px-3 py-2.5 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Label>{t("search.preview.label")}</Label>
        <Segmented
          ariaLabel={t("search.preview.viewGroupLabel")}
          options={[
            { value: "dsl", label: t("search.preview.viewDsl") },
            { value: "graph", label: t("search.preview.viewGraph") },
          ]}
          value={view}
          onChange={(next) => setView(next as View)}
        />
        <span className="ml-auto shrink-0 inline-flex items-center gap-2">
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
      {showGraph
        ? <ProposalConditions node={ast} />
        : (
          <code
            className="min-w-0 font-mono text-fs-body text-ink whitespace-pre-wrap break-all"
            aria-label={t("search.a11y.queryPreview")}
          >
            {dsl || ""}
          </code>
        )}
    </div>
  )
}
