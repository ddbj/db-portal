import {
  type ChipAxis,
  ChipAxis as ChipAxisEnum,
  type DataForm,
  DataForm as DataFormEnum,
  type FileTypeKind,
  FileTypeKind as FileTypeKindEnum,
  type GroupType,
  GroupType as GroupTypeEnum,
  isAllowedChipValue,
  type OrganismDomain,
  OrganismDomain as OrganismDomainEnum,
} from "~/schemas/submit"
import type { AccessSection } from "~/schemas/submit/submission"

export const ACCESS_FLAGS = [
  "restrictedPreference",
  "hasIdentifier",
  "ethicsCompliance",
  "publiclyAvailable",
  "microbialAnalysis",
] as const satisfies readonly (keyof AccessSection)[]

const ACCESS_FLAG_URL_NAME = {
  restrictedPreference: "restricted-preference",
  hasIdentifier: "has-identifier",
  ethicsCompliance: "ethics-compliance",
  publiclyAvailable: "publicly-available",
  microbialAnalysis: "microbial-analysis",
} as const satisfies Record<(typeof ACCESS_FLAGS)[number], string>

const URL_NAME_TO_ACCESS_FLAG = Object.fromEntries(
  Object.entries(ACCESS_FLAG_URL_NAME).map(([flag, urlName]) => [urlName, flag]),
) as Record<string, (typeof ACCESS_FLAGS)[number]>

export type UrlEntry = {
  fileTypeKind: FileTypeKind
  dataForm: DataForm | null
  groupIndex: number | null
  chipTags: { axis: ChipAxis; value: string }[]
}

export type UrlGroup = {
  groupType: GroupType
  memberEntryIndices: number[]
  linkedGroupIndices: number[]
}

export type SubmitUrlState = {
  organismDomain: OrganismDomain | null
  accessSection: AccessSection | null
  entries: UrlEntry[]
  groups: UrlGroup[]
}

export const EMPTY_SUBMIT_URL_STATE: SubmitUrlState = {
  organismDomain: null,
  accessSection: null,
  entries: [],
  groups: [],
}

export const DEFAULT_URL_ACCESS_SECTION: AccessSection = {
  restrictedPreference: false,
  hasIdentifier: false,
  ethicsCompliance: true,
  publiclyAvailable: false,
  microbialAnalysis: false,
}

const accessSectionEquals = (a: AccessSection, b: AccessSection): boolean =>
  ACCESS_FLAGS.every((flag) => a[flag] === b[flag])

const parseEntryToken = (token: string): UrlEntry | null => {
  if (token === "") return null
  const [kindToken = "", dataFormToken = "", groupIdxToken = "", chipsToken = ""] = token.split(":")
  const kind = FileTypeKindEnum.safeParse(kindToken)
  if (!kind.success) return null
  const dataFormParsed = dataFormToken === "" ? null : DataFormEnum.safeParse(dataFormToken)
  const dataForm = dataFormParsed && dataFormParsed.success ? dataFormParsed.data : null
  const groupIdxNum = Number.parseInt(groupIdxToken, 10)
  const groupIndex = Number.isInteger(groupIdxNum) && groupIdxNum >= 0 ? groupIdxNum : null
  const chipTags: UrlEntry["chipTags"] = []
  if (chipsToken !== "") {
    for (const pair of chipsToken.split(",")) {
      const eq = pair.indexOf("=")
      if (eq < 0) continue
      const axisToken = pair.slice(0, eq)
      const valueToken = pair.slice(eq + 1)
      const axis = ChipAxisEnum.safeParse(axisToken)
      if (!axis.success) continue
      if (!isAllowedChipValue(axis.data, valueToken)) continue
      if (chipTags.some((c) => c.axis === axis.data)) continue
      chipTags.push({ axis: axis.data, value: valueToken })
    }
  }

  return { fileTypeKind: kind.data, dataForm, groupIndex, chipTags }
}

