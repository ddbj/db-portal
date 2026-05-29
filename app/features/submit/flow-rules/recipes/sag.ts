import type { FileEntry, FileGroup, FlowStep, Submission } from "~/schemas/submit"

import { ENGINE_MESSAGE_KEYS as MK } from "../messages"
import { groupMembers, makeStep, scopeOfEntries } from "../shared"

// mag-sag-chain group (sag) の member を生リードと SAG 配列に振り分ける
const classify = (members: readonly FileEntry[]) => {
  const raw: FileEntry[] = []
  const sequence: FileEntry[] = []
  for (const e of members) {
    const forms = e.chipTags.filter((c) => c.axis === "assembly-form").map((c) => c.value)
    if (forms.includes("raw")) raw.push(e)
    else sequence.push(e)
  }

  return { raw, sequence }
}

// 収束 derived_from。MISAG package。MAG とは別 recipe
const stepsForGroup = (submission: Submission, group: FileGroup): FlowStep[] => {
  const members = groupMembers(submission, group.id)
  const { raw, sequence } = classify(members)
  const gid = group.id
  const scope = scopeOfEntries(members)
  const steps: FlowStep[] = [
    makeStep(`recipe-sag-${gid}-bioproject`, "bioproject", "recipe", scope, [
      { kind: "info", messageKey: MK.sagBioproject },
    ]),
    makeStep(`recipe-sag-${gid}-biosample-misag`, "biosample", "recipe", scope, [
      { kind: "info", messageKey: MK.sagBiosampleMisag },
    ]),
    makeStep(
      `recipe-sag-${gid}-ddbj-trad`,
      "ddbj-trad",
      "recipe",
      scopeOfEntries(sequence.length > 0 ? sequence : members),
      [{ kind: "info", messageKey: MK.sagEntry }],
    ),
  ]
  // 複数細胞時のみ結合 SAG サンプルを emit
  if (sequence.length >= 2) {
    steps.push(
      makeStep(`recipe-sag-${gid}-biosample-combined`, "biosample", "recipe", scope, [
        { kind: "info", messageKey: MK.sagBiosampleCombined },
      ]),
    )
  }
  if (raw.length > 0) {
    steps.push(
      makeStep(`recipe-sag-${gid}-dra-run`, "dra", "recipe", scopeOfEntries(raw), [
        { kind: "info", messageKey: MK.sagDraRun },
      ]),
    )
  }

  return steps
}

export const sagSteps = (
  submission: Submission,
  groups: readonly FileGroup[],
): FlowStep[] => groups.flatMap((g) => stepsForGroup(submission, g))
