import { fileURLToPath } from "node:url"

import { createServer } from "vite"

const main = async (): Promise<void> => {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  })
  try {
    const mod = (await vite.ssrLoadModule(
      fileURLToPath(new URL("../app/lib/content/loader.ts", import.meta.url)),
    )) as { validateAllDatabases: () => { ok: boolean; errors?: { filepath: string; error: unknown }[] } }
    const result = mod.validateAllDatabases()
    if (!result.ok) {
      for (const e of result.errors ?? []) {
        console.error("Content validation failed", e.filepath, e.error)
      }
      process.exit(1)
    }
  } finally {
    await vite.close()
  }
}

void main()
