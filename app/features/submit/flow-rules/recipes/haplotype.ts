import type { FileEntry, FlowStep } from "~/schemas/submit"

import { ENGINE_MESSAGE_KEYS as MK } from "../messages"
import { makeStep, scopeOfEntries } from "../shared"

const isHaplotype = (e: FileEntry): boolean =>
  e.fileTypeKind === "sequence"
  && e.chipTags.some((c) => c.axis === "assembly-form" && c.value === "haplotype")

export const haplotypeSteps = (entries: readonly FileEntry[]): FlowStep[] => {
  const matched = entries.filter(isHaplotype)
  if (matched.length === 0) return []

  return [
    makeStep("recipe-umbrella-bioproject", "umbrella-bioproject", "recipe", scopeOfEntries(matched), [
      { kind: "info", messageKey: MK.umbrellaBioprojectIntro },
    ]),
  ]
}
