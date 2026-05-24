import type { z } from "zod"

import type { DatabaseContent } from "~/schemas/content/database-content"
import type { ServiceContent } from "~/schemas/content/service-content"

export type Collection<T> = {
  filepath: string
  content: T
}

export type ValidationFailure = {
  filepath: string
  error: z.ZodError
}

export type ValidationResult<T> =
  | { ok: true; items: Collection<T>[] }
  | { ok: false; errors: ValidationFailure[] }

export type DatabaseCollection = Collection<DatabaseContent>
export type ServiceCollection = Collection<ServiceContent>
