import type { FileEntry, FileGroup, OrganismDomain, When } from "~/schemas/submit"

export type PredicateContext = {
  entry: FileEntry
  group: FileGroup | undefined
  organismDomain: OrganismDomain | null
}

// 単一 FileEntry / 所属 group / 前段で when を評価する純関数
export const evalWhen = (when: When, ctx: PredicateContext): boolean => {
  if ("always" in when) return when.always === true
  if ("and" in when) return when.and.every((w) => evalWhen(w, ctx))
  if ("or" in when) return when.or.some((w) => evalWhen(w, ctx))
  if ("not" in when) return !evalWhen(when.not, ctx)
  if ("fileTypeKind" in when) return ctx.entry.fileTypeKind === when.fileTypeKind
  if ("fileTypeKindIn" in when) return when.fileTypeKindIn.includes(ctx.entry.fileTypeKind)
  if ("access" in when) return ctx.entry.access === when.access
  if ("dataForm" in when) return ctx.entry.dataForm === when.dataForm
  if ("groupType" in when) return ctx.group?.groupType === when.groupType
  if ("groupTypeIn" in when) {
    return ctx.group !== undefined && when.groupTypeIn.includes(ctx.group.groupType)
  }
  if ("anyChip" in when) {
    const { axis, value } = when.anyChip

    return ctx.entry.chipTags.some(
      (c) => c.axis === axis && (value === undefined || c.value === value),
    )
  }
  if ("organismDomain" in when) return ctx.organismDomain === when.organismDomain
  if ("organismDomainIn" in when) return ctx.organismDomain !== null && when.organismDomainIn.includes(ctx.organismDomain)

  return false
}
