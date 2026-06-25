// named recipe は allowlist として固定し、勝手に増えないことを担保する (Tier1 骨抜き防止)
export const RECIPE_ALLOWLIST = ["jga-submission", "spatial", "sequence-dra", "haplotype"] as const

export { haplotypeSteps } from "./haplotype"
export { jgaSubmissionSteps } from "./jga-submission"
export { sequenceDraSteps } from "./sequence-dra"
export { spatialSteps } from "./spatial"
