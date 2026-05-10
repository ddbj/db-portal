import type {
  DataTypeDef,
  DataTypeId,
  HorizontalAttributeDef,
  TreeNodeIdAlt,
} from "@/types/submit-alt"

// 新トップ階層 10 項目。docs/submit-alt.md L61-75 / L379-393 参照。
export const DATA_TYPES: readonly DataTypeDef[] = [
  {
    id: "human-restricted",
    labelKey: "routes.submitAlt.dataTypes.human-restricted.label",
    descriptionKey: "routes.submitAlt.dataTypes.human-restricted.description",
  },
  {
    id: "sequence-read",
    labelKey: "routes.submitAlt.dataTypes.sequence-read.label",
    descriptionKey: "routes.submitAlt.dataTypes.sequence-read.description",
  },
  {
    id: "genome",
    labelKey: "routes.submitAlt.dataTypes.genome.label",
    descriptionKey: "routes.submitAlt.dataTypes.genome.description",
  },
  {
    id: "variation",
    labelKey: "routes.submitAlt.dataTypes.variation.label",
    descriptionKey: "routes.submitAlt.dataTypes.variation.description",
  },
  {
    id: "proteomics",
    labelKey: "routes.submitAlt.dataTypes.proteomics.label",
    descriptionKey: "routes.submitAlt.dataTypes.proteomics.description",
  },
  {
    id: "est",
    labelKey: "routes.submitAlt.dataTypes.est.label",
    descriptionKey: "routes.submitAlt.dataTypes.est.description",
  },
  {
    id: "microarray",
    labelKey: "routes.submitAlt.dataTypes.microarray.label",
    descriptionKey: "routes.submitAlt.dataTypes.microarray.description",
  },
  {
    id: "spatial-transcriptomics",
    labelKey: "routes.submitAlt.dataTypes.spatial-transcriptomics.label",
    descriptionKey: "routes.submitAlt.dataTypes.spatial-transcriptomics.description",
  },
  {
    id: "metabolomics",
    labelKey: "routes.submitAlt.dataTypes.metabolomics.label",
    descriptionKey: "routes.submitAlt.dataTypes.metabolomics.description",
  },
  {
    id: "small-sequence",
    labelKey: "routes.submitAlt.dataTypes.small-sequence.label",
    descriptionKey: "routes.submitAlt.dataTypes.small-sequence.description",
  },
] as const

export const DATA_TYPE_IDS: readonly DataTypeId[] = DATA_TYPES.map((d) => d.id)

export const HORIZONTAL_ATTRIBUTES: readonly HorizontalAttributeDef[] = [
  {
    id: "human",
    labelKey: "routes.submitAlt.horizontalAttributes.human.label",
    descriptionKey: "routes.submitAlt.horizontalAttributes.human.description",
  },
] as const

// data type id → 起点 tree node id。leaf 直結型と中間 node 起点で異なる。
// 例: microarray は data type だが、tree 起点は leaf "expression-array"。
export const DATA_TYPE_TO_ROOT_NODE: Readonly<Record<DataTypeId, TreeNodeIdAlt>> = {
  "human-restricted": "human-restricted",
  "sequence-read": "sequence-read",
  "genome": "genome",
  "variation": "variation",
  "proteomics": "proteomics",
  "est": "est",
  "microarray": "expression-array",
  "spatial-transcriptomics": "spatial-transcriptomics",
  "metabolomics": "metabolomics",
  "small-sequence": "small-sequence",
}
