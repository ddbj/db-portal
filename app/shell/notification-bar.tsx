import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useLocation } from "react-router"

import { fetchNews, NEWS_QUERY_KEY, newsItemTitle, newsItemUrl } from "~/lib/api/news"
import { formatDate, useLang, useT } from "~/lib/i18n"
import { CloseIcon, IconButton, NewsDate, Tag, TextLink } from "~/ui"

const isTopPath = (pathname: string): boolean => pathname === "/"

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

export const NotificationBar = () => {
  const t = useT()
  const lang = useLang()
  const { pathname } = useLocation()
  const [dismissed, setDismissed] = useState<readonly string[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setDismissed(readDismissed())
    setHydrated(true)
  }, [])

  const query = useQuery({
    queryKey: NEWS_QUERY_KEY,
    queryFn: () => fetchNews(),
    staleTime: 5 * 60_000,
  })

  if (!isTopPath(pathname)) return null
  if (query.isError || !query.data) return null

  const visible = query.data
    .filter((n) => n.featured)
    .filter((n) => !hydrated || !dismissed.includes(n.id))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

  if (visible.length === 0) return null

  const dismiss = (id: string): void => {
    setDismissed((prev) => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      writeDismissed(next)
      return next
    })
  }

  return (
    <section
      role="region"
      aria-label={t("a11y.notificationBar")}
      className="px-2 py-2 flex flex-col gap-2"
    >
      {visible.map((item) => {
        const title = newsItemTitle(item, lang)
        const externalUrl = newsItemUrl(item, lang)
        return (
          <article
            key={item.id}
            aria-label={title}
            className="bg-surface-subtle border border-border-soft rounded-button max-w-content-max mx-auto w-full px-4 py-2 flex items-center gap-3 text-fs-body-sm"
          >
            <Tag kind="status" tone="critical" size="sm">
              {t("notificationBar.important")}
            </Tag>
            <NewsDate>{formatDate(item.publishedAt)}</NewsDate>
            <span className="text-ink font-medium flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
              {title}
            </span>
            {externalUrl !== undefined && (
              <TextLink href={externalUrl} external externalSrLabel={t("a11y.externalLink")}>
                {t("common.detail")}
              </TextLink>
            )}
            <IconButton
              ariaLabel={t("notificationBar.close")}
              onClick={() => dismiss(item.id)}
            >
              <CloseIcon size={14} />
            </IconButton>
          </article>
        )
      })}
    </section>
  )
}
