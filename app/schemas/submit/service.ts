import { z } from "zod"

// 登録先・導出物・外部誘導を表す単一 enum。各値は role を持つ
export const Service = z.enum([
  "bioproject",
  "biosample",
  "dra",
  "jga",
  "ddbj-trad",
  "nsss",
  "togovar",
  "gea",
  "metabobank",
  "humandbs",
  "jpost",
  "eva",
])
export type Service = z.infer<typeof Service>

export const ServiceRole = z.enum(["destination", "companion", "external"])
export type ServiceRole = z.infer<typeof ServiceRole>

export const SERVICE_ROLE: Readonly<Record<Service, ServiceRole>> = {
  "bioproject": "companion",
  "biosample": "companion",
  "dra": "destination",
  "jga": "destination",
  "ddbj-trad": "destination",
  "nsss": "destination",
  "togovar": "destination",
  "gea": "destination",
  "metabobank": "destination",
  "humandbs": "external",
  "jpost": "external",
  "eva": "external",
}

export const serviceRole = (service: Service): ServiceRole => SERVICE_ROLE[service]

const byRole = (role: ServiceRole): readonly Service[] =>
  Service.options.filter((s) => SERVICE_ROLE[s] === role)

// role=destination の service 部分集合 (カスケードの q1/q2 repos が参照する DDBJ 内登録先集合)
export const DESTINATION_SERVICES: readonly Service[] = byRole("destination")
export const COMPANION_SERVICES: readonly Service[] = byRole("companion")
export const EXTERNAL_SERVICES: readonly Service[] = byRole("external")

// 登録エンドポイント = 利用者データの最終格納先。DDBJ 内 (destination) に加え、
// 最終格納先が DDBJ 外になる external (jpost = proteomics / eva = 非ヒト variant) も含む。
// humandbs は Policy 申請・承認の誘導であって格納先ではないため含めない。
// emit.service / candidateRepos / no-orphan 判定はこの集合を境界に使う。
const ENDPOINT_EXTERNALS: readonly Service[] = ["jpost", "eva"]
export const SUBMISSION_ENDPOINTS: readonly Service[] = [
  ...DESTINATION_SERVICES,
  ...ENDPOINT_EXTERNALS,
]

const DESTINATION_SET: ReadonlySet<Service> = new Set(DESTINATION_SERVICES)
const COMPANION_SET: ReadonlySet<Service> = new Set(COMPANION_SERVICES)
const EXTERNAL_SET: ReadonlySet<Service> = new Set(EXTERNAL_SERVICES)
const ENDPOINT_SET: ReadonlySet<Service> = new Set(SUBMISSION_ENDPOINTS)

export const isDestinationService = (service: Service): boolean =>
  DESTINATION_SET.has(service)

export const isCompanionService = (service: Service): boolean =>
  COMPANION_SET.has(service)

export const isExternalService = (service: Service): boolean =>
  EXTERNAL_SET.has(service)

export const isSubmissionEndpoint = (service: Service): boolean =>
  ENDPOINT_SET.has(service)

// 役割タグの表示キー。external のうち登録エンドポイント (jpost/eva) は「外部登録先」、
// エンドポイントでない前提ゲート (humandbs) は「申請窓口」として表示語を分ける。
type ServiceRoleTagKey = ServiceRole | "gate"
export const serviceRoleTagKey = (service: Service): ServiceRoleTagKey => {
  const role = SERVICE_ROLE[service]
  if (role !== "external") return role

  return isSubmissionEndpoint(service) ? "external" : "gate"
}

export const ServiceBadgeColor = z.enum(["emerald", "amber", "rose"])
export type ServiceBadgeColor = z.infer<typeof ServiceBadgeColor>

type ServiceBadgeInput = {
  service: Service
  hasWarningOrError: boolean
}

export const serviceBadgeColor = ({
  service,
  hasWarningOrError,
}: ServiceBadgeInput): ServiceBadgeColor => {
  if (hasWarningOrError) return "rose"
  if (serviceRole(service) === "external") return "amber"

  return "emerald"
}

// service 間の前提関係 (前提 → 依存先)。カード順序の依存順と「先に済ませること」の両方を駆動する。
// companion (bioproject/biosample) は destination の前提、humandbs (Policy ゲート) は jga の前提、
// dra は gea (sequencing 2 段) / ddbj-trad (MAG) の前提。jga は companion を抑制するので bioproject/biosample に依存しない。
export const SERVICE_DEPENDENCIES: Readonly<Record<Service, readonly Service[]>> = {
  "bioproject": [],
  "biosample": [],
  "humandbs": [],
  "jpost": [],
  "dra": ["bioproject", "biosample"],
  "jga": ["humandbs"],
  "ddbj-trad": ["bioproject", "biosample", "dra"],
  "nsss": ["bioproject", "biosample"],
  "togovar": ["bioproject", "biosample"],
  "gea": ["bioproject", "biosample", "dra"],
  "metabobank": ["bioproject", "biosample"],
  "eva": ["bioproject", "biosample"],
}

// SERVICE_DEPENDENCIES のトポロジカル順を実現する線形順 (前提が依存先より前)。
// 前提ゲート (humandbs) → 共通メタデータ (bioproject → biosample) → 一次データ (dra) → 主登録先 → 外部リポジトリ (jpost/eva)。
// SERVICE_DEPENDENCIES の妥当な線形拡張であることは PBT/unit で固定する。
export const SERVICE_DEPENDENCY_ORDER: readonly Service[] = [
  "humandbs",
  "bioproject",
  "biosample",
  "dra",
  "jga",
  "ddbj-trad",
  "nsss",
  "togovar",
  "gea",
  "metabobank",
  "jpost",
  "eva",
]

// あるステップの前提 service のうち、当該フローに実在するものだけを依存順で返す。
// カードの「先に済ませること」に使う。
export const stepPrerequisites = (
  service: Service,
  presentServices: Iterable<Service>,
): readonly Service[] => {
  const present = new Set(presentServices)
  return (SERVICE_DEPENDENCIES[service] ?? []).filter((dep) => present.has(dep))
}
