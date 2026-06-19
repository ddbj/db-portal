import type { FileEntry, FlowStep } from "~/schemas/submit"

import { ENGINE_MESSAGE_KEYS as MK } from "../messages"
import { makeStep, scopeOfEntries } from "../shared"

const needsDra = (e: FileEntry): boolean =>
  e.fileTypeKind === "sequence"
  && e.chipTags.some((c) =>
    c.axis === "assembly-form"
    && (c.value === "mag" || c.value === "sag" || c.value === "primary" || c.value === "binned"),
  )

export const sequenceDraSteps = (entries: readonly FileEntry[]): FlowStep[] => {
  const matched = entries.filter(needsDra)
  if (matched.length === 0) return []

  return [
    makeStep("recipe-sequence-dra", "dra", "recipe", scopeOfEntries(matched), [
      { kind: "info", messageKey: MK.sequenceDraRaw },
    ]),
  ]
}
