import { useEffect, useMemo, useState } from "react"
import { Link, useLocation } from "react-router"

import { findNavPath, getNavTree, type NavNode, type NavTree } from "~/lib/content/content-tree"
import { getPageByPath } from "~/lib/content/markdown-loader"
import { useLang, useT } from "~/lib/i18n"
import type { TocHeading } from "~/schemas/content/toc-heading"
import { IconButton, Mark, SidebarHeading, TextInput } from "~/ui"
import { cn } from "~/ui/cn"
import { ChevronDownIcon, FileTextIcon, FolderIcon, HashIcon, SearchIcon } from "~/ui/icons"

const FILTER_DEBOUNCE_MS = 200

const EMPTY_TERMS: readonly string[] = []
const EMPTY_HEADINGS: readonly TocHeading[] = []

type Lang = "ja" | "en"

type SidebarIndex = {
  labelByPath: ReadonlyMap<string, string>
  labelLowerByPath: ReadonlyMap<string, string>
  headingsByPath: ReadonlyMap<string, readonly TocHeading[]>
  headingLowersByPath: ReadonlyMap<string, readonly string[]>
}

type FilterState = {
  visible: ReadonlySet<string>
  headingHit: ReadonlySet<string>
  expandOnFilter: ReadonlySet<string>
}

const labelOf = (node: NavNode, lang: Lang): string =>
  lang === "en" && node.label.en ? node.label.en : node.label.ja

const headingsOf = (urlPath: string, lang: Lang): TocHeading[] => {
  const page = getPageByPath(urlPath)
  if (page === undefined) return []
  const toc = lang === "en" && page.toc.en ? page.toc.en : page.toc.ja

  return toc.filter((h) => h.depth === 2)
}

const countPages = (nodes: readonly NavNode[]): number => {
  let n = 0
  for (const node of nodes) {
    if (node.hasPage) n += 1
    n += countPages(node.children)
  }

  return n
}

const buildSidebarIndex = (tree: NavTree, lang: Lang): SidebarIndex => {
  const labelByPath = new Map<string, string>()
  const labelLowerByPath = new Map<string, string>()
  const headingsByPath = new Map<string, readonly TocHeading[]>()
  const headingLowersByPath = new Map<string, readonly string[]>()
  const walk = (nodes: readonly NavNode[]): void => {
    for (const node of nodes) {
      const label = labelOf(node, lang)
      labelByPath.set(node.urlPath, label)
      labelLowerByPath.set(node.urlPath, label.toLowerCase())
      if (node.hasPage) {
        const headings = headingsOf(node.urlPath, lang)
        headingsByPath.set(node.urlPath, headings)
        headingLowersByPath.set(
          node.urlPath,
          headings.map((h) => h.text.toLowerCase()),
        )
      }
      walk(node.children)
    }
  }
  walk(tree)

  return { labelByPath, labelLowerByPath, headingsByPath, headingLowersByPath }
}

// expandOnFilter は label match のみ ancestor に propagate する。
// 自 heading 一致だけの node は visibility には効くが ancestor を開かない
// (label 検索と h2 検索で ancestor 展開挙動を区別する既存 UX を保つ)。
const computeFilterState = (
  tree: NavTree,
  filter: string,
  index: SidebarIndex,
): FilterState => {
  const visible = new Set<string>()
  const headingHit = new Set<string>()
  const expandOnFilter = new Set<string>()
  const walk = (
    nodes: readonly NavNode[],
    ancestors: readonly string[],
  ): { anyVisible: boolean; anyLabelTracked: boolean } => {
    let anyVisible = false
    let anyLabelTracked = false
    for (const node of nodes) {
      const labelLower = index.labelLowerByPath.get(node.urlPath) ?? ""
      const selfLabelMatch = labelLower.includes(filter)
      const headingLowers = index.headingLowersByPath.get(node.urlPath) ?? EMPTY_TERMS
      const selfHeadingMatch = headingLowers.some((h) => h.includes(filter))
      if (selfHeadingMatch) headingHit.add(node.urlPath)
      const childRes = walk(node.children, [...ancestors, node.urlPath])
      const nodeVisible = selfLabelMatch || selfHeadingMatch || childRes.anyVisible
      const nodeLabelTracked = selfLabelMatch || childRes.anyLabelTracked
      if (nodeVisible) {
        visible.add(node.urlPath)
        if (node.children.length > 0) expandOnFilter.add(node.urlPath)
        anyVisible = true
      }
      if (nodeLabelTracked) {
        for (const a of ancestors) expandOnFilter.add(a)
        anyLabelTracked = true
      }
    }

    return { anyVisible, anyLabelTracked }
  }
  walk(tree, [])

  return { visible, headingHit, expandOnFilter }
}

