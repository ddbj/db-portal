import { Check, Copy, Pencil, X } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"

import { Button, Callout, Heading } from "@/components/ui"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import type { ValidationError } from "@/lib/advanced-search/types"

type CompactVariant = "bar" | "textarea"

interface QueryPreviewProps {
  dsl: string
  initialQ: string | null
  errors: readonly ValidationError[]
  compact?: boolean
  compactVariant?: CompactVariant
  editHref?: string
  onClear?: () => void
}

const QueryPreview = (
  {
    dsl,
    initialQ,
    errors,
    compact = false,
    compactVariant = "bar",
    editHref,
    onClear,
  }: QueryPreviewProps,
) => {
  const { t } = useDynamicTranslation()
  const [copied, setCopied] = useState(false)

  const displayText = dsl !== "" ? dsl : (initialQ ?? "")
  const showUrlOnly = dsl === "" && initialQ !== null && initialQ !== ""

  const handleCopy = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return
    if (displayText === "") return
    void navigator.clipboard.writeText(displayText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const copyButton = (
    <Button
      variant="tertiary"
      size="sm"
      onClick={handleCopy}
      disabled={displayText === ""}
      className="shrink-0"
    >
      {copied
        ? (
          <>
            <Check className="mr-1 h-4 w-4" />
            {t("routes.search.preview.copied")}
          </>
        )
        : (
          <>
            <Copy className="mr-1 h-4 w-4" />
            {t("routes.search.preview.copy")}
          </>
        )}
    </Button>
  )

  const editLink = editHref !== undefined && (
    <Link
      to={editHref}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs leading-none font-medium text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 focus:outline-none"
    >
      <Pencil className="h-3 w-3" aria-hidden="true" />
      {t("routes.searchResults.summary.editInAdvanced")}
    </Link>
  )

  const clearButton = onClear !== undefined && (
    <Button
      variant="tertiary"
      size="sm"
      onClick={onClear}
      aria-label={t("routes.searchResults.summary.clearAria")}
      disabled={displayText === ""}
      className="inline-flex shrink-0 items-center gap-1"
    >
      <X className="h-3 w-3" aria-hidden="true" />
      {t("routes.searchResults.summary.clear")}
    </Button>
  )

  if (compact && compactVariant === "textarea") {
    return (
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium tracking-wide text-gray-500 uppercase">
            {t("routes.search.preview.heading")}
          </span>
          <textarea
            value={displayText}
            readOnly
            spellCheck={false}
            rows={8}
            placeholder={t("routes.search.preview.empty")}
            aria-label={t("routes.search.preview.heading")}
            className="focus:border-primary-500 focus:ring-primary-200 w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm break-all whitespace-pre-wrap text-gray-800 focus:ring-2 focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {editLink}
          {clearButton}
          {copyButton}
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
        <span className="shrink-0 text-[11px] font-medium tracking-wide text-gray-500 uppercase">
          {t("routes.search.preview.heading")}
        </span>
        <code className="min-w-0 flex-1 truncate font-mono text-gray-800 select-text">
          {displayText === ""
            ? (
              <span className="font-sans text-gray-400">
                {t("routes.search.preview.empty")}
              </span>
            )
            : displayText}
        </code>
        {editLink}
        {clearButton}
        {copyButton}
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Heading level={2}>{t("routes.search.preview.heading")}</Heading>
        <Button
          variant="tertiary"
          size="sm"
          onClick={handleCopy}
          disabled={displayText === ""}
        >
          {copied
            ? (
              <>
                <Check className="mr-1 h-4 w-4" />
                {t("routes.search.preview.copied")}
              </>
            )
            : (
              <>
                <Copy className="mr-1 h-4 w-4" />
                {t("routes.search.preview.copy")}
              </>
            )}
        </Button>
      </div>
      <div className="rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-sm text-gray-800">
        {displayText === ""
          ? (
            <span className="font-sans text-gray-400">
              {t("routes.search.preview.empty")}
            </span>
          )
          : <code className="break-all select-text">{displayText}</code>}
      </div>
      {showUrlOnly && (
        <p className="text-xs text-gray-500">
          {t("routes.search.preview.urlOnly")}
        </p>
      )}
      {errors.length > 0 && (
        <Callout type="error">
          <ul className="ml-4 list-disc space-y-0.5 text-xs">
            {errors.map((e, i) => (
              <li key={i}>
                {t(`routes.search.validation.${e.code}`)}
              </li>
            ))}
          </ul>
        </Callout>
      )}
    </section>
  )
}

export default QueryPreview
