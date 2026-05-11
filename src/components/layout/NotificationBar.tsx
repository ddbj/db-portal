import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { useDismissedNotifications } from "@/components/news/useDismissedNotifications"
import cn from "@/components/ui/cn"
import type { MirroredNewsItem } from "@/server/news-mirror"

interface NotificationBarProps {
  notifications: readonly MirroredNewsItem[]
}

const formatDate = (iso: string, lang: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")

  return lang === "ja" ? `${y}/${m}/${day}` : `${y}-${m}-${day}`
}

const NotificationBar = ({ notifications }: NotificationBarProps) => {
  const { t, i18n } = useTranslation()
  const { hydrated, dismissed, dismiss } = useDismissedNotifications()

  const visible = hydrated
    ? notifications.filter((n) => !dismissed.has(n.id))
    : notifications

  if (visible.length === 0) return null

  return (
    <aside
      role="region"
      aria-label={t("notifications.regionLabel")}
      className="mx-auto mt-4 w-full max-w-5xl px-4"
    >
      <ul className="flex flex-col gap-2">
        {visible.map((item) => (
          <li
            key={item.id}
            role="status"
            className={cn(
              "flex items-center gap-4 rounded-md border border-primary-200 bg-primary-50 px-4 py-1.5 shadow-sm",
              "text-sm",
            )}
          >
            <span className="shrink-0 text-xs font-medium text-primary-700 tabular-nums">
              {formatDate(item.date, i18n.language)}
            </span>
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 truncate text-primary-900 hover:underline"
            >
              {item.title}
            </a>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label={t("notifications.dismiss")}
              className="shrink-0 rounded p-1 text-primary-700 hover:bg-primary-100"
            >
              <X className="h-3.5 w-3.5" aria-hidden={true} />
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export default NotificationBar
