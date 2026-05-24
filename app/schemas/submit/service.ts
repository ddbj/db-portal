import { z } from "zod"

export const Service = z.enum([
  "bioproject",
  "umbrella-bioproject",
  "biosample",
  "dra",
  "jga",
  "ddbj-mass",
  "annotation",
  "gea",
  "metabobank",
  "humandbs",
  "dbcls",
  "jpost",
  "eva",
  "dgva",
])
export type Service = z.infer<typeof Service>

export const INTERNAL_SERVICES: readonly Service[] = [
  "bioproject",
  "umbrella-bioproject",
  "biosample",
  "dra",
  "jga",
  "ddbj-mass",
  "annotation",
  "gea",
  "metabobank",
]

export const EXTERNAL_SERVICES: readonly Service[] = [
  "humandbs",
  "dbcls",
  "jpost",
  "eva",
  "dgva",
]

const INTERNAL_SET: ReadonlySet<Service> = new Set(INTERNAL_SERVICES)
const EXTERNAL_SET: ReadonlySet<Service> = new Set(EXTERNAL_SERVICES)

export const isInternalService = (service: Service): boolean =>
  INTERNAL_SET.has(service)

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
  if (isExternalService(service)) return "amber"
  return "emerald"
}

export const SERVICE_PHYSICAL_ORDER: readonly Service[] = [
  "umbrella-bioproject",
  "bioproject",
  "biosample",
  "dra",
  "jga",
  "annotation",
  "ddbj-mass",
  "gea",
  "metabobank",
  "humandbs",
  "dbcls",
  "jpost",
  "eva",
  "dgva",
]