const useDebouncedValue = <T,>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs)

    return () => window.clearTimeout(id)
  }, [value, delayMs])

  return debounced
}

type HeadingRowProps = {
  urlPath: string
  heading: TocHeading
  activeAnchor: string | undefined
  filterTerms: readonly string[]
}

const HeadingRow = ({ urlPath, heading, activeAnchor, filterTerms }: HeadingRowProps) => {
  const isActive = activeAnchor === heading.id

  return (
    <li>
      <div
        className={cn(
          "group relative flex items-center min-h-6 rounded-button gap-1",
          isActive && "bg-brand-soft",
        )}
      >
        {/* active ribbon: 行内の x 位置に影響させないため absolute 配置 */}
        {isActive && (
          <span
            aria-hidden
            className="absolute left-0 top-1 bottom-1 w-0.5 bg-brand rounded-full"
          />
        )}
        {/* dir/doc 行の caret 列と幅を揃えるためのスペーサー */}
        <span className="w-6 shrink-0" aria-hidden />
        {/* dir/doc 行の icon-slot と幅を揃える (HashIcon を同じ縦列に置く) */}
        <span className="inline-flex items-center justify-center w-4 shrink-0" aria-hidden>
          <HashIcon size={11} className="text-ink-soft" />
        </span>
        <Link
          to={`${urlPath}#${heading.id}`}
          aria-current={isActive ? "true" : undefined}
          className={cn(
            "flex-1 min-w-0 py-0.5 px-1.5 text-fs-body-sm leading-tight no-underline truncate rounded-button",
            isActive
              ? "font-semibold text-brand-deep"
              : "text-ink-mid hover:text-ink hover:bg-surface-subtle",
          )}
        >
          <Mark text={heading.text} terms={filterTerms} />
        </Link>
      </div>
    </li>
  )
}

type NavTreeItemProps = {
  node: NavNode
  depth: number
  pathname: string
  activeAnchor: string | undefined
  expanded: ReadonlySet<string>
  openHeadings: ReadonlySet<string>
  visiblePaths: ReadonlySet<string> | null
  index: SidebarIndex
  filterTerms: readonly string[]
  onToggleExpand: (urlPath: string) => void
  onToggleHeadings: (urlPath: string) => void
}

