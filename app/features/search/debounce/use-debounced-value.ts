import { useEffect, useState } from "react"

// Idle delay before a builder edit on /search is serialized into the URL.
export const DEBOUNCE_MS = 700

export const useDebouncedValue = <T>(value: T, ms: number): T => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)

    return () => clearTimeout(id)
  }, [value, ms])

  return debounced
}
