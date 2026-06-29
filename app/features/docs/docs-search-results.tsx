import { Link } from "react-router"

import { findNavPath, getNavTree } from "~/lib/content/content-tree"
import { getPageByPath } from "~/lib/content/markdown-loader"
import { searchContent, type SearchResult } from "~/lib/content/search-index"
import { formatDate, useLang, useT } from "~/lib/i18n"
import { Button, Mark } from "~/ui"
import { FileTextIcon, FolderIcon, HashIcon } from "~/ui/icons"

type Lang = "ja" | "en"

const pickIso = (urlPath: string, lang: Lang): string | undefined => {
  const page = getPageByPath(urlPath)
  const lu = page?.lastUpdated
  if (!lu) return undefined

  return lang === "en" ? lu.en ?? lu.ja : lu.ja ?? lu.en
}

const queryTerms = (q: string): string[] =>
  q.trim().split(/\s+/).filter(Boolean)

type GroupedResult = {
  pageUrlPath: string
  pageTitle: string
  primarySnippet: string
  bestSection?: SearchResult
}

// 同一ページの page hit と section hit を 1 行にまとめる。代表行のタイトル / スニペットは
// page hit を優先し、最良 section hit を h2 ピルとして添える。
const groupResults = (results: readonly SearchResult[]): GroupedResult[] => {
  const map = new Map<string, GroupedResult>()
  for (const r of results) {
    const existing = map.get(r.pageUrlPath)
    if (existing === undefined) {
      map.set(r.pageUrlPath, {
        pageUrlPath: r.pageUrlPath,
        pageTitle: r.pageTitle,
        primarySnippet: r.snippet,
        ...(r.kind === "section" ? { bestSection: r } : {}),
      })

      continue
    }
    if (r.kind === "page") {
      existing.primarySnippet = r.snippet
    } else if (
      existing.bestSection === undefined
      || r.score > existing.bestSection.score
    ) {
      existing.bestSection = r
    }
  }

  return Array.from(map.values())
}

const ResultIcon = ({ urlPath }: { urlPath: string }) => {
  const tree = getNavTree()
  const path = findNavPath(tree, urlPath)
  const node = path[path.length - 1]
  const isLikeDoc = node === undefined || node.children.length === 0
  const Icon = isLikeDoc ? FileTextIcon : FolderIcon

  return <Icon size={18} className="text-ink-soft shrink-0 self-center" aria-hidden />
}

type Props = {
  query: string
  onClear: () => void
}

export const DocsSearchResults = ({ query, onClear }: Props) => {
  const t = useT()
  const lang = useLang()
  const trimmed = query.trim()
  const terms = queryTerms(query)
  const raw = trimmed === "" ? [] : searchContent(trimmed, lang)
  const groups = groupResults(raw)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-fs-body font-semibold text-ink m-0">
          {t("docs.search.resultsHeading", { query: trimmed, count: groups.length })}
        </p>
        <Button kind="link" onClick={onClear}>
          × {t("docs.search.closeSearch")}
        </Button>
      </div>

      {groups.length === 0
        ? (
          <p className="text-fs-body-sm text-ink-soft">
            {t("docs.search.noResults")}
          </p>
        )
        : (
          <ul className="list-none p-0 m-0 border-t border-border-soft">
            {groups.map((g) => {
              const iso = pickIso(g.pageUrlPath, lang)

              return (
                <li key={g.pageUrlPath} className="border-b border-border-soft py-2.5">
                  <div className="flex items-baseline gap-2.5">
                    <Link
                      to={g.pageUrlPath}
                      className="flex items-baseline gap-2.5 no-underline min-w-0 hover:underline"
                    >
                      <ResultIcon urlPath={g.pageUrlPath} />
                      <span className="text-fs-body font-bold text-brand-deep leading-snug">
                        <Mark text={g.pageTitle} terms={terms} />
                      </span>
                    </Link>
                    <span className="ml-auto text-fs-body-sm font-mono text-ink-soft whitespace-nowrap shrink-0">
                      {g.pageUrlPath}
                    </span>
                    {iso !== undefined && (
                      <span className="text-fs-body-sm font-mono text-ink-soft whitespace-nowrap shrink-0 text-right min-w-20">
                        {formatDate(iso)}
                      </span>
                    )}
                  </div>
                  {g.bestSection !== undefined && g.bestSection.anchor !== undefined && (
                    <Link
                      to={`${g.pageUrlPath}#${g.bestSection.anchor}`}
                      className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill bg-brand-softer border border-brand/15 no-underline w-fit hover:bg-brand-soft"
                    >
                      <HashIcon size={11} className="text-ink-soft shrink-0" aria-hidden />
                      <span className="text-fs-meta font-bold text-brand-deep">
                        <Mark text={g.bestSection.title} terms={terms} />
                      </span>
                    </Link>
                  )}
                  <p className="mt-1 mb-0 text-fs-body-sm text-ink-mid line-clamp-1 leading-relaxed max-w-content-narrow">
                    <span className="inline-flex items-center mr-1.5 px-1 rounded-tag border border-border-soft font-mono text-fs-micro font-bold text-ink-soft align-middle">
                      本文
                    </span>
                    <span className="align-middle">
                      <Mark text={g.primarySnippet} terms={terms} />
                    </span>
                  </p>
                </li>
              )
            })}
          </ul>
        )}
    </div>
  )
}
