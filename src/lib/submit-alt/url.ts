import { DATA_TYPE_IDS } from "@/lib/mock-data/submit-alt-tree"
import { isValidNodeIdAlt } from "@/lib/submit-alt/node-selectors"
import type { DataTypeId, TreeNodeIdAlt } from "@/types/submit-alt"

const DATA_TYPE_ID_SET: ReadonlySet<DataTypeId> = new Set(DATA_TYPE_IDS)

export const isValidDataTypeId = (v: string): v is DataTypeId =>
  DATA_TYPE_ID_SET.has(v as DataTypeId)

// types= はカンマ区切り。空 / 不正値は除外。
// 例: "genome,sequence-read" → Set<{"genome", "sequence-read"}>
export const parseTypesParam = (
  searchParams: URLSearchParams,
): ReadonlySet<DataTypeId> => {
  const raw = searchParams.get("types")
  if (raw === null || raw === "") return new Set()
  const result = new Set<DataTypeId>()
  for (const part of raw.split(",")) {
    const trimmed = part.trim()
    if (isValidDataTypeId(trimmed)) result.add(trimmed)
  }

  return result
}

// human=1 のみ true。それ以外 (省略 / "0" / 不正値) は false。
export const parseHumanParam = (searchParams: URLSearchParams): boolean =>
  searchParams.get("human") === "1"

// for= は tree node id。不正値は null にフォールバック。
export const parseForParam = (
  searchParams: URLSearchParams,
): TreeNodeIdAlt | null => {
  const raw = searchParams.get("for")
  if (raw === null || raw === "") return null

  return isValidNodeIdAlt(raw) ? raw : null
}

// types= の Set を URL クエリ文字列に変換。空集合は null（types を URL から除く）。
// 仕様書 L379-393 の順序で並べる（DATA_TYPE_IDS の宣言順 = ID 一覧の順）。
export const serializeTypes = (
  types: ReadonlySet<DataTypeId>,
): string | null => {
  if (types.size === 0) return null
  const ordered = DATA_TYPE_IDS.filter((id) => types.has(id))

  return ordered.join(",")
}
