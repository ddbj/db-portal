export {
  AdvancedBuilder,
  type AdvancedCondition,
  type AdvancedGroup,
  type AdvancedNode,
  type AdvancedNodeId,
  advancedReducer,
  type AdvancedState,
  createCondition,
  createInitialState,
  fromAdvanced,
  PredicateHelpHint,
  toAdvanced,
  useScopeFacets,
} from "./advanced"
export {
  llmAvailabilityFromHealth,
} from "./assistant"
export {
  astEquals,
  canonicalizeAst,
  identityAst,
  isIdentityAst,
  mergeAstAnd,
  splitFreeText,
} from "./ast"
export {
  QueryPreview,
  SwitchableQueryPreview,
} from "./components"
export {
  DEBOUNCE_MS,
  resolveCrossSearchSync,
  useCrossSearchSync,
  useDebouncedSync,
  useDebouncedValue,
  useSearchPending,
} from "./debounce"
export {
  CrossResults,
  type ExactMatch,
  ExactMatchCard,
  fetchSearchResults,
  findExactMatch,
  PerDbResults,
  type ResolvedExactMatch,
  type SearchParams,
  type SearchResult,
  type SearchResultsPayload,
  type SearchResultsQuery,
  SearchResultsSkeleton,
  useSearchResults,
} from "./results"
export {
  type AiMode,
  builderConditionCount,
  NavigableSearchInput,
  resolveAiModeDefault,
  SearchInputPanel,
  type SearchResultsNavState,
} from "./search-input"
export {
  createInitialSearchFacetState,
  facetAggParam,
  FacetPanel,
  FACETS_SIZE,
  type FilterRow,
  fromSidebar,
  presetRangeToDates,
  SCOPE_FILTERS,
  scopeFacetParam,
  searchFacetReducer,
  type SearchFacetState,
  splitForSidebar,
} from "./sidebar"
export { SyncStatusChip } from "./sync-status"
// scope 系 (DB list / per-page / sort) は `~/lib/search-scope` が canonical。
// features/search の barrel からも同 file を直接 re-export し、 features/search
// 内部の types.ts を経由する二重 identity を避ける。
export {
  sortKeyToApiSort,
} from "./types"
export {
  buildResultsHref,
  buildSearchHref,
  DEFAULT_PAGE,
  DEFAULT_PER_PAGE,
  DEFAULT_SORT,
  parseDslToAst,
  readSearchParams,
  type SearchUrlState,
  serializeAstToDsl,
  writeSearchParams,
} from "./url"
export {
  DB_SLUGS,
  type DbSlug,
  maxReachablePage,
  PER_PAGE_VALUES,
  type PerPageValue,
  reachablePageCount,
  SEARCH_HARD_LIMIT,
  SORT_KEYS,
  type SortKey,
} from "~/lib/search-scope"
