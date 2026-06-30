import { ServiceCategory, ServiceSource } from "~/lib/api"
import { splitCsvList } from "~/lib/csv-list"

export type ServicesFacetState = {
  source: readonly ServiceSource[]
  category: readonly ServiceCategory[]
  page: number
  sort: "asc" | "desc"
}

const SORT_VALUES: readonly ServicesFacetState["sort"][] = ["asc", "desc"]

const isServiceCategory = (value: string): value is ServiceCategory =>
  (ServiceCategory.options as readonly string[]).includes(value)

const isServiceSource = (value: string): value is ServiceSource =>
  (ServiceSource.options as readonly string[]).includes(value)

export const parseServicesFacetState = (search: string): ServicesFacetState => {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
  const sortRaw = params.get("sort")
  const sort: ServicesFacetState["sort"] = SORT_VALUES.includes(sortRaw as ServicesFacetState["sort"])
    ? (sortRaw as ServicesFacetState["sort"])
    : "asc"
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1)

  return {
    source: splitCsvList(params.get("source")).filter(isServiceSource),
    category: splitCsvList(params.get("category")).filter(isServiceCategory),
    page,
    sort,
  }
}

export const serializeServicesFacetState = (state: ServicesFacetState): string => {
  const params = new URLSearchParams()
  if (state.source.length > 0) {
    params.set("source", [...state.source].sort().join(","))
  }
  if (state.category.length > 0) {
    params.set("category", [...state.category].sort().join(","))
  }
  if (state.sort !== "asc") params.set("sort", state.sort)
  if (state.page > 1) params.set("page", String(state.page))
  const qs = params.toString()

  return qs ? `?${qs}` : ""
}

export const toggleSource = (state: ServicesFacetState, source: ServiceSource): ServicesFacetState => ({
  ...state,
  source: state.source.includes(source)
    ? state.source.filter((s) => s !== source)
    : [...state.source, source],
  page: 1,
})

export const toggleCategory = (
  state: ServicesFacetState,
  category: ServiceCategory,
): ServicesFacetState => ({
  ...state,
  category: state.category.includes(category)
    ? state.category.filter((c) => c !== category)
    : [...state.category, category],
  page: 1,
})

export const setSort = (
  state: ServicesFacetState,
  sort: ServicesFacetState["sort"],
): ServicesFacetState => ({
  ...state,
  sort,
  page: 1,
})

export const setPage = (state: ServicesFacetState, page: number): ServicesFacetState => ({
  ...state,
  page: Math.max(1, page),
})

export const clearFacet = (
  state: ServicesFacetState,
  kind: "source" | "category",
): ServicesFacetState => {
  if (kind === "source") return { ...state, source: [], page: 1 }

  return { ...state, category: [], page: 1 }
}

export const emptyServicesFacetState = (): ServicesFacetState => ({
  source: [],
  category: [],
  page: 1,
  sort: "asc",
})
