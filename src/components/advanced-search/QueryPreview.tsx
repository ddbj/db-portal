import { Check, Copy } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button, Callout, Heading } from "@/components/ui"
import type { ValidationError } from "@/lib/advanced-search/types"

interface QueryPreviewProps {
  dsl: string
  initialAdv: string | null
  errors: readonly ValidationError[]
}

const QueryPreview = ({ dsl, initialAdv, errors }: QueryPreviewProps) => {
  const { t: tStrict } = useTranslation()
  const t = tStrict as unknown as (key: string) => string
  const [copied, setCopied] = useState(false)

  const displayText = dsl !== "" ? dsl : (initialAdv ?? "")
  const showUrlOnly = dsl === "" && initialAdv !== null && initialAdv !== ""

  const handleCopy = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return
    if (displayText === "") return
    void navigator.clipboard.writeText(displayText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Heading level={2}>{t("routes.advancedSearch.preview.heading")}</Heading>
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
                {t("routes.advancedSearch.preview.copied")}
              </>
            )
            : (
              <>
                <Copy className="mr-1 h-4 w-4" />
                {t("routes.advancedSearch.preview.copy")}
              </>
            )}
        </Button>
      </div>
      <div className="rounded-md border border-gray-200 bg-gray-50 p-3 font-mono text-sm text-gray-800">
        {displayText === ""
          ? (
            <span className="font-sans text-gray-400">
              {t("routes.advancedSearch.preview.empty")}
            </span>
          )
          : <code className="break-all select-text">{displayText}</code>}
      </div>
      {showUrlOnly && (
        <p className="text-xs text-gray-500">
          {t("routes.advancedSearch.preview.urlOnly")}
        </p>
      )}
      {errors.length > 0 && (
        <Callout type="error">
          <ul className="ml-4 list-disc space-y-0.5 text-xs">
            {errors.map((e, i) => (
              <li key={i}>
                {t(`routes.advancedSearch.validation.${e.code}`)}
              </li>
            ))}
          </ul>
        </Callout>
      )}
    </section>
  )
}

export default QueryPreview
