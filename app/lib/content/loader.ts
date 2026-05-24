import { type z, type ZodTypeAny } from "zod"

import { DatabaseContent } from "~/schemas/content/database-content"
import { ServiceContent, type ServiceTopCategory } from "~/schemas/content/service-content"
import type { Service as SubmitService } from "~/schemas/submit"

import type {
  Collection,
  DatabaseCollection,
  ServiceCollection,
  ValidationFailure,
  ValidationResult,
} from "./types"

export type { ServiceTopCategory } from "~/schemas/content/service-content"

type WithMatchingTop<C extends ServiceTopCategory> = ServiceContent & {
  top: Extract<NonNullable<ServiceContent["top"]>, { category: C }>
}

type ModuleRecord = Record<string, { default: unknown }>

export const collectFromModules = <S extends ZodTypeAny>(
  schema: S,
  modules: ModuleRecord,
): ValidationResult<z.infer<S>> => {
  const items: Collection<z.infer<S>>[] = []
  const errors: ValidationFailure[] = []
  for (const [filepath, mod] of Object.entries(modules)) {
    const parsed = schema.safeParse(mod.default)
    if (parsed.success) {
      items.push({ filepath, content: parsed.data })
    } else {
      errors.push({ filepath, error: parsed.error })
    }
  }
  if (errors.length > 0) return { ok: false, errors }

  return { ok: true, items }
}

const formatValidationFailure = (failure: ValidationFailure): string => {
  const messages = failure.error.issues.map((issue) => {
    const path = issue.path.join(".") || "<root>"

    return `  ${path}: ${issue.message}`
  })

  return `${failure.filepath}\n${messages.join("\n")}`
}

export const formatValidationErrors = (errors: ValidationFailure[]): string =>
  errors.map(formatValidationFailure).join("\n\n")

const databaseModules = import.meta.glob<{ default: unknown }>(
  "/app/content/databases/**/*.content.tsx",
  { eager: true },
)
const serviceModules = import.meta.glob<{ default: unknown }>(
  "/app/content/services/**/*.content.tsx",
  { eager: true },
)

const databaseResult = collectFromModules(DatabaseContent, databaseModules)
if (!databaseResult.ok) {
  throw new Error(
    `Database content validation failed:\n\n${formatValidationErrors(databaseResult.errors)}`,
  )
}
const serviceResult = collectFromModules(ServiceContent, serviceModules)
if (!serviceResult.ok) {
  throw new Error(
    `Service content validation failed:\n\n${formatValidationErrors(serviceResult.errors)}`,
  )
}

const databases: DatabaseCollection[] = databaseResult.items
const services: ServiceCollection[] = serviceResult.items

const databaseBySlug = new Map(databases.map((i) => [i.content.slug, i.content]))
const serviceById = new Map(services.map((i) => [i.content.id, i.content]))
const serviceBySubmit = new Map<SubmitService, ServiceContent>()
for (const item of services) {
  const submit = item.content.submit
  if (submit === undefined) continue
  const existing = serviceBySubmit.get(submit.service)
  if (existing !== undefined) {
    throw new Error(
      `Duplicate submit service mapping: "${submit.service}" is declared by both `
        + `"${existing.id}" and "${item.content.id}"`,
    )
  }
  serviceBySubmit.set(submit.service, item.content)
}

export const getDatabaseBySlug = (slug: string): DatabaseContent | undefined =>
  databaseBySlug.get(slug)

export const listDatabases = (): readonly DatabaseContent[] =>
  databases.map((i) => i.content)

export const validateAllDatabases = (): ValidationResult<DatabaseContent> =>
  collectFromModules(DatabaseContent, databaseModules)

export const getServiceById = (id: string): ServiceContent | undefined =>
  serviceById.get(id)

export const listServices = (): readonly ServiceContent[] =>
  services.map((i) => i.content)

export const listServicesByTopCategory = <C extends ServiceTopCategory>(
  category: C,
): readonly WithMatchingTop<C>[] =>
  services
    .map((i) => i.content)
    .filter((s): s is WithMatchingTop<C> => s.top?.category === category)
    .sort((a, b) => a.top.order - b.top.order)

export const getServiceBySubmit = (service: SubmitService): ServiceContent | undefined =>
  serviceBySubmit.get(service)

export const validateAllServices = (): ValidationResult<ServiceContent> =>
  collectFromModules(ServiceContent, serviceModules)
