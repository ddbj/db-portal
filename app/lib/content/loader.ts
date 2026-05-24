import { type z, type ZodTypeAny } from "zod"

import { DatabaseContent } from "~/schemas/content/database-content"

import type {
  Collection,
  DatabaseCollection,
  ValidationFailure,
  ValidationResult,
} from "./types"

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
  "/app/content/databases/**/*.content.ts",
  { eager: true },
)

const databaseResult = collectFromModules(DatabaseContent, databaseModules)
if (!databaseResult.ok) {
  throw new Error(
    `Database content validation failed:\n\n${formatValidationErrors(databaseResult.errors)}`,
  )
}

const items: DatabaseCollection[] = databaseResult.items
const bySlug = new Map(items.map((i) => [i.content.slug, i.content]))

export const getDatabaseBySlug = (slug: string): DatabaseContent | undefined =>
  bySlug.get(slug)

export const listDatabases = (): readonly DatabaseContent[] =>
  items.map((i) => i.content)

export const validateAllDatabases = (): ValidationResult<DatabaseContent> =>
  collectFromModules(DatabaseContent, databaseModules)
