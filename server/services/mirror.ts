import { readFile } from "node:fs/promises"

import type { ServiceList, ServiceSource } from "../../app/schemas/api-bff/service"
import type { ServerEnv } from "../lib/env"
import type { Logger } from "../lib/log"
import { type CacheStore, createCacheStore } from "./cache"
import { normalizeDbclsServices, normalizeDdbjServices } from "./normalize"
import { sourceFileFor } from "./sources"

let activeCache: CacheStore | undefined

export const getActiveServicesCache = (): CacheStore | undefined => activeCache

type ServicesMirror = {
  init: () => Promise<void>
  rebuildSource: (source: ServiceSource, localDir: string, sha: string) => Promise<void>
  cache: CacheStore
}

const normalizeFor = (
  source: ServiceSource,
  text: string,
  logger: Logger,
): ServiceList =>
  source === "ddbj"
    ? normalizeDdbjServices(text, logger)
    : normalizeDbclsServices(text, logger)

export const createServicesMirror = (env: ServerEnv, logger: Logger): ServicesMirror => {
  const cache = createCacheStore(env.DB_PORTAL_SERVICES_CACHE_DIR, logger)

  const init = async (): Promise<void> => {
    activeCache = cache
    await cache.initFromDisk()
  }

  const rebuildSource = async (
    source: ServiceSource,
    localDir: string,
    sha: string,
  ): Promise<void> => {
    if (sha === cache.getSyncShaForSource(source)) return
    const filePath = sourceFileFor(source).filePath(localDir)
    let text: string
    try {
      text = await readFile(filePath, "utf8")
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      logger.warn("services_source_read_failed", {
        source,
        filePath,
        code: code ?? "unknown",
      })

      return
    }
    const items = normalizeFor(source, text, logger)
    await cache.replaceItemsForSource(source, items, sha)
    logger.info("services_mirror_refresh", { source, items: items.length })
  }

  return { init, rebuildSource, cache }
}
