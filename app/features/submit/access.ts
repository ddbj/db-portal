import type { Access, FileTypeKind, Q2 } from "~/schemas/submit"
import { IDENTIFIABLE_KINDS } from "~/schemas/submit"
import type { FileEntryChip } from "~/schemas/submit/file-entry"
import type { AccessSection } from "~/schemas/submit/submission"

export const deriveAccess = (
  q2: Q2 | null,
  section: AccessSection,
  fileTypeKind: FileTypeKind,
  chips: readonly FileEntryChip[] = [],
): Access => {
  if (q2 !== "human") return "open"
  if (section.restrictedPreference) return "restricted"

  const chip = chips.find((c) => c.axis === "identifiability")

  if (section.hasIdentifier) {
    return chip?.value === "non-identifiable" ? "open" : "restricted"
  }
  if (section.ethicsCompliance) {
    const identifiable = chip === undefined
      ? IDENTIFIABLE_KINDS.has(fileTypeKind)
      : chip.value !== "non-identifiable"
    return identifiable ? "restricted" : "open"
  }
  if (section.publiclyAvailable || section.microbialAnalysis) {
    return chip?.value === "identifiable" ? "restricted" : "open"
  }

  return "restricted"
}
