import { z } from "zod"

import { Access, ChipAxis, DataForm, FileTypeKind, GroupType, Q2 } from "./vocabulary"

// 条件記述語彙。単一 FileEntry / 単一 FileGroup / 前段でのみ評価でき、submission 集約は参照しない
export type When =
  | { fileTypeKind: FileTypeKind }
  | { fileTypeKindIn: FileTypeKind[] }
  | { access: Access }
  | { dataForm: DataForm }
  | { groupType: GroupType }
  | { groupTypeIn: GroupType[] }
  | { anyChip: { axis: ChipAxis; value?: string } }
  | { q2: Q2 }
  | { q2In: Q2[] }
  | { and: When[] }
  | { or: When[] }
  | { not: When }
  | { always: true }

const AnyChip = z.object({ axis: ChipAxis, value: z.string().min(1).optional() }).strict()

export const When = z.lazy(() =>
  z.union([
    z.object({ fileTypeKind: FileTypeKind }).strict(),
    z.object({ fileTypeKindIn: z.array(FileTypeKind).min(1) }).strict(),
    z.object({ access: Access }).strict(),
    z.object({ dataForm: DataForm }).strict(),
    z.object({ groupType: GroupType }).strict(),
    z.object({ groupTypeIn: z.array(GroupType).min(1) }).strict(),
    z.object({ anyChip: AnyChip }).strict(),
    z.object({ q2: Q2 }).strict(),
    z.object({ q2In: z.array(Q2).min(1) }).strict(),
    z.object({ and: z.array(When).min(1) }).strict(),
    z.object({ or: z.array(When).min(1) }).strict(),
    z.object({ not: When }).strict(),
    z.object({ always: z.literal(true) }).strict(),
  ]),
) as z.ZodType<When>

// ネスト深さ: 原子 = 1、結合子 = 1 + 子の最大深さ
export const whenDepth = (when: When): number => {
  if ("and" in when) return 1 + Math.max(...when.and.map(whenDepth))
  if ("or" in when) return 1 + Math.max(...when.or.map(whenDepth))
  if ("not" in when) return 1 + whenDepth(when.not)

  return 1
}

export const MAX_WHEN_DEPTH = 3
