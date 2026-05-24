import { DatabaseContent } from "~/schemas/content/database-content"

import type { DatabaseCollection, ValidationFailure, ValidationResult } from "./types"

const databaseModules = import.meta.glob<{ default: unknown }>(
  "/app/content/databases/**/*.content.ts",
  { eager: true },
)

const collectDatabaseContents = (): ValidationResult<DatabaseContent> => {
  const items: DatabaseCollection[] = []
  const errors: ValidationFailure[] = []
  for (const [filepath, mod] of Object.entries(databaseModules)) {
    const parsed = DatabaseContent.safeParse(mod.default)
    if (parsed.success) {
      items.push({ filepath, content: parsed.data })
    } else {
      errors.push({ filepath, error: parsed.error })
    }
  }
  if (errors.length > 0) return { ok: false, errors }

  return { ok: true, items }
}

const result = collectDatabaseContents()
const items: DatabaseCollection[] = result.ok ? result.items : []
const bySlug = new Map(items.map((i) => [i.content.slug, i.content]))

export const getDatabaseBySlug = (slug: string): DatabaseContent | undefined =>
  bySlug.get(slug)

export const listDatabases = (): readonly DatabaseContent[] =>
  items.map((i) => i.content)

export const validateAllDatabases = (): ValidationResult<DatabaseContent> =>
  collectDatabaseContents()
