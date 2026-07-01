import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const CONTENT_ROOT = path.join(REPO_ROOT, "page-contents")
const OUT_DIR = path.join(REPO_ROOT, "app/lib/content/gen")
const OUT_FILE = path.join(OUT_DIR, "breadcrumb-titles.json")

type Lang = "ja" | "en"
type Entry = { ja?: string; en?: string }
type EntryMap = Record<string, Entry>

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/
const TITLE_LINE_RE = /^title:\s*(.+)$/
const QUOTE_STRIP_RE = /^["'](.+)["']$/

const extractTitle = (raw: string): string | undefined => {
  const m = raw.match(FRONTMATTER_RE)
  if (!m) return undefined
  const yaml = m[1] ?? ""
  for (const line of yaml.split("\n")) {
    const kv = line.match(TITLE_LINE_RE)
    if (kv && kv[1] !== undefined) {
      return kv[1].trim().replace(QUOTE_STRIP_RE, "$1")
    }
  }

  return undefined
}

const FILE_TO_LANG = (filename: string): Lang | undefined => {
  if (filename.endsWith(".en.md")) return "en"
  if (filename.endsWith(".md")) return "ja"

  return undefined
}

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
    const raw = await fs.readFile(file, "utf-8")
    const title = extractTitle(raw)
    if (title === undefined) continue
    const entry = map[urlPath] ?? {}
    entry[lang] = title
    map[urlPath] = entry
  }

  await fs.mkdir(OUT_DIR, { recursive: true })
  const sortedEntries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  const sorted: EntryMap = Object.fromEntries(sortedEntries)
  await fs.writeFile(OUT_FILE, `${JSON.stringify(sorted, null, 2)}\n`, "utf-8")

  const pageCount = sortedEntries.length
  console.log(`gen:breadcrumb-titles: wrote ${pageCount} page entries to ${path.relative(REPO_ROOT, OUT_FILE)}`)
}

void main()
