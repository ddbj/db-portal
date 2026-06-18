import type { Access, FileTypeKind, Q2 } from "~/schemas/submit"
import { IDENTIFIABLE_KINDS } from "~/schemas/submit"
import type { AccessSection } from "~/schemas/submit/submission"

export const deriveAccess = (q2: Q2 | null, section: AccessSection, fileTypeKind: FileTypeKind): Access => {
  if (q2 !== "human") return "open"
  if (section.restrictedPreference) return "restricted"
  if (section.ethicsCompliance) {
    return IDENTIFIABLE_KINDS.has(fileTypeKind) ? "restricted" : "open"
  }
  if (section.publiclyAvailable) return "open"
  if (section.microbialAnalysis) return "open"

  return "restricted"
}
