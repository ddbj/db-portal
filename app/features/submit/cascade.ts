import { getKindRoute, getQ1Repos, getQ2Repos, listKindRoutes } from "~/content/submit-routing/catalog"
import type { FileTypeKind, Q1, Q2, Service } from "~/schemas/submit"

const intersects = (a: readonly Service[], b: readonly Service[]): boolean => {
  const bset = new Set(b)

  return a.some((x) => bset.has(x))
}

// allowedRepos = Q1.repos ∩ Q2.repos。rules を実行せず repos を読むだけで判定する純関数
export const allowedRepos = (q1: Q1 | null, q2: Q2 | null): Service[] => {
  if (q1 === null || q2 === null) return []
  const q2set = new Set(getQ2Repos(q2))

  return getQ1Repos(q1).filter((r) => q2set.has(r))
}

// Q2 オプション enable ⟺ Q2opt.repos ∩ Q1.repos ≠ ∅ (Q1 未選択時は絞り込み材料が無いので enable)
export const isQ2Enabled = (q1: Q1 | null, q2: Q2): boolean => {
  if (q1 === null) return true

  return intersects(getQ2Repos(q2), getQ1Repos(q1))
}

// Q3 種別 enable ⟺ KindRoute.candidateRepos ∩ allowedRepos ≠ ∅
export const isKindEnabled = (q1: Q1 | null, q2: Q2 | null, kind: FileTypeKind): boolean => {
  const allowed = allowedRepos(q1, q2)
  if (allowed.length === 0) return false

  return intersects(getKindRoute(kind).candidateRepos, allowed)
}

export const enabledKinds = (q1: Q1 | null, q2: Q2 | null): FileTypeKind[] =>
  listKindRoutes().map((r) => r.id).filter((k) => isKindEnabled(q1, q2, k))
