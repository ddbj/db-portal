import { useEffect, useState } from "react"

export const useDebouncedValue = <T>(value: T, ms: number): T => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)

    return () => clearTimeout(id)
  }, [value, ms])

  return debounced
}
