import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { fetchNews, type NewsItem } from "~/lib/api/news"
import { useLang, useT } from "~/lib/i18n"
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

const isAnnouncement = (n: NewsItem): boolean => n.category === "announcement"

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}/${m}/${day}`
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

  const announcements = query.data
    .filter(isAnnouncement)
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

  return (
    <div className="bg-surface-subtle border-y border-border-soft">
      <div className="max-w-content-max mx-auto px-page-gutter py-2 flex items-center gap-3 text-fs-body-sm">
        <Tag kind="status" tone="critical" size="sm">
          {t("notificationBar.important")}
        </Tag>
        <span className="font-mono text-ink-soft text-fs-label">
          {formatDate(visible.publishedAt)}
        </span>
        <span className="text-ink font-medium flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
          {visible.title[lang] || visible.title.ja}
        </span>
        {visible.url !== undefined && (
          <TextLink href={visible.url} external>
            {t("common.detail")}
          </TextLink>
        )}
        <IconButton ariaLabel={t("notificationBar.close")} onClick={dismiss}>
          <CloseIcon size={14} />
        </IconButton>
      </div>
    </div>
  )
}
