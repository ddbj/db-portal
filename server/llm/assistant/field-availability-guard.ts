// Deterministic safety net for the per-DB field-availability trap. The Solr-backed
// DBs (ddbj / taxonomy) and biosample do not carry every Tier-1/2 cross field, so
// ddbj-search-api's validator (search/dsl/allowlist.py `_TIER12_UNAVAILABLE_DBS`)
// rejects those clauses with a `field-not-available-for-db` 400 instead of dropping
// them. The prompt steers the model away, but a 32B model still occasionally emits e.g.
// a date in taxonomy; left alone the BFF would surface that 400 to the user as
// invalid_dsl. This removes the unsupported clauses from the model's DSL so the query
// validates and the resolved-DB search runs (the search endpoint itself treats a
// missing field as a no-op). Mirrors `_TIER12_UNAVAILABLE_DBS` (docs/search-fields.md);
// `accessibility` is a fixed-value field there (folded to public-access, never
// rejected) so it is deliberately NOT listed.

// Per DB, the Tier-1/2 cross fields the DB's index cannot serve (a `field:...` clause on
// one of them is a hard 400, not a silent drop, at /db-portal/parse).
export const UNAVAILABLE_BY_DB: Record<string, ReadonlySet<string>> = {
  taxonomy: new Set(["name", "date_published", "date_modified", "date_created", "date", "submitter", "publication"]),
  ddbj: new Set(["name", "date_modified", "date_created", "date", "submitter"]),
  biosample: new Set(["publication"]),
}

// The HTTP problem type the parse API returns for a single-DB field-availability reject
// (distinct from `field-not-available-in-cross-db`, which the auto-resolver consumes).
export const isFieldNotAvailableForDb = (type: string | undefined): boolean =>
  (type ?? "").endsWith("field-not-available-for-db")

// Split a DSL string into its top-level (paren-depth 0, outside quotes) AND conjuncts.
// Quotes guard a value that itself contains the word AND; `[..]` / `(..)` guard a range
// or an OR-set so a nested AND/OR is never treated as a top-level separator.
const splitTopLevelAnd = (dsl: string): string[] => {
  const parts: string[] = []
  let depth = 0
  let inQuote = false
  let cur = ""
  for (let i = 0; i < dsl.length; i++) {
    const c = dsl[i]
    if (c === "\"") {
      inQuote = !inQuote
      cur += c
    } else if (inQuote) {
      cur += c
    } else if (c === "(" || c === "[") {
      depth++
      cur += c
    } else if (c === ")" || c === "]") {
      depth--
      cur += c
    } else if (depth === 0 && dsl.startsWith(" AND ", i)) {
      parts.push(cur)
      cur = ""
      i += 4
    } else {
      cur += c
    }
  }
  parts.push(cur)

  return parts.map((p) => p.trim()).filter((p) => p.length > 0)
}

// The field a bare leaf conjunct (optionally NOT-prefixed) filters on, or null when the
// conjunct is a paren OR-group / free-text / anything that is not a `field:value` leaf —
// those are never dropped (an unavailable field nested in an OR-set is left for the parse
// API to reject, which degrades to the original error rather than a wrong rewrite).
const leafField = (conjunct: string): string | null => {
  const match = /^(?:NOT\s+)?([a-z_]+):/.exec(conjunct)

  return match ? match[1] ?? null : null
}

// Remove every top-level conjunct that filters on a field the resolved DB cannot serve.
// Returns the rewritten DSL, or null when nothing changed or every conjunct was
// unsupported (the caller then keeps the original parse outcome / error).
export const pruneUnavailableFields = (dsl: string, db: string | null): string | null => {
  if (db === null) return null
  const unavailable = UNAVAILABLE_BY_DB[db]
  if (unavailable === undefined) return null

  const parts = splitTopLevelAnd(dsl)
  const kept = parts.filter((part) => {
    const field = leafField(part)

    return field === null || !unavailable.has(field)
  })
  if (kept.length === parts.length || kept.length === 0) return null

  return kept.join(" AND ")
}
