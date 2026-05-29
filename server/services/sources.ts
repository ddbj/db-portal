import path from "node:path"

import type { ServiceSource } from "../../app/schemas/api-bff/service"

export const DDBJ_BASE_URL = "https://www.ddbj.nig.ac.jp"

/** featuredTop となる DDBJ サービスの `name` 完全一致 whitelist (BP / BS / Trad / JGA / DRA / GEA / MetaboBank / jVar)。 */
export const DDBJ_FEATURED_NAMES: ReadonlySet<string> = new Set([
  "BioProject",
  "BioSample",
  "DDBJ",
  "JGA",
  "DRA",
  "GEA",
  "MetaboBank",
  "TogoVar-repository",
])

/** featuredTop となる DBCLS サービスは `services_name_en` がこの prefix で始まるもの。 */
export const DBCLS_FEATURED_PREFIX = "Togo"

/**
 * DBCLS の upstream 表示名を portal 側で上書きするマップ (key = upstream の `services_name_en`)。
 * upstream の名前が冗長 / 和名表記のものを簡潔な表示名に揃える。
 */
export const DBCLS_NAME_OVERRIDES: Readonly<Record<string, { ja: string; en: string }>> = {
  "TogoDX/human": { ja: "TogoDX", en: "TogoDX" },
  TogoTV: { ja: "TogoTV", en: "TogoTV" },
}

export type ServiceSourceFile = {
  source: ServiceSource
  /** localDir からの相対パスを解決した、データファイルの絶対パス。 */
  filePath: (localDir: string) => string
}

export const ddbjSourceFile: ServiceSourceFile = {
  source: "ddbj",
  filePath: (localDir) => path.join(localDir, "_data/services.yml"),
}

export const dbclsSourceFile: ServiceSourceFile = {
  source: "dbcls",
  filePath: (localDir) => path.join(localDir, "json/services.json"),
}

export const sourceFileFor = (source: ServiceSource): ServiceSourceFile =>
  source === "ddbj" ? ddbjSourceFile : dbclsSourceFile
