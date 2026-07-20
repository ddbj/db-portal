import type { Access, FileTypeKind, OrganismDomain } from "~/schemas/submit"
import { IDENTIFIABLE_KINDS } from "~/schemas/submit"
import type { FileEntryChip } from "~/schemas/submit/file-entry"
import type { AccessSection } from "~/schemas/submit/submission"

// ヒト × 指針対象 (法令・倫理指針に沿ったヒト研究、 個人識別符号、 制限公開希望のいずれか) は
// NBDC ヒトデータベースへの提供申請 (humandbs) を要する。 Access (open/restricted) と直交する軸。
export const requiresHumandbsApplication = (
  organismDomain: OrganismDomain | null,
  section: AccessSection,
): boolean =>
  organismDomain === "human" &&
  (section.restrictedPreference || section.hasIdentifier || section.ethicsCompliance)

export const deriveAccess = (
  organismDomain: OrganismDomain | null,
  section: AccessSection,
  fileTypeKind: FileTypeKind,
  chips: readonly FileEntryChip[] = [],
): Access => {
  if (organismDomain !== "human") return "open"
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
