import type { LoaderFunctionArgs } from "react-router"

import { type DbSlug, readSearchParams } from "~/features/search"
import { type ParseNode, parseQuery } from "~/lib/api"

type LoaderData = {
  q: string
  db: DbSlug | null
  ast: ParseNode | null
}

// `/search?q=<DSL>` opens the builder pre-filled (e.g. from the results page's
// "edit in builder"). Parse the DSL here so the component can split it into the
// keyword row and the structured builder. Parse in the URL's `db` scope so a
// per-DB Tier 3 field survives restore (cross mode would reject it); the
// /search/results loader and from-url.ts pass `db` for the same reason. An
// unparseable `q` falls back to the raw string in the keyword box, which the
// live sync then flags.
export const loader = async ({ request }: LoaderFunctionArgs): Promise<LoaderData> => {
  const url = new URL(request.url)
  const { q, db } = readSearchParams(url.searchParams)
  if (q === "") return { q, db, ast: null }
  const envBaseUrl = process.env.DB_PORTAL_SEARCH_API_URL
  const options = envBaseUrl ? { baseUrl: envBaseUrl } : {}
  try {
    const parsed = await parseQuery({ q, ...(db ? { db } : {}) }, options)

    return { q, db, ast: parsed.ast }
  } catch {
    return { q, db, ast: null }
  }
}
