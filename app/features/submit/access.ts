import type { Access, FileTypeKind, Q1, Q2 } from "~/schemas/submit"

// access が登録先を変える (access-sensitive な) 種別。human では JGA 分岐、reads は非 human でも DRA embargo。
const ACCESS_SENSITIVE_KINDS: ReadonlySet<FileTypeKind> = new Set([
  "sequence-read",
  "variant",
  "microarray-expression",
])

const isAccessSensitiveKind = (kind: FileTypeKind): boolean =>
  ACCESS_SENSITIVE_KINDS.has(kind)

// 公開+制限モードで種別ごとに公開区分トグルを出すか。reads は human/非 human とも登録先が変わる。
// variant / microarray-expression は human のときだけ (非 human は EVA / GEA 固定で access に依らない)。
export const accessToggleVisible = (q1: Q1 | null, q2: Q2 | null, kind: FileTypeKind): boolean => {
  if (q1 !== "restricted") return false
  if (kind === "sequence-read") return true
  if (kind === "variant" || kind === "microarray-expression") return q2 === "human"

  return false
}

// 種別の access default。公開 / 第三者 は open。公開+制限のとき human の access-sensitive 種別は
// restricted (JGA 想定が安全側)、それ以外は open (非 human reads は embargo を opt-in)。
export const defaultAccessFor = (q1: Q1 | null, q2: Q2 | null, kind: FileTypeKind): Access =>
  q1 === "restricted" && q2 === "human" && isAccessSensitiveKind(kind) ? "restricted" : "open"
