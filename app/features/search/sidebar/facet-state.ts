import type { DateRangeKey } from "~/ui"

// `value` is the NCBI taxonomy ID sent as `organism_id:<value>` to the API;
// `label` is the scientific name shown in the UI.
export const FACET_ORGANISMS: readonly { value: string; label: string }[] = [
  { value: "9606", label: "Homo sapiens" },
  { value: "10090", label: "Mus musculus" },
  { value: "10116", label: "Rattus norvegicus" },
  { value: "7227", label: "Drosophila melanogaster" },
  { value: "4932", label: "Saccharomyces cerevisiae" },
  { value: "6239", label: "Caenorhabditis elegans" },
  { value: "562", label: "Escherichia coli" },
  { value: "3702", label: "Arabidopsis thaliana" },
  { value: "7955", label: "Danio rerio" },
  { value: "4577", label: "Zea mays" },
  { value: "4530", label: "Oryza sativa" },
  { value: "9913", label: "Bos taurus" },
]

export const organismLabel = (value: string): string =>
  FACET_ORGANISMS.find((organism) => organism.value === value)?.label ?? value

export const FACET_SUBMITTERS: readonly string[] = [
  "National Institute of Genetics",
  "RIKEN",
  "The University of Tokyo",
  "Kyoto University",
  "Osaka University",
  "Tohoku University",
]

export const FACET_STUDY_TYPES: readonly string[] = [
  "Whole Genome Sequencing",
  "Transcriptome Analysis",
  "Metagenomics",
  "Variation Analysis",
  "Epigenetics",
]

export type DatePublishedFilter = {
  active: DateRangeKey
  from: string
  to: string
}

export type SearchFacetState = {
  organisms: string[]
  submitters: string[]
  studyType: string | null
  datePublished: DatePublishedFilter
}

export type SearchFacetAction =
  | { type: "toggleOrganism"; value: string }
  | { type: "toggleSubmitter"; value: string }
  | { type: "setStudyType"; value: string | null }
  | { type: "setDateRange"; active: DateRangeKey }
  | { type: "setDateFrom"; value: string }
  | { type: "setDateTo"; value: string }
  | { type: "clear" }
  | { type: "replace"; state: SearchFacetState }

export const createInitialSearchFacetState = (): SearchFacetState => ({
  organisms: [],
  submitters: [],
  studyType: null,
  datePublished: { active: "all", from: "", to: "" },
})

const toggle = (values: string[], value: string): string[] => {
  const idx = values.indexOf(value)
  if (idx === -1) return [...values, value]
  const next = [...values]
  next.splice(idx, 1)

  return next
}

export const searchFacetReducer = (state: SearchFacetState, action: SearchFacetAction): SearchFacetState => {
  switch (action.type) {
    case "toggleOrganism":
      return { ...state, organisms: toggle(state.organisms, action.value) }
    case "toggleSubmitter":
      return { ...state, submitters: toggle(state.submitters, action.value) }
    case "setStudyType":
      return { ...state, studyType: action.value }
    case "setDateRange":
      return {
        ...state,
        datePublished: {
          active: action.active,
          from: action.active === "all" ? "" : state.datePublished.from,
          to: action.active === "all" ? "" : state.datePublished.to,
        },
      }
    case "setDateFrom":
      return {
        ...state,
        datePublished: { ...state.datePublished, active: "all", from: action.value },
      }
    case "setDateTo":
      return {
        ...state,
        datePublished: { ...state.datePublished, active: "all", to: action.value },
      }
    case "clear":
      return createInitialSearchFacetState()
    case "replace":
      return action.state
  }
}

