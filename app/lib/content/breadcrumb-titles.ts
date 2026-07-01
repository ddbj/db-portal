import titles from "./gen/breadcrumb-titles.json"

// Shell の Breadcrumb は全ルートに載るので、 unified pipeline を含む markdown-loader
// を参照してしまうと 800KB 級の chunk が landing に混ざる。 build 時に frontmatter
// title だけ抜いた軽量 JSON を precompute し、 lookup 用の薄いモジュールを用意する。
export type BreadcrumbTitleEntry = {
  ja?: string
  en?: string
}

const titleMap = titles as unknown as Record<string, BreadcrumbTitleEntry>

export const getBreadcrumbTitle = (
  urlPath: string,
  lang: "ja" | "en",
): string | undefined => {
  const entry = titleMap[urlPath]
  if (!entry) return undefined

  return lang === "en" && entry.en ? entry.en : entry.ja
}
