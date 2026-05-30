import { createContext, useContext } from "react"

import type { DbPortalFacets } from "~/lib/api"
import type { DbSlug } from "~/lib/search-scope"

// The active DB scope (from the top search-box selector) is ambient for the
// whole builder tree: it decides which Tier 3 fields each condition row offers.
// A context avoids drilling it through GroupChildren / NodeRow / GroupBlock.
// null = cross scope (Tier 1/2 fields only).
const ScopeDbContext = createContext<DbSlug | null>(null)

export const ScopeDbProvider = ScopeDbContext.Provider

export const useScopeDb = (): DbSlug | null => useContext(ScopeDbContext)

// Facet aggregation for the active scope, also ambient for the tree: a condition
// row whose field is facetable surfaces these buckets as value suggestions. null
// = not loaded / unavailable, in which case rows fall back to plain free text.
const ScopeFacetsContext = createContext<DbPortalFacets | null>(null)

export const ScopeFacetsProvider = ScopeFacetsContext.Provider

export const useScopeFacetData = (): DbPortalFacets | null => useContext(ScopeFacetsContext)
