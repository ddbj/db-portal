// named recipe は allowlist として固定し、勝手に増えないことを担保する (Tier1 骨抜き防止)
export const RECIPE_ALLOWLIST = ["jga-submission", "spatial"] as const

export { jgaSubmissionSteps } from "./jga-submission"
export { spatialSteps } from "./spatial"
