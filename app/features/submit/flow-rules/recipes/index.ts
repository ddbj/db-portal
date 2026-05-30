import type { FileGroup, Submission } from "~/schemas/submit"

import { groupMembers, hasChip } from "../shared"

// named recipe は allowlist として固定し、勝手に増えないことを担保する (Tier1 骨抜き防止)
export const RECIPE_ALLOWLIST = ["jga-submission", "mag-project", "sag", "spatial"] as const
export type RecipeName = (typeof RECIPE_ALLOWLIST)[number]

// 同一 group は assembly-form 値で mag-project / sag の一方にのみディスパッチする
export const detectRecipeGroups = (
  submission: Submission,
): { magGroups: FileGroup[]; sagGroups: FileGroup[] } => {
  const magGroups: FileGroup[] = []
  const sagGroups: FileGroup[] = []
  for (const g of submission.fileGroups) {
    if (g.groupType !== "mag-sag-chain") continue
    const members = groupMembers(submission, g.id)
    if (members.length === 0) continue
    if (members.some((e) => hasChip(e, "assembly-form", "mag"))) magGroups.push(g)
    else if (members.some((e) => hasChip(e, "assembly-form", "sag"))) sagGroups.push(g)
  }

  return { magGroups, sagGroups }
}

export { jgaSubmissionSteps } from "./jga-submission"
export { magProjectSteps } from "./mag-project"
export { sagSteps } from "./sag"
export { spatialSteps } from "./spatial"
