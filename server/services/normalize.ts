import yaml from "js-yaml"
import { z } from "zod"

import type { ServiceCategory, ServiceItem } from "../../app/schemas/api-bff/service"
import type { Logger } from "../lib/log"
import {
  DBCLS_FEATURED_PREFIX,
  DBCLS_NAME_OVERRIDES,
  DDBJ_BASE_URL,
  DDBJ_FEATURED_NAMES,
} from "./sources"

// DDBJ services.yml の `tags` → ServiceCategory。未収載の tag は写像しない。
const DDBJ_TAG_MAP: Readonly<Record<string, ServiceCategory>> = {
  database: "repository",
  submission: "repository",
  search: "search",
  analysis: "analysis",
  annotation: "analysis",
}

// DBCLS services.json の Category_N → ServiceCategory。domain 軸 (3/4/5/7) は写像しない。
const DBCLS_CATEGORY_MAP: readonly {
  key: string
  label: string
  category?: ServiceCategory
}[] = [
  { key: "Category_1", label: "Database integration", category: "integration" },
  { key: "Category_2", label: "Materials", category: "visualization" },
  { key: "Category_3", label: "Genome" },
  { key: "Category_4", label: "Gene" },
  { key: "Category_5", label: "Gene expression" },
  { key: "Category_6", label: "NGS", category: "analysis" },
  { key: "Category_7", label: "Disease" },
  { key: "Category_8", label: "Natural language processing", category: "analysis" },
  { key: "Category_9", label: "SPARQL Search", category: "search" },
  { key: "Category_10", label: "RDF creation", category: "integration" },
]

// DBCLS の Category_N ベース自動分類では実態と合わないサービスを個別に上書きする。
// key は itemId("dbcls", nameEn) の結果と一致させる。
const DBCLS_CATEGORY_OVERRIDES: Readonly<Record<string, ServiceCategory[]>> = {
  "dbcls-nbdc-human-database": ["repository"],
  "dbcls-pubannotation": ["repository"],
  "dbcls-pubdictionaries": ["repository"],
  "dbcls-togovar": ["repository"],
  "dbcls-allie": ["search"],
  "dbcls-colil": ["search"],
  "dbcls-inmexes": ["search"],
  "dbcls-gggenome": ["search"],
  "dbcls-ggrna": ["search"],
  "dbcls-pubcasefinder": ["search"],
  "dbcls-refex": ["search"],
  "dbcls-lsd-rdf-data-portal": ["integration"],
  "dbcls-togogenome": ["integration"],
  "dbcls-nanbyodata-nando": ["integration"],
  "dbcls-crisprdirect": ["analysis"],
  "dbcls-togoimputation": ["analysis"],
  "dbcls-sparql-proxy": ["integration"],
  "dbcls-togostanza": ["visualization"],
  "dbcls-umakaviewer": ["visualization"],
}

const truthy = (value: unknown): boolean =>
  value === true
  || (typeof value === "string" && ["true", "1"].includes(value.trim().toLowerCase()))

const stripHtml = (value: string): string =>
  value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()

export const nameSlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

export const itemId = (source: ServiceItem["source"], name: string): string =>
  `${source}-${nameSlug(name)}`

const HTTP_SCHEMES = new Set(["http:", "https:"])

// Mirrored source content is only semi-trusted: a `javascript:`/`data:` href would
// pass `new URL()` and reach an <a href> in the client, so allow only http(s).
const safeHttpUrl = (candidate: string): string | undefined => {
  try {
    const url = new URL(candidate)

    return HTTP_SCHEMES.has(url.protocol) ? url.toString() : undefined
  } catch {
    return undefined
  }
}

export const absolutizeDdbjUrl = (href: string): string | undefined => {
  const trimmed = href.trim()
  if (trimmed === "") return undefined
  const candidate = trimmed.startsWith("/") ? `${DDBJ_BASE_URL}${trimmed}` : trimmed

  return safeHttpUrl(candidate)
}

const dedupeCategories = (categories: ServiceCategory[]): ServiceCategory[] => {
  const seen = new Set<ServiceCategory>()
  const result: ServiceCategory[] = []
  for (const category of categories) {
    if (seen.has(category)) continue
    seen.add(category)
    result.push(category)
  }

  return result.length > 0 ? result : ["other"]
}

/** DDBJ services.yml の tags を ServiceCategory[] に写像する (dedupe、空なら ["other"])。 */
export const ddbjTagsToCategories = (tags: readonly string[]): ServiceCategory[] =>
  dedupeCategories(
    tags
      .map((tag) => tag.trim().toLowerCase())
      .map((key) => (Object.hasOwn(DDBJ_TAG_MAP, key) ? DDBJ_TAG_MAP[key] : undefined))
      .filter((category): category is ServiceCategory => category !== undefined),
  )

/** DBCLS services.json の 1 行から categories (dedupe、空なら ["other"]) と原ラベルを取り出す。 */
export const dbclsCategoriesFrom = (
  raw: Record<string, unknown>,
): { categories: ServiceCategory[]; rawCategories: string[] } => {
  const categories: ServiceCategory[] = []
  const rawCategories: string[] = []
  for (const mapping of DBCLS_CATEGORY_MAP) {
    if (!truthy(raw[mapping.key])) continue
    rawCategories.push(mapping.label)
    if (mapping.category) categories.push(mapping.category)
  }

  return { categories: dedupeCategories(categories), rawCategories }
}

