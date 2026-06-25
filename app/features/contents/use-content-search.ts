import { useCallback, useEffect, useRef, useState } from "react"

import { searchContent, type SearchResult } from "~/lib/content/search-index"
import { useLang } from "~/lib/i18n"

const DEBOUNCE_MS = 200

type ContentSearchState = {
  query: string
  setQuery: (q: string) => void
  results: SearchResult[]
}

export const useContentSearch = (): ContentSearchState => {
  const lang = useLang()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(
    (q: string) => {
      const trimmed = q.trim()
      if (trimmed === "") {
        setResults([])

        return
      }
      setResults(searchContent(trimmed, lang))
    },
    [lang],
  )

  useEffect(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(query), DEBOUNCE_MS)

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [query, doSearch])

  return { query, setQuery, results }
}
