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

type CatalogModule = {
  validateSubmitRouting: () => { success: boolean; error?: { issues: { path: (string | number)[]; message: string }[] } }
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

    try {
      const catalog = (await vite.ssrLoadModule(
        fileURLToPath(new URL("../app/content/submit-routing/catalog.ts", import.meta.url)),
      )) as CatalogModule
      const routingResult = catalog.validateSubmitRouting()
      if (!routingResult.success) {
        hasFailure = true
        for (const issue of routingResult.error?.issues ?? []) {
          console.error("Submit routing catalog validation failed", issue.path.join("."), issue.message)
        }
      }
    } catch (e) {
      hasFailure = true
      console.error("Submit routing catalog validation failed", e)
    }
  } finally {
    await vite.close()
  }
  if (hasFailure) {
    process.exit(1)
  }
}

void main()