const dedupeById = (items: ServiceItem[], logger: Logger): ServiceItem[] => {
  const byId = new Map<string, ServiceItem>()
  for (const item of items) {
    if (byId.has(item.id)) {
      logger.warn("services_duplicate_id", { id: item.id, source: item.source })
      continue
    }
    byId.set(item.id, item)
  }

  return [...byId.values()]
}

const langValue = (value: string | undefined): string =>
  value === undefined ? "" : stripHtml(value)

const DdbjLang = z
  .object({ en: z.string().optional(), ja: z.string().optional() })
  .partial()
  .optional()

const DdbjServiceRaw = z
  .object({
    name: z.string(),
    formal_name: z.string().optional(),
    provider: z.string().optional(),
    service_link: DdbjLang,
    description: DdbjLang,
    tags: z.array(z.string()).optional(),
  })
  .passthrough()

const DdbjYaml = z
  .object({ items: z.array(z.unknown()).default([]) })
  .passthrough()

export const normalizeDdbjServices = (yamlText: string, logger: Logger): ServiceItem[] => {
  let parsed: unknown
  try {
    parsed = yaml.load(yamlText, { schema: yaml.JSON_SCHEMA })
  } catch (error) {
    logger.warn("services_ddbj_yaml_parse_failed", {
      message: error instanceof Error ? error.message : String(error),
    })

    return []
  }
  const doc = DdbjYaml.safeParse(parsed)
  if (!doc.success) {
    logger.warn("services_ddbj_schema_mismatch", { issues: doc.error.issues.length })

    return []
  }

  const items: ServiceItem[] = []
  for (const rawItem of doc.data.items) {
    const raw = DdbjServiceRaw.safeParse(rawItem)
    if (!raw.success) continue
    const entry = raw.data
    if (entry.provider !== "DDBJ") continue

    const tags = entry.tags ?? []
    const categories = ddbjTagsToCategories(tags)
    const url = {
      ...(entry.service_link?.ja
        ? { ja: absolutizeDdbjUrl(entry.service_link.ja) }
        : {}),
      ...(entry.service_link?.en
        ? { en: absolutizeDdbjUrl(entry.service_link.en) }
        : {}),
    }
    const hasUrl = url.ja !== undefined || url.en !== undefined

    items.push({
      id: itemId("ddbj", entry.name),
      source: "ddbj",
      name: { ja: entry.name, en: entry.name },
      description: {
        ja: langValue(entry.description?.ja),
        en: langValue(entry.description?.en),
      },
      ...(hasUrl ? { url } : {}),
      categories,
      rawCategories: tags,
      featuredTop: DDBJ_FEATURED_NAMES.has(entry.name),
      provider: entry.provider,
    })
  }

  return dedupeById(items, logger)
}

const DbclsServiceRaw = z
  .object({
    services_name_ja: z.string().optional(),
    services_name_en: z.string().optional(),
    URL: z.string().optional(),
    explanation_ja: z.string().optional(),
    explanation_en: z.string().optional(),
    掲載: z.unknown(),
  })
  .passthrough()

export const normalizeDbclsServices = (jsonText: string, logger: Logger): ServiceItem[] => {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch (error) {
    logger.warn("services_dbcls_json_parse_failed", {
      message: error instanceof Error ? error.message : String(error),
    })

    return []
  }
  if (!Array.isArray(parsed)) {
    logger.warn("services_dbcls_not_array", {})

    return []
  }

  const items: ServiceItem[] = []
  // data[0] は Category ラベルを保持するヘッダ行。
  for (const rawItem of parsed.slice(1)) {
    const raw = DbclsServiceRaw.safeParse(rawItem)
    if (!raw.success) continue
    const entry = raw.data
    if (!truthy(entry.掲載)) continue
    const nameEnRaw = (entry.services_name_en ?? "").trim()
    if (nameEnRaw === "") {
      logger.warn("services_dbcls_missing_name_en", {})
      continue
    }
    const override = DBCLS_NAME_OVERRIDES[nameEnRaw]
    const nameEn = override?.en ?? nameEnRaw
    const nameJa = override?.ja ?? ((entry.services_name_ja ?? "").trim() || nameEn)

    const id = itemId("dbcls", override?.en ?? nameEnRaw)
    const { categories: autoCategories, rawCategories } = dbclsCategoriesFrom(
      rawItem as Record<string, unknown>,
    )
    const overridden = DBCLS_CATEGORY_OVERRIDES[id]
    const categories = overridden ?? autoCategories

    const href = entry.URL?.trim()
    let url: { ja?: string; en?: string } | undefined
    if (href) {
      const normalized = safeHttpUrl(href)
      url = normalized ? { ja: normalized, en: normalized } : undefined
    }

    items.push({
      id,
      source: "dbcls",
      name: { ja: nameJa, en: nameEn },
      description: {
        ja: langValue(entry.explanation_ja),
        en: langValue(entry.explanation_en),
      },
      ...(url ? { url } : {}),
      categories,
      rawCategories,
      featuredTop: nameEn.startsWith(DBCLS_FEATURED_PREFIX),
    })
  }

  return dedupeById(items, logger)
}
