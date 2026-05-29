import { z } from "zod"

// 登録先・導出物・外部誘導を表す単一 enum。各値は role を持つ
export const Service = z.enum([
  "bioproject",
  "biosample",
  "dra",
  "jga",
  "ddbj-trad",
  "togovar",
  "gea",
  "metabobank",
  "humandbs",
  "dbcls",
  "jpost",
  "eva",
  "dgva",
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
  "togovar": "destination",
  "gea": "destination",
  "metabobank": "destination",
  "humandbs": "external",
  "dbcls": "external",
  "jpost": "external",
  "eva": "external",
  "dgva": "external",
}

export const serviceRole = (service: Service): ServiceRole => SERVICE_ROLE[service]

const byRole = (role: ServiceRole): readonly Service[] =>
  Service.options.filter((s) => SERVICE_ROLE[s] === role)

// role=destination の service 部分集合 (candidateRepos / カスケードが参照する登録先集合)
export const DESTINATION_SERVICES: readonly Service[] = byRole("destination")
export const COMPANION_SERVICES: readonly Service[] = byRole("companion")
export const EXTERNAL_SERVICES: readonly Service[] = byRole("external")

const DESTINATION_SET: ReadonlySet<Service> = new Set(DESTINATION_SERVICES)
const COMPANION_SET: ReadonlySet<Service> = new Set(COMPANION_SERVICES)
const EXTERNAL_SET: ReadonlySet<Service> = new Set(EXTERNAL_SERVICES)

export const isDestinationService = (service: Service): boolean =>
  DESTINATION_SET.has(service)

export const isCompanionService = (service: Service): boolean =>
  COMPANION_SET.has(service)

export const isExternalService = (service: Service): boolean =>
  EXTERNAL_SET.has(service)

export const ServiceBadgeColor = z.enum(["emerald", "amber", "rose"])
export type ServiceBadgeColor = z.infer<typeof ServiceBadgeColor>

export type ServiceBadgeInput = {
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

// 出力整形の物理順: companion -> destination -> external
export const SERVICE_PHYSICAL_ORDER: readonly Service[] = [
  "bioproject",
  "biosample",
  "dra",
  "jga",
  "ddbj-trad",
  "togovar",
  "gea",
  "metabobank",
  "humandbs",
  "dbcls",
  "jpost",
  "eva",
  "dgva",
]
