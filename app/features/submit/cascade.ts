import { getKindRoute, getOrganismDomainRepos, listKindRoutes } from "~/content/submit-routing/catalog"
import type { FileTypeKind, OrganismDomain, Service } from "~/schemas/submit"

const intersects = (a: readonly Service[], b: readonly Service[]): boolean => {
  const bset = new Set(b)

  return a.some((x) => bset.has(x))
}

// allowedRepos = OrganismDomain.repos。rules を実行せず repos を読むだけで判定する純関数
export const allowedRepos = (organismDomain: OrganismDomain | null): Service[] => {
  if (organismDomain === null) return []

  return [...getOrganismDomainRepos(organismDomain)]
}

// 種別 enable ⟺ KindRoute.candidateRepos ∩ allowedRepos ≠ ∅
export const isKindEnabled = (organismDomain: OrganismDomain | null, kind: FileTypeKind): boolean => {
  const allowed = allowedRepos(organismDomain)
  if (allowed.length === 0) return false

  return intersects(getKindRoute(kind).candidateRepos, allowed)
}

export const enabledKinds = (organismDomain: OrganismDomain | null): FileTypeKind[] =>
  listKindRoutes().map((r) => r.id).filter((k) => isKindEnabled(organismDomain, k))
