import { isValidNodeIdAlt } from "@/lib/submit-alt/node-selectors"
import type {
  Q1Id,
  Q2Id,
  Q3Id,
  Q4Id,
  Q5Id,
  Q6Id,
  Q7Id,
  Q8Id,
  Q9Id,
  QAAnswers,
  TreeNodeIdAlt,
} from "@/types/submit-alt"

const Q1_IDS: readonly Q1Id[] = [
  "sequence-read",
  "assembled",
  "annotation",
  "variation",
  "expression-array",
  "expression-matrix",
  "mass-spec",
  "spatial-tx",
]
const Q1_SET: ReadonlySet<Q1Id> = new Set(Q1_IDS)

const Q2_IDS: readonly Q2Id[] = [
  "human",
  "eukaryote",
  "prokaryote",
  "virus",
  "metagenome",
  "organelle-plasmid",
]
const Q2_SET: ReadonlySet<Q2Id> = new Set(Q2_IDS)

const Q3_SET: ReadonlySet<Q3Id> = new Set(["open", "restricted"])
const Q4_SET: ReadonlySet<Q4Id> = new Set(["primary", "tpa"])
const Q5_SET: ReadonlySet<Q5Id> = new Set(["small", "normal"])

const Q6_IDS: readonly Q6Id[] = [
  "haplotype",
  "tsa",
  "tls",
  "mag-sag",
  "est",
  "none",
]
const Q6_SET: ReadonlySet<Q6Id> = new Set(Q6_IDS)

const Q7_SET: ReadonlySet<Q7Id> = new Set(["proteomics", "metabolomics"])
const Q8_SET: ReadonlySet<Q8Id> = new Set(["raw", "primary"])
const Q9_SET: ReadonlySet<Q9Id> = new Set(["yes", "no"])

const parseCsvSet = <T extends string>(
  raw: string | null,
  validSet: ReadonlySet<T>,
): ReadonlySet<T> => {
  if (raw === null || raw === "") return new Set<T>()
  const result = new Set<T>()
  for (const part of raw.split(",")) {
    const trimmed = part.trim() as T
    if (validSet.has(trimmed)) result.add(trimmed)
  }

  return result
}

const parseEnum = <T extends string>(
  raw: string | null,
  validSet: ReadonlySet<T>,
): T | null => {
  if (raw === null || raw === "") return null
  const trimmed = raw.trim() as T

  return validSet.has(trimmed) ? trimmed : null
}

export const parseQAAnswers = (searchParams: URLSearchParams): QAAnswers => ({
  q1: parseCsvSet(searchParams.get("q1"), Q1_SET),
  q2: parseEnum(searchParams.get("q2"), Q2_SET),
  q3: parseEnum(searchParams.get("q3"), Q3_SET),
  q4: parseEnum(searchParams.get("q4"), Q4_SET),
  q5: parseEnum(searchParams.get("q5"), Q5_SET),
  q6: parseCsvSet(searchParams.get("q6"), Q6_SET),
  q7: parseEnum(searchParams.get("q7"), Q7_SET),
  q8: parseEnum(searchParams.get("q8"), Q8_SET),
  q9: parseEnum(searchParams.get("q9"), Q9_SET),
})

const serializeCsvSet = <T extends string>(
  set: ReadonlySet<T>,
  ordered: readonly T[],
): string | null => {
  if (set.size === 0) return null

  return ordered.filter((id) => set.has(id)).join(",")
}

// QA 回答を URLSearchParams にシリアライズする。null / 空集合は対応キーを書かない。
export const applyQAAnswersToParams = (
  params: URLSearchParams,
  answers: QAAnswers,
): void => {
  const q1 = serializeCsvSet(answers.q1, Q1_IDS)
  if (q1 !== null) params.set("q1", q1)
  else params.delete("q1")
  if (answers.q2 !== null) params.set("q2", answers.q2)
  else params.delete("q2")
  if (answers.q3 !== null) params.set("q3", answers.q3)
  else params.delete("q3")
  if (answers.q4 !== null) params.set("q4", answers.q4)
  else params.delete("q4")
  if (answers.q5 !== null) params.set("q5", answers.q5)
  else params.delete("q5")
  const q6 = serializeCsvSet(answers.q6, Q6_IDS)
  if (q6 !== null) params.set("q6", q6)
  else params.delete("q6")
  if (answers.q7 !== null) params.set("q7", answers.q7)
  else params.delete("q7")
  if (answers.q8 !== null) params.set("q8", answers.q8)
  else params.delete("q8")
  if (answers.q9 !== null) params.set("q9", answers.q9)
  else params.delete("q9")
}

// for= は tree node id。不正値は null にフォールバック。
export const parseForParam = (
  searchParams: URLSearchParams,
): TreeNodeIdAlt | null => {
  const raw = searchParams.get("for")
  if (raw === null || raw === "") return null

  return isValidNodeIdAlt(raw) ? raw : null
}

export const isValidQ1Id = (v: string): v is Q1Id => Q1_SET.has(v as Q1Id)
export const isValidQ2Id = (v: string): v is Q2Id => Q2_SET.has(v as Q2Id)
