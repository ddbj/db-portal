import type { FileEntry, FileGroup, FlowStep, Submission } from "~/schemas/submit"

import { ENGINE_MESSAGE_KEYS as MK } from "../messages"
import { groupMembers, makeStep, scopeOfEntries } from "../shared"

// mag-sag-chain group の member を assembly-form chip で 4 段に振り分ける
const classify = (members: readonly FileEntry[]) => {
  const raw: FileEntry[] = []
  const analysis: FileEntry[] = []
  const mag: FileEntry[] = []
  for (const e of members) {
    const forms = e.chipTags.filter((c) => c.axis === "assembly-form").map((c) => c.value)
    if (forms.includes("mag")) mag.push(e)
    else if (forms.includes("primary") || forms.includes("binned")) analysis.push(e)
    else raw.push(e)
  }

  return { raw, analysis, mag }
}

// 共通 BioProject + BioSample derived_from 放射状 + DRA Run/Analysis + ddbj-trad ENV genome。
// 各 BioSample は段別 scope。Binned サンプルは binned/primary member があるときだけ emit する。
const stepsForGroup = (submission: Submission, group: FileGroup): FlowStep[] => {
  const members = groupMembers(submission, group.id)
  const { raw, analysis, mag } = classify(members)
  const gid = group.id
  const wholeScope = scopeOfEntries(members)
  // メタゲノムサンプルは全段が derived_from する親。生リードがあればそこに、無ければ group 全体に紐づける
  const metagenomeScope = raw.length > 0 ? scopeOfEntries(raw) : wholeScope
  const steps: FlowStep[] = [
    makeStep(`recipe-mag-${gid}-bioproject`, "bioproject", "recipe", wholeScope, [
      { kind: "info", messageKey: MK.magBioproject },
    ]),
    makeStep(`recipe-mag-${gid}-biosample-metagenome`, "biosample", "recipe", metagenomeScope, [
      { kind: "info", messageKey: MK.magBiosampleMetagenome },
    ]),
    makeStep(`recipe-mag-${gid}-biosample-mag`, "biosample", "recipe", scopeOfEntries(mag), [
      { kind: "info", messageKey: MK.magBiosampleMag },
    ]),
    makeStep(`recipe-mag-${gid}-ddbj-trad`, "ddbj-trad", "recipe", scopeOfEntries(mag), [
      { kind: "info", messageKey: MK.magEnvGenome },
    ]),
  ]
  if (analysis.length > 0) {
    steps.push(
      makeStep(`recipe-mag-${gid}-biosample-binned`, "biosample", "recipe", scopeOfEntries(analysis), [
        { kind: "info", messageKey: MK.magBiosampleBinned },
      ]),
    )
  }
  if (raw.length > 0) {
    steps.push(
      makeStep(`recipe-mag-${gid}-dra-run`, "dra", "recipe", scopeOfEntries(raw), [
        { kind: "info", messageKey: MK.magDraRun },
      ]),
    )
  }
  if (analysis.length > 0) {
    steps.push(
      makeStep(`recipe-mag-${gid}-dra-analysis`, "dra", "recipe", scopeOfEntries(analysis), [
        { kind: "info", messageKey: MK.magDraAnalysis },
      ]),
    )
  }

  return steps
}

export const magProjectSteps = (
  submission: Submission,
  groups: readonly FileGroup[],
): FlowStep[] => groups.flatMap((g) => stepsForGroup(submission, g))
