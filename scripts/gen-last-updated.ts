import { execFileSync } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const CONTENT_ROOT = path.join(REPO_ROOT, "page-contents")
const OUT_DIR = path.join(REPO_ROOT, "app/lib/content/gen")
const OUT_FILE = path.join(OUT_DIR, "last-updated.json")

type Lang = "ja" | "en"
type Entry = Partial<Record<Lang, string>>
type EntryMap = Record<string, Entry>

const FILE_TO_LANG = (filename: string): Lang | undefined => {
  if (filename.endsWith(".en.md")) return "en"
  if (filename.endsWith(".md")) return "ja"

  return undefined
}

const getLastCommitTimestamp = (absPath: string): string | undefined => {
  try {
    const rel = path.relative(REPO_ROOT, absPath)
    const out = execFileSync(
      "git",
      ["-c", "safe.directory=*", "log", "--follow", "-1", "--format=%cI", "--", rel],
      {
        cwd: REPO_ROOT,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    ).trim()

    return out || undefined
  } catch {
    return undefined
  }
}

// `index.md` / `index.en.md` は親 dir を URL とし、それ以外の `<name>.md` /
// `<name>.en.md` はファイル名 `<name>` を最後の segment とする。markdown-loader
// の URL 抽出と一致させること。
const toUrlPath = (absMdFile: string): string => {
  const rel = path.relative(CONTENT_ROOT, absMdFile)
  const stripped = rel
    .replace(/[\\/]index\.en\.md$/, "")
    .replace(/[\\/]index\.md$/, "")
    .replace(/\.en\.md$/, "")
    .replace(/\.md$/, "")
  const segments = stripped.split(path.sep).filter(Boolean)

  return `/${segments.join("/")}`
}

const walkContentFiles = async (root: string): Promise<string[]> => {
  const out: string[] = []
  const visit = async (dir: string): Promise<void> => {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const abs = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await visit(abs)
        continue
      }
      if (!entry.isFile()) continue
      if (FILE_TO_LANG(entry.name) === undefined) continue
      out.push(abs)
    }
  }
  await visit(root)

  return out
}

const main = async (): Promise<void> => {
  const files = await walkContentFiles(CONTENT_ROOT)
  const map: EntryMap = {}
  for (const file of files) {
    const lang = FILE_TO_LANG(path.basename(file))
    if (lang === undefined) continue
    const urlPath = toUrlPath(file)
    const iso = getLastCommitTimestamp(file)
    if (iso === undefined) continue
    const entry = map[urlPath] ?? {}
    entry[lang] = iso
    map[urlPath] = entry
  }

  await fs.mkdir(OUT_DIR, { recursive: true })
  const sortedEntries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  const sorted: EntryMap = Object.fromEntries(sortedEntries)
  await fs.writeFile(OUT_FILE, `${JSON.stringify(sorted, null, 2)}\n`, "utf-8")

  const pageCount = sortedEntries.length
  console.log(`gen:last-updated: wrote ${pageCount} page entries to ${path.relative(REPO_ROOT, OUT_FILE)}`)
}

void main()
