import { getKindRoute, getQ2Repos, listKindRoutes } from "~/content/submit-routing/catalog"
import type { FileTypeKind, Q2, Service } from "~/schemas/submit"

const intersects = (a: readonly Service[], b: readonly Service[]): boolean => {
  const bset = new Set(b)

  return a.some((x) => bset.has(x))
}

// allowedRepos = Q2.repos。rules を実行せず repos を読むだけで判定する純関数
export const allowedRepos = (q2: Q2 | null): Service[] => {
  if (q2 === null) return []

  return [...getQ2Repos(q2)]
}

// 種別 enable ⟺ KindRoute.candidateRepos ∩ allowedRepos ≠ ∅
export const isKindEnabled = (q2: Q2 | null, kind: FileTypeKind): boolean => {
  const allowed = allowedRepos(q2)
  if (allowed.length === 0) return false

  return intersects(getKindRoute(kind).candidateRepos, allowed)
}

export const enabledKinds = (q2: Q2 | null): FileTypeKind[] =>
  listKindRoutes().map((r) => r.id).filter((k) => isKindEnabled(q2, k))
