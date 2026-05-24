import { NewsCategory } from "~/lib/api"

export type FacetState = {
  category: readonly NewsCategory[]
  year: readonly number[]
  service: readonly string[]
  page: number
  sort: "newest" | "oldest"
}

const SORT_VALUES: readonly FacetState["sort"][] = ["newest", "oldest"]

const isNewsCategory = (value: string): value is NewsCategory =>
  (NewsCategory.options as readonly string[]).includes(value)

const splitList = (value: string | null | undefined): string[] => {
  if (!value) return []

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

export const parseFacetState = (search: string): FacetState => {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
  const sortRaw = params.get("sort")
  const sort: FacetState["sort"] = SORT_VALUES.includes(sortRaw as FacetState["sort"])
    ? (sortRaw as FacetState["sort"])
    : "newest"
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1)

  return {
    category: splitList(params.get("category")).filter(isNewsCategory),
    year: splitList(params.get("year"))
      .map((entry) => Number(entry))
      .filter((entry) => Number.isInteger(entry) && entry > 1900),
    service: splitList(params.get("service")).map((entry) => entry.toLowerCase()),
    page,
    sort,
  }
}

export const serializeFacetState = (state: FacetState): string => {
  const params = new URLSearchParams()
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

export const toggleCategory = (state: FacetState, category: NewsCategory): FacetState => ({
  ...state,
  category: state.category.includes(category)
    ? state.category.filter((c) => c !== category)
    : [...state.category, category],
  page: 1,
})

export const toggleYear = (state: FacetState, year: number): FacetState => ({
  ...state,
  year: state.year.includes(year)
    ? state.year.filter((y) => y !== year)
    : [...state.year, year],
  page: 1,
})

export const toggleService = (state: FacetState, service: string): FacetState => ({
  ...state,
  service: state.service.includes(service)
    ? state.service.filter((s) => s !== service)
    : [...state.service, service],
  page: 1,
})

export const setSort = (state: FacetState, sort: FacetState["sort"]): FacetState => ({
  ...state,
  sort,
  page: 1,
})

export const setPage = (state: FacetState, page: number): FacetState => ({
  ...state,
  page: Math.max(1, page),
})

export const clearFacet = (state: FacetState, kind: "category" | "year" | "service"): FacetState => {
  if (kind === "category") return { ...state, category: [], page: 1 }
  if (kind === "year") return { ...state, year: [], page: 1 }

  return { ...state, service: [], page: 1 }
}

export const emptyFacetState = (): FacetState => ({
  category: [],
  year: [],
  service: [],
  page: 1,
  sort: "newest",
})