const NavTreeItem = ({
  node,
  depth,
  pathname,
  activeAnchor,
  expanded,
  openHeadings,
  visiblePaths,
  index,
  filterTerms,
  onToggleExpand,
  onToggleHeadings,
}: NavTreeItemProps) => {
  const t = useT()
  if (visiblePaths !== null && !visiblePaths.has(node.urlPath)) return null

  const isActive = node.hasPage && pathname === node.urlPath
  const hasChildren = node.children.length > 0
  const isExpanded = expanded.has(node.urlPath)
  const showHeadings = openHeadings.has(node.urlPath)
  const label = index.labelByPath.get(node.urlPath) ?? ""
  const headings = node.hasPage
    ? (index.headingsByPath.get(node.urlPath) ?? EMPTY_HEADINGS)
    : EMPTY_HEADINGS

  return (
    <li>
      <div
        className={cn(
          "group relative flex items-center min-h-7 rounded-button gap-1 pr-1",
          isActive && "bg-brand-soft",
        )}
      >
        {/* active ribbon: 行内の x 位置に影響させないため absolute 配置 */}
        {isActive && (
          <span
            aria-hidden
            className="absolute left-0 top-1 bottom-1 w-0.5 bg-brand rounded-full"
          />
        )}
        {hasChildren
          ? (
            <IconButton
              ariaLabel={isExpanded ? t("common.close") : t("common.detail")}
              size={24}
              onClick={() => onToggleExpand(node.urlPath)}
              aria-expanded={isExpanded}
            >
              <ChevronDownIcon
                size={13}
                aria-hidden
                className={cn(
                  "transition-transform text-ink-soft",
                  !isExpanded && "-rotate-90",
                )}
              />
            </IconButton>
          )
          : <span className="w-6 shrink-0" aria-hidden />}

        {/* dir (children あり) は folder、末端 doc は document アイコン。
            intermediate dir (hasPage 無し) も dir として扱い folder を描画する。 */}
        <span className="inline-flex items-center justify-center w-4 shrink-0" aria-hidden>
          {hasChildren
            ? <FolderIcon size={16} className="text-ink-soft" />
            : <FileTextIcon size={15} className="text-ink-soft" />}
        </span>

        {node.hasPage
          ? (
            <Link
              to={node.urlPath}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex-1 min-w-0 py-1 px-1.5 text-fs-body-sm no-underline truncate leading-tight",
                isActive
                  ? "font-bold text-brand-deep"
                  : "text-ink-mid hover:text-ink hover:bg-surface-subtle rounded-button",
              )}
            >
              <Mark text={label} terms={filterTerms} />
            </Link>
          )
          : (
            <span
              role="button"
              tabIndex={0}
              onClick={() => onToggleExpand(node.urlPath)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  // Space の default action (page scroll) を止める。
                  e.preventDefault()
                  onToggleExpand(node.urlPath)
                }
              }}
              className="flex-1 min-w-0 py-1 px-1.5 text-left cursor-pointer text-fs-body-sm font-semibold text-ink truncate leading-tight"
            >
              <Mark text={label} terms={filterTerms} />
            </span>
          )}

        {headings.length > 0 && (
          // chip 形 button。IconButton は固定 size、Button は padding ベースの
          // sizing で、桁数によって幅が変わる chip 表現と噛み合わないため、ここは
          // 生 button を使う。
          // eslint-disable-next-line react/forbid-elements
          <button
            type="button"
            aria-label={t("docs.sidebar.headingToggleLabel", { title: label })}
            aria-expanded={showHeadings}
            onClick={() => onToggleHeadings(node.urlPath)}
            className={cn(
              "shrink-0 cursor-pointer transition-opacity",
              "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-pill text-fs-micro font-mono font-bold leading-none bg-brand-softer text-brand-deep border border-brand/15",
              showHeadings
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
            )}
          >
            <span aria-hidden>#</span>
            {headings.length}
          </button>
        )}
      </div>

      {/* h2 一覧は親 doc の「真下にぶら下がる」 関係。ul 自体は ml-3 で
          親 doc よりわずかに inset させて従属関係を出す。HeadingRow 内の
          caret-spacer + icon-slot で親 dir/doc 行と同じ列構造を保つ。
          子 dir/doc ul は ml-6 (= caret 1 段ぶん) で 1 段深くインデント。 */}
      {node.hasPage && showHeadings && headings.length > 0 && (
        <ul className="mt-0.5 mb-0.5 ml-3 list-none p-0">
          {headings.map((h) => (
            <HeadingRow
              key={h.id}
              urlPath={node.urlPath}
              heading={h}
              activeAnchor={pathname === node.urlPath ? activeAnchor : undefined}
              filterTerms={filterTerms}
            />
          ))}
        </ul>
      )}

      {hasChildren && isExpanded && (
        <ul
          className={cn(
            "list-none p-0 m-0",
            depth >= 0 && "ml-6",
          )}
        >
          {node.children.map((child) => (
            <NavTreeItem
              key={child.urlPath}
              node={child}
              depth={depth + 1}
              pathname={pathname}
              activeAnchor={activeAnchor}
              expanded={expanded}
              openHeadings={openHeadings}
              visiblePaths={visiblePaths}
              index={index}
              filterTerms={filterTerms}
              onToggleExpand={onToggleExpand}
              onToggleHeadings={onToggleHeadings}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

type ContentSidebarProps = {
  hideHeading?: boolean
}

export const ContentSidebar = ({ hideHeading = false }: ContentSidebarProps = {}) => {
  const lang = useLang()
  const t = useT()
  const { pathname, hash } = useLocation()
  const tree: NavTree = getNavTree()
  const activeAnchor = hash.startsWith("#") ? hash.slice(1) : undefined

  const totalPages = useMemo(() => countPages(tree), [tree])

  const index = useMemo(() => buildSidebarIndex(tree, lang), [tree, lang])

  // dir はデフォルト展開。children を持つ全ノードを最初から開き、
  // user が caret で折り畳めるようにする。
  const initialExpanded = useMemo(() => {
    const set = new Set<string>()
    const walk = (nodes: readonly NavNode[]): void => {
      for (const n of nodes) {
        if (n.children.length > 0) set.add(n.urlPath)
        walk(n.children)
      }
    }
    walk(tree)

    return set
  }, [tree])

  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded)
  const [openHeadings, setOpenHeadings] = useState<Set<string>>(() => {
    return pathname && getPageByPath(pathname) ? new Set([pathname]) : new Set()
  })
  const [filter, setFilter] = useState("")
  const debouncedFilter = useDebouncedValue(filter, FILTER_DEBOUNCE_MS).trim().toLowerCase()

  useEffect(() => {
    const path = findNavPath(tree, pathname)
    if (path.length > 0) {
      setExpanded((prev) => {
        const next = new Set(prev)
        for (const n of path) next.add(n.urlPath)

        return next
      })
    }
  }, [pathname, tree])

  // 個別ページに navigate するたび、heading tree は「現在の page だけ」を開く。
  // 別 page に移動したら旧 page の heading list は自動で閉じる。page でない
  // path (= getPageByPath が undefined) では何も開かない。
  useEffect(() => {
    if (getPageByPath(pathname) === undefined) {
      setOpenHeadings(new Set())

      return
    }
    setOpenHeadings(new Set([pathname]))
  }, [pathname])

  const filterState = useMemo(
    () => debouncedFilter === "" ? null : computeFilterState(tree, debouncedFilter, index),
    [tree, debouncedFilter, index],
  )

  const effectiveExpanded = useMemo(() => {
    if (filterState === null) return expanded
    const auto = new Set(expanded)
    for (const p of filterState.expandOnFilter) auto.add(p)

    return auto
  }, [expanded, filterState])

  // h2 がマッチしたページは h2 list を自動展開してヒット見出しを見えるようにする。
  const effectiveOpenHeadings = useMemo(() => {
    if (filterState === null) return openHeadings
    const auto = new Set(openHeadings)
    for (const p of filterState.headingHit) auto.add(p)

    return auto
  }, [openHeadings, filterState])

  const handleToggleExpand = (urlPath: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(urlPath)) next.delete(urlPath)
      else next.add(urlPath)

      return next
    })
  }

  const handleToggleHeadings = (urlPath: string) => {
    setOpenHeadings((prev) => {
      const next = new Set(prev)
      if (next.has(urlPath)) next.delete(urlPath)
      else next.add(urlPath)

      return next
    })
  }

  return (
    <nav aria-label={t("docs.sidebar.heading")} className="text-fs-body-sm">
      {!hideHeading && (
        <div className="mb-4">
          <SidebarHeading
            as="h2"
            action={
              <span className="text-fs-micro font-mono text-ink-soft">
                {t("docs.sidebar.totalPages", { count: totalPages })}
              </span>
            }
          >
            {t("docs.sidebar.heading")}
          </SidebarHeading>
        </div>
      )}

      <div className="relative mb-4 flex">
        <SearchIcon
          aria-hidden
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none z-sticky"
        />
        <TextInput
          ariaLabel={t("docs.sidebar.filterPlaceholder")}
          placeholder={t("docs.sidebar.filterPlaceholder")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          size="sm"
          grow
          style={{ paddingLeft: 28 }}
        />
      </div>

      <ul className="flex flex-col list-none p-0 m-0 gap-0.5">
        {tree.map((node) => (
          <NavTreeItem
            key={node.urlPath}
            node={node}
            depth={0}
            pathname={pathname}
            activeAnchor={activeAnchor}
            expanded={effectiveExpanded}
            openHeadings={effectiveOpenHeadings}
            visiblePaths={filterState?.visible ?? null}
            index={index}
            filterTerms={debouncedFilter === "" ? EMPTY_TERMS : [debouncedFilter]}
            onToggleExpand={handleToggleExpand}
            onToggleHeadings={handleToggleHeadings}
          />
        ))}
      </ul>
    </nav>
  )
}
