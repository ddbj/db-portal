import type { Lang } from "~/lib/i18n"
import type { PageSourcePath } from "~/schemas/content/page-content"

export const REPO_URL = "https://github.com/ddbj/db-portal"
export const DEFAULT_BRANCH = "main"

const pickSourcePath = (sourcePath: PageSourcePath, lang: Lang): string =>
  lang === "en" ? sourcePath.en ?? sourcePath.ja : sourcePath.ja ?? sourcePath.en ?? sourcePath.ja

export const buildEditUrl = (sourcePath: PageSourcePath, lang: Lang): string => {
  const chosen = pickSourcePath(sourcePath, lang)

  return `${REPO_URL}/edit/${DEFAULT_BRANCH}/${chosen}`
}