const stringifyEntry = (e: UrlEntry): string => {
  const chipsStr = e.chipTags.map((c) => `${c.axis}=${c.value}`).join(",")
  const parts: string[] = [
    e.fileTypeKind,
    e.dataForm ?? "",
    e.groupIndex === null ? "" : String(e.groupIndex),
    chipsStr,
  ]
  while (parts.length > 1 && parts[parts.length - 1] === "") parts.pop()

  return parts.join(":")
}

const parseIndexList = (s: string): number[] => {
  if (s === "") return []
  const out: number[] = []
  for (const piece of s.split(",")) {
    const n = Number.parseInt(piece, 10)
    if (Number.isInteger(n) && n >= 0 && !out.includes(n)) out.push(n)
  }

  return out
}

const parseGroupToken = (token: string): UrlGroup | null => {
  if (token === "") return null
  const [groupTypeToken = "", membersToken = "", linkedToken = ""] = token.split(":")
  const groupTypeParsed = GroupTypeEnum.safeParse(groupTypeToken)
  if (!groupTypeParsed.success) return null

  return {
    groupType: groupTypeParsed.data,
    memberEntryIndices: parseIndexList(membersToken),
    linkedGroupIndices: parseIndexList(linkedToken),
  }
}

const stringifyGroup = (g: UrlGroup): string => {
  const parts: string[] = [
    g.groupType,
    g.memberEntryIndices.join(","),
    g.linkedGroupIndices.join(","),
  ]
  while (parts.length > 1 && parts[parts.length - 1] === "") parts.pop()

  return parts.join(":")
}

export const readSubmitParams = (params: URLSearchParams): SubmitUrlState => {
  const rawOrg = params.get("organism-domain")
  const orgParsed = rawOrg !== null ? OrganismDomainEnum.safeParse(rawOrg) : null
  const organismDomain = orgParsed && orgParsed.success ? orgParsed.data : null

  const accessRaw = params.get("access")
  let accessSection: AccessSection | null = null
  if (accessRaw !== null) {
    const section: AccessSection = {
      restrictedPreference: false,
      hasIdentifier: false,
      ethicsCompliance: false,
      publiclyAvailable: false,
      microbialAnalysis: false,
    }
    for (const urlName of accessRaw.split(",")) {
      const flag = URL_NAME_TO_ACCESS_FLAG[urlName]
      if (flag !== undefined) {
        section[flag] = true
      }
    }
    accessSection = section
  }

  const entries: UrlEntry[] = []
  for (const token of params.getAll("entry")) {
    const parsed = parseEntryToken(token)
    if (parsed !== null) entries.push(parsed)
  }
  const groups: UrlGroup[] = []
  for (const token of params.getAll("group")) {
    const parsed = parseGroupToken(token)
    if (parsed !== null) groups.push(parsed)
  }

  for (const e of entries) {
    if (e.groupIndex !== null && (e.groupIndex < 0 || e.groupIndex >= groups.length)) {
      e.groupIndex = null
    }
  }
  for (const g of groups) {
    g.memberEntryIndices = g.memberEntryIndices.filter((i) => i < entries.length)
    g.linkedGroupIndices = g.linkedGroupIndices.filter((i) => i < groups.length)
  }

  return { organismDomain, accessSection, entries, groups }
}

export const writeSubmitParams = (state: SubmitUrlState): URLSearchParams => {
  const params = new URLSearchParams()
  if (state.organismDomain !== null) params.set("organism-domain", state.organismDomain)
  if (state.accessSection !== null && !accessSectionEquals(state.accessSection, DEFAULT_URL_ACCESS_SECTION)) {
    const section = state.accessSection
    const onFlags = ACCESS_FLAGS.filter((flag) => section[flag])
    params.set("access", onFlags.map((flag) => ACCESS_FLAG_URL_NAME[flag]).join(","))
  }
  for (const e of state.entries) params.append("entry", stringifyEntry(e))
  for (const g of state.groups) params.append("group", stringifyGroup(g))

  return params
}

export const submitParamsSearchString = (state: SubmitUrlState): string => {
  const s = writeSubmitParams(state).toString()

  return s === "" ? "" : `?${s}`
}
