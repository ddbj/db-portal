import { NewsCategory, NewsSource } from "~/lib/api"

export type NewsFacetState = {
  source: readonly NewsSource[]
  category: readonly NewsCategory[]
  year: readonly number[]
  service: readonly string[]
  page: number
  sort: "newest" | "oldest"
}

const SORT_VALUES: readonly NewsFacetState["sort"][] = ["newest", "oldest"]

const isNewsCategory = (value: string): value is NewsCategory =>
  (NewsCategory.options as readonly string[]).includes(value)

const isNewsSource = (value: string): value is NewsSource =>
  (NewsSource.options as readonly string[]).includes(value)

const splitList = (value: string | null | undefined): string[] => {
  if (!value) return []

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

export const parseNewsFacetState = (search: string): NewsFacetState => {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
  const sortRaw = params.get("sort")
  const sort: NewsFacetState["sort"] = SORT_VALUES.includes(sortRaw as NewsFacetState["sort"])
    ? (sortRaw as NewsFacetState["sort"])
    : "newest"
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1)

  return {
    source: splitList(params.get("source")).filter(isNewsSource),
    category: splitList(params.get("category")).filter(isNewsCategory),
    year: splitList(params.get("year"))
      .map((entry) => Number(entry))
      .filter((entry) => Number.isInteger(entry) && entry > 1900),
    service: splitList(params.get("service")).map((entry) => entry.toLowerCase()),
    page,
    sort,
  }
}

export const serializeNewsFacetState = (state: NewsFacetState): string => {
  const params = new URLSearchParams()
  if (state.source.length > 0) {
    params.set("source", [...state.source].sort().join(","))
  }
  if (state.category.length > 0) {
    params.set("category", [...state.category].sort().join(","))
  }
  if (state.year.length > 0) {
    params.set("year", [...state.year].sort((a, b) => b - a).join(","))
  }
  if (state.service.length > 0) {
    params.set("service", [...state.service].sort().join(","))
  }
  if (state.sort !== "newest") params.set("sort", state.sort)
  if (state.page > 1) params.set("page", String(state.page))
  const qs = params.toString()

  return qs ? `?${qs}` : ""
}

export const toggleSource = (state: NewsFacetState, source: NewsSource): NewsFacetState => ({
  ...state,
  source: state.source.includes(source)
    ? state.source.filter((s) => s !== source)
    : [...state.source, source],
  page: 1,
})

export const toggleCategory = (state: NewsFacetState, category: NewsCategory): NewsFacetState => ({
  ...state,
  category: state.category.includes(category)
    ? state.category.filter((c) => c !== category)
    : [...state.category, category],
  page: 1,
})

export const toggleYear = (state: NewsFacetState, year: number): NewsFacetState => ({
  ...state,
  year: state.year.includes(year)
    ? state.year.filter((y) => y !== year)
    : [...state.year, year],
  page: 1,
})

export const toggleService = (state: NewsFacetState, service: string): NewsFacetState => ({
  ...state,
  service: state.service.includes(service)
    ? state.service.filter((s) => s !== service)
    : [...state.service, service],
  page: 1,
})

export const setSort = (state: NewsFacetState, sort: NewsFacetState["sort"]): NewsFacetState => ({
  ...state,
  sort,
  page: 1,
})

export const setPage = (state: NewsFacetState, page: number): NewsFacetState => ({
  ...state,
  page: Math.max(1, page),
})

export const clearFacet = (
  state: NewsFacetState,
  kind: "source" | "category" | "year" | "service",
): NewsFacetState => {
  if (kind === "source") return { ...state, source: [], page: 1 }
  if (kind === "category") return { ...state, category: [], page: 1 }
  if (kind === "year") return { ...state, year: [], page: 1 }

  return { ...state, service: [], page: 1 }
}

export const emptyNewsFacetState = (): NewsFacetState => ({
  source: [],
  category: [],
  year: [],
  service: [],
  page: 1,
  sort: "newest",
})
