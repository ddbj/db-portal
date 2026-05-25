import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { fetchNews, type NewsItem, newsItemTitle, newsItemUrl } from "~/lib/api/news"
import { formatDate, useLang, useT } from "~/lib/i18n"
import { CloseIcon, IconButton, Tag, TextLink } from "~/ui"

const STORAGE_KEY = "dbPortal.notificationBar.dismissed"

const readDismissed = (): readonly string[] => {
  if (typeof window === "undefined") return []
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is string => typeof v === "string")
  } catch {
    return []
  }
}

const writeDismissed = (ids: readonly string[]): void => {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // sessionStorage が無効 (private mode 等) の場合は何もしない
  }
}

const isActiveAnnouncement = (n: NewsItem, now: number): boolean => {
  if (n.category !== "announcement") return false
  if (!n.retireTime) return true

  return Date.parse(n.retireTime) > now
}

export const NotificationBar = () => {
  const t = useT()
  const lang = useLang()
  const [dismissed, setDismissed] = useState<readonly string[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setDismissed(readDismissed())
    setHydrated(true)
  }, [])

  const query = useQuery({
    queryKey: ["news"],
    queryFn: () => fetchNews(),
    staleTime: 5 * 60_000,
  })

  if (query.isError || !query.data) return null

  const now = Date.now()
  const announcements = query.data
    .filter((n) => isActiveAnnouncement(n, now))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

  const visible = announcements.find(
    (n) => !hydrated || !dismissed.includes(n.id),
  )
  if (!visible) return null

  const dismiss = (): void => {
    const next = [...dismissed, visible.id]
    setDismissed(next)
    writeDismissed(next)
  }

  const externalUrl = newsItemUrl(visible, lang)

  return (
    <section
      role="region"
      aria-label={t("a11y.notificationBar")}
      data-testid="notification-bar"
      className="bg-surface-subtle border-y border-border-soft"
    >
      <div className="max-w-content-max mx-auto px-page-gutter py-2 flex items-center gap-3 text-fs-body-sm">
        <Tag kind="status" tone="critical" size="sm">
          {t("notificationBar.important")}
        </Tag>
        <span className="font-mono text-ink-soft text-fs-label">
          {formatDate(visible.publishedAt)}
        </span>
        <span className="text-ink font-medium flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
          {newsItemTitle(visible, lang)}
        </span>
        {externalUrl !== undefined && (
          <TextLink href={externalUrl} external>
            {t("common.detail")}
          </TextLink>
        )}
        <IconButton ariaLabel={t("notificationBar.close")} onClick={dismiss}>
          <CloseIcon size={14} />
        </IconButton>
      </div>
    </section>
  )
}
