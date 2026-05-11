import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "news.dismissed"
const STORAGE_EVENT = "news.dismissed.changed"

const readStorage = (): string[] => {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter((x): x is string => typeof x === "string")
  } catch {
    return []
  }
}

const writeStorage = (ids: string[]): void => {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT))
  } catch {
    /* ignore quota / privacy errors */
  }
}

export const useDismissedNotifications = (): {
  hydrated: boolean
  dismissed: ReadonlySet<string>
  dismiss: (id: string) => void
} => {
  const [hydrated, setHydrated] = useState(false)
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    setDismissed(new Set(readStorage()))
    setHydrated(true)
    const handler = (): void => setDismissed(new Set(readStorage()))
    window.addEventListener(STORAGE_EVENT, handler)
    window.addEventListener("storage", handler)

    return () => {
      window.removeEventListener(STORAGE_EVENT, handler)
      window.removeEventListener("storage", handler)
    }
  }, [])

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      writeStorage([...next])

      return next
    })
  }, [])

  return { hydrated, dismissed, dismiss }
}
