import { type FileEntry, type FlowStep, isSequencingSpatialPlatform } from "~/schemas/submit"

import { ENGINE_MESSAGE_KEYS as MK } from "../messages"
import { makeStep, scopeOfEntries } from "../shared"

const isSequencingSpatial = (e: FileEntry): boolean =>
  e.fileTypeKind === "spatial-transcriptomics"
  && e.chipTags.some((c) => c.axis === "spatial-platform" && isSequencingSpatialPlatform(c.value))

// Sequencing 系 platform (Visium 等) の spatial entry は生リードを DRA に出し、processed を GEA に出す
// 2 段になる。GEA step は Tier1 が emit するので、ここでは DRA step だけを足す (cross-archive 2 段)。
export const spatialSteps = (entries: readonly FileEntry[]): FlowStep[] => {
  const sequencing = entries.filter(isSequencingSpatial)
  if (sequencing.length === 0) return []

  return [
    makeStep("recipe-spatial-dra", "dra", "recipe", scopeOfEntries(sequencing), [
      { kind: "info", messageKey: MK.spatialDraRaw },
    ]),
  ]
}
