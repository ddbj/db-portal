import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { ParseNode } from "~/lib/api"

import { astEquals, isIdentityAst, mergeAstAnd } from "../ast"
import type { DbSlug, SyncStatus } from "../types"
import { parseDslToAst } from "../url/from-url"
import { serializeAstToDsl } from "../url/to-url"
import { DEBOUNCE_MS, useDebouncedValue } from "./use-debounced-value"

type CrossSearchSyncOutcome =
  | { status: "idle"; dsl: "" }
  | { status: "synced"; dsl: string }
  | { status: "failed"; parseError: boolean }

type ResolveCrossSearchOptions = {
  baseUrl?: string
  // Validator scope for the live preview: per-DB admits Tier 3 fields, null
  // (cross) only Tier 1/2. Must match the scope the search will actually run in.
  db?: DbSlug | null
}

// Parse the free-text keyword to an AST, AND-merge it with the structured
// builder AST, then serialize the result to a DSL. The keyword grammar
// (space = AND, quote = phrase, comma = OR) is resolved by /db-portal/parse so
// the portal keeps no client-side grammar. parseError distinguishes a keyword
// the user can fix from a serialize-side failure.
export const resolveCrossSearchSync = async (
  keyword: string,
  advancedAst: ParseNode,
  options: ResolveCrossSearchOptions = {},
): Promise<CrossSearchSyncOutcome> => {
  let freeTextAst: ParseNode
  try {
    freeTextAst = await parseDslToAst(keyword.trim(), options)
  } catch {
    return { status: "failed", parseError: true }
  }
  const merged = mergeAstAnd(freeTextAst, advancedAst)
  if (isIdentityAst(merged)) return { status: "idle", dsl: "" }
  try {
    const dsl = await serializeAstToDsl(merged, options)

    return { status: "synced", dsl }
  } catch {
    return { status: "failed", parseError: false }
  }
}

type CrossSearchSyncResult = {
  status: SyncStatus
  dsl: string
  parseError: boolean
  retry: () => void
}

type SyncInput = { keyword: string; ast: ParseNode; db: DbSlug | null }

const isEmptyInput = (input: SyncInput): boolean =>
  input.keyword.trim() === "" && isIdentityAst(input.ast)

export const useCrossSearchSync = (
  keyword: string,
  advancedAst: ParseNode,
  baseUrl?: string,
  db: DbSlug | null = null,
  onSynced?: (dsl: string) => void,
): CrossSearchSyncResult => {
  const [status, setStatus] = useState<SyncStatus>("idle")
  const [dsl, setDsl] = useState("")
  const [parseError, setParseError] = useState(false)

  const onSyncedRef = useRef(onSynced)
  useEffect(() => {
    onSyncedRef.current = onSynced
  }, [onSynced])

  // A monotonically increasing token discards out-of-order responses when the
  // input changes mid-flight (parse / serialize are not cancelled).
  const tokenRef = useRef(0)
  const lastRef = useRef<SyncInput | null>(null)

  const run = useCallback((input: SyncInput) => {
    const token = tokenRef.current + 1
    tokenRef.current = token
    if (isEmptyInput(input)) {
      setStatus("idle")
      setDsl("")
      setParseError(false)

      return
    }
    setStatus("syncing")
    setParseError(false)
    const options: ResolveCrossSearchOptions = {
      ...(baseUrl === undefined ? {} : { baseUrl }),
      db: input.db,
    }
    void resolveCrossSearchSync(input.keyword, input.ast, options)
      .then((outcome) => {
        if (token !== tokenRef.current) return
        if (outcome.status === "synced") {
          setDsl(outcome.dsl)
          setStatus("synced")
          setParseError(false)
          onSyncedRef.current?.(outcome.dsl)

          return
        }
        if (outcome.status === "failed") {
          setStatus("failed")
          setParseError(outcome.parseError)

          return
        }
        setStatus("idle")
        setDsl("")
        setParseError(false)
      })
      .catch(() => {
        if (token === tokenRef.current) setStatus("failed")
      })
  }, [baseUrl])

  // Memoize the debounce input so unrelated re-renders do not reset the timer
  // (the single 700ms debounce must coalesce, not restart, on every render).
  const input = useMemo<SyncInput>(
    () => ({ keyword, ast: advancedAst, db }),
    [keyword, advancedAst, db],
  )
  const debounced = useDebouncedValue(input, DEBOUNCE_MS)

  useEffect(() => {
    const prev = lastRef.current
    if (
      prev !== null
      && prev.keyword === debounced.keyword
      && prev.db === debounced.db
      && astEquals(prev.ast, debounced.ast)
    ) {
      return
    }
    lastRef.current = debounced
    run(debounced)
  }, [debounced, run])

  const retry = useCallback(() => {
    if (lastRef.current !== null) run(lastRef.current)
  }, [run])

  return { status, dsl, parseError, retry }
}
