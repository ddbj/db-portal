import { execFileSync } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { createServer } from "vite"

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const DATABASES_DIR = path.join(REPO_ROOT, "app/content/databases")
const CONTENT_FILE = "index.content.tsx"
const STALE_THRESHOLD_DAYS = 30
const MS_PER_DAY = 1000 * 60 * 60 * 24

type LoaderModule = {
  listDatabases: () => readonly {
    slug: string
    meta: { lastUpdated: string }
  }[]
}

const listSlugDirs = async (): Promise<Map<string, string>> => {
  const entries = await fs.readdir(DATABASES_DIR, { withFileTypes: true })
  const result = new Map<string, string>()
  for (const e of entries) {
    if (!e.isDirectory()) continue
    result.set(e.name, path.join("app/content/databases", e.name, CONTENT_FILE))
  }

  return result
}

const getLastCommitTimestamp = (relPath: string): string | undefined => {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", relPath], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim()

    return out || undefined
  } catch {
    return undefined
  }
}

const daysBetween = (laterIso: string, earlierIso: string): number => {
  const diff = Date.parse(laterIso) - Date.parse(earlierIso)
  if (!Number.isFinite(diff)) return Number.NaN

  return Math.floor(diff / MS_PER_DAY)
}

const main = async (): Promise<void> => {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  })
  let staleCount = 0
  try {
    const mod = (await vite.ssrLoadModule(
      path.join(REPO_ROOT, "app/lib/content/loader.ts"),
    )) as LoaderModule

    const slugDirs = await listSlugDirs()
    for (const db of mod.listDatabases()) {
      const relPath = slugDirs.get(db.slug)
      if (relPath === undefined) continue

      const committedIso = getLastCommitTimestamp(relPath)
      if (committedIso === undefined) continue

      const diffDays = daysBetween(committedIso, db.meta.lastUpdated)
      if (!Number.isFinite(diffDays)) continue

      if (diffDays >= STALE_THRESHOLD_DAYS) {
        staleCount += 1
        console.warn(
          `lastUpdated stale: ${db.slug}\n`
          + `  file:                 ${relPath}\n`
          + `  declared lastUpdated: ${db.meta.lastUpdated}\n`
          + `  latest commit:        ${committedIso}\n`
          + `  diff:                 ${diffDays} days (threshold ${STALE_THRESHOLD_DAYS})`,
        )
      }
    }
  } finally {
    await vite.close()
  }

  if (staleCount === 0) {
    console.log("lastUpdated check: all entries are fresh.")
  } else {
    console.warn(`lastUpdated check: ${staleCount} stale entry/ies (warning, not fatal).`)
  }
}

void main()
