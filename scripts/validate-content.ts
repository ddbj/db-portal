import { fileURLToPath } from "node:url"

import { createServer } from "vite"

type ValidateResult = {
  ok: boolean
  errors?: { filepath: string; error: unknown }[]
}

type LoaderModule = {
  validateAllServices: () => ValidateResult
}

type MarkdownLoaderModule = {
  validateAllPages: () => ValidateResult
}

type CatalogModule = {
  validateSubmitRouting: () => { success: boolean; error?: { issues: { path: (string | number)[]; message: string }[] } }
}

type SitemapLoaderModule = {
  validateSitemap: () => {
    ok: boolean
    errors?: { filepath: string; message: string }[]
  }
}

const main = async (): Promise<void> => {
  const vite = await createServer({
    configFile: false,
    server: { middlewareMode: true },
    appType: "custom",
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "react",
      jsxDev: process.env.NODE_ENV !== "production",
    },
    resolve: {
      alias: {
        "~": fileURLToPath(new URL("../app", import.meta.url)),
      },
    },
  })
  let hasFailure = false
  try {
    try {
      const mod = (await vite.ssrLoadModule(
        fileURLToPath(new URL("../app/lib/content/loader.ts", import.meta.url)),
      )) as LoaderModule

      const serviceResult = mod.validateAllServices()
      if (!serviceResult.ok) {
        hasFailure = true
        for (const e of serviceResult.errors ?? []) {
          console.error("Service content validation failed", e.filepath, e.error)
        }
      }
    } catch (e) {
      hasFailure = true
      console.error("Service content validation failed", e)
    }

    try {
      const markdownMod = (await vite.ssrLoadModule(
        fileURLToPath(new URL("../app/lib/content/markdown-loader.ts", import.meta.url)),
      )) as MarkdownLoaderModule
      const pageResult = markdownMod.validateAllPages()
      if (!pageResult.ok) {
        hasFailure = true
        for (const e of pageResult.errors ?? []) {
          console.error("Page content validation failed", e.filepath, e.error)
        }
      }
    } catch (e) {
      hasFailure = true
      console.error("Page content validation failed", e)
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

    try {
      const sitemapMod = (await vite.ssrLoadModule(
        fileURLToPath(new URL("../app/lib/content/sitemap-loader.ts", import.meta.url)),
      )) as SitemapLoaderModule
      const sitemapResult = sitemapMod.validateSitemap()
      if (!sitemapResult.ok) {
        hasFailure = true
        for (const e of sitemapResult.errors ?? []) {
          console.error("Sitemap validation failed", e.filepath, e.message)
        }
      }
    } catch (e) {
      hasFailure = true
      console.error("Sitemap validation failed", e)
    }
  } finally {
    await vite.close()
  }
  if (hasFailure) {
    process.exit(1)
  }
}

void main()
