import { fileURLToPath } from "node:url"

import { createServer } from "vite"

type ValidateResult = {
  ok: boolean
  errors?: { filepath: string; error: unknown }[]
}

type LoaderModule = {
  validateAllDatabases: () => ValidateResult
  validateAllServices: () => ValidateResult
}

const main = async (): Promise<void> => {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  })
  let hasFailure = false
  try {
    const mod = (await vite.ssrLoadModule(
      fileURLToPath(new URL("../app/lib/content/loader.ts", import.meta.url)),
    )) as LoaderModule

    const databaseResult = mod.validateAllDatabases()
    if (!databaseResult.ok) {
      hasFailure = true
      for (const e of databaseResult.errors ?? []) {
        console.error("Database content validation failed", e.filepath, e.error)
      }
    }

    const serviceResult = mod.validateAllServices()
    if (!serviceResult.ok) {
      hasFailure = true
      for (const e of serviceResult.errors ?? []) {
        console.error("Service content validation failed", e.filepath, e.error)
      }
    }
  } finally {
    await vite.close()
  }
  if (hasFailure) {
    process.exit(1)
  }
}

void main()
