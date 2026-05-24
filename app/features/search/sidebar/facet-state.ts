import type { DateRangeKey } from "~/ui"

export const FACET_ORGANISMS: readonly string[] = [
  "Homo sapiens",
  "Mus musculus",
  "Rattus norvegicus",
  "Drosophila melanogaster",
  "Saccharomyces cerevisiae",
  "Caenorhabditis elegans",
  "Escherichia coli",
  "Arabidopsis thaliana",
  "Danio rerio",
  "Zea mays",
  "Oryza sativa",
  "Bos taurus",
]

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

export type SampleCountRange = {
  min: number | null
  max: number | null
}

export type DatePublishedFilter = {
  active: DateRangeKey
  from: string
  to: string
}

export type FacetState = {
  organisms: string[]
  submitters: string[]
  studyType: string | null
  sampleCount: SampleCountRange
  datePublished: DatePublishedFilter
}

export type FacetAction =
  | { type: "toggleOrganism"; value: string }
  | { type: "toggleSubmitter"; value: string }
  | { type: "setStudyType"; value: string | null }
  | { type: "setSampleCount"; range: SampleCountRange }
  | { type: "setDateRange"; active: DateRangeKey }
  | { type: "setDateFrom"; value: string }
  | { type: "setDateTo"; value: string }
  | { type: "clear" }
  | { type: "replace"; state: FacetState }

export const createInitialFacetState = (): FacetState => ({
  organisms: [],
  submitters: [],
  studyType: null,
  sampleCount: { min: null, max: null },
  datePublished: { active: "all", from: "", to: "" },
})

const toggle = (values: string[], value: string): string[] => {
  const idx = values.indexOf(value)
  if (idx === -1) return [...values, value]
  const next = [...values]
  next.splice(idx, 1)

  return next
}

export const facetReducer = (state: FacetState, action: FacetAction): FacetState => {
  switch (action.type) {
    case "toggleOrganism":
      return { ...state, organisms: toggle(state.organisms, action.value) }
    case "toggleSubmitter":
      return { ...state, submitters: toggle(state.submitters, action.value) }
    case "setStudyType":
      return { ...state, studyType: action.value }
    case "setSampleCount":
      return { ...state, sampleCount: action.range }
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
      return createInitialFacetState()
    case "replace":
      return action.state
  }
}

