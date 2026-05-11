import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"

import { NEWS_CACHE_SCHEMA_VERSION, type NewsSnapshot } from "./types"

const cacheDir = (): string => process.env.NEWS_CACHE_DIR ?? path.join(process.cwd(), "data")
const cachePath = (): string => path.join(cacheDir(), "news-cache.json")

let snapshot: NewsSnapshot | null = null

export const getSnapshot = (): NewsSnapshot | null => snapshot

export const setSnapshot = (next: NewsSnapshot): void => {
  snapshot = next
}

export const loadFromDisk = async (): Promise<NewsSnapshot | null> => {
  try {
    const raw = await readFile(cachePath(), "utf-8")
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
    const candidate = parsed as Partial<NewsSnapshot>
    if (candidate.schemaVersion !== NEWS_CACHE_SCHEMA_VERSION) return null
    if (!Array.isArray(candidate.items)) return null
    if (typeof candidate.builtAt !== "string") return null
    if (typeof candidate.sourceSha !== "string") return null
    if (!candidate.fileShas || typeof candidate.fileShas !== "object") return null
    snapshot = candidate as NewsSnapshot

    return snapshot
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null
    console.warn("[news-mirror] failed to load cache from disk:", err)

    return null
  }
}

export const persistToDisk = async (next: NewsSnapshot): Promise<void> => {
  const dir = cacheDir()
  await mkdir(dir, { recursive: true })
  const target = cachePath()
  const tmp = `${target}.tmp`
  await writeFile(tmp, JSON.stringify(next), "utf-8")
  await rename(tmp, target)
}
