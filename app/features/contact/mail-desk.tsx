import { useCallback, useEffect, useRef, useState } from "react"

import { useT } from "~/lib/i18n"
import { Button, CheckIcon, CopyIcon, MonoCode } from "~/ui"

import { HELPDESK_EMAIL } from "./helpdesk"

const COPIED_RESET_MS = 1500

export const MailDesk = () => {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(resetTimer.current), [])

  const copyAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(HELPDESK_EMAIL)
    } catch {
      // clipboard を持たない / 権限を拒否した環境では、 画面に出しているアドレスを
      // 手で選択してもらう。 フィードバックを出さないことがその合図になる。
      return
    }
    setCopied(true)
    clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS)
  }, [])

  const copyLabel = copied ? t("contact.mail.copied") : t("contact.mail.copy")

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-fs-label text-ink-soft font-semibold">
          {t("contact.mail.addressLabel")}
        </span>
        <MonoCode className="text-fs-h2 text-ink select-all">{HELPDESK_EMAIL}</MonoCode>
        <Button
          kind="secondary"
          size="sm"
          aria-label={copyLabel}
          title={copyLabel}
          onClick={() => {
            void copyAddress()
          }}
        >
          {copied
            ? <CheckIcon size={16} className="text-ok-fg" />
            : <CopyIcon size={16} />}
        </Button>
      </div>
      <span role="status" className="sr-only">
        {copied ? t("contact.mail.copied") : ""}
      </span>
      <p className="text-fs-body-sm text-ink-mid leading-relaxed m-0 mt-4">
        {t("contact.mail.responseNote")}
      </p>
    </div>
  )
}
