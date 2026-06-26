import { useEffect, useMemo, useState } from "react"
import { Link, useLocation } from "react-router"

import { findNavPath, getNavTree, type NavNode } from "~/lib/content/content-tree"
import { getPageByPath } from "~/lib/content/markdown-loader"
import { useLang, useT } from "~/lib/i18n"
import { IconButton, SidebarHeading, TextLink } from "~/ui"
import { cn } from "~/ui/cn"
import { ChevronDownIcon } from "~/ui/icons"

import { ContentTocSidebar } from "./content-toc"

type NavTreeItemProps = {
  node: NavNode
  depth: number
  pathname: string
  lang: "ja" | "en"
  expanded: Set<string>
  onToggle: (urlPath: string) => void
}

const NavTreeItem = ({ node, depth, pathname, lang, expanded, onToggle }: NavTreeItemProps) => {
  const t = useT()
  const isActive = node.hasPage && pathname === node.urlPath
  const hasChildren = node.children.length > 0
  const isExpanded = expanded.has(node.urlPath)
  const label = lang === "en" && node.label.en ? node.label.en : node.label.ja

  return (
    <li>
      <div className="flex items-center gap-0.5" style={{ paddingLeft: depth * 16 }}>
        {hasChildren
          ? (
            <IconButton
              ariaLabel={isExpanded ? t("common.close") : t("common.detail")}
              size={20}
              onClick={() => onToggle(node.urlPath)}
              aria-expanded={isExpanded}
            >
              <ChevronDownIcon
                size={11}
                aria-hidden
                className={cn("transition-transform", !isExpanded && "-rotate-90")}
              />
            </IconButton>
          )
          : <span className="w-5 flex-shrink-0" />}

        {node.hasPage
          ? (
            <Link
              to={node.urlPath}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex-1 py-1 px-1.5 rounded-button text-fs-body-sm no-underline",
                isActive
                  ? "font-bold text-brand bg-brand/5"
                  : "text-ink-mid hover:text-ink hover:bg-surface-hover",
              )}
            >
              {label}
            </Link>
          )
          : (
            <span
              role="button"
              tabIndex={0}
              onClick={() => onToggle(node.urlPath)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onToggle(node.urlPath) }}
              className="flex-1 py-1 px-1.5 text-left cursor-pointer text-fs-body-sm font-semibold text-ink-mid"
            >
              {label}
            </span>
          )}
      </div>

      {hasChildren && isExpanded && (
        <ul className="list-none p-0 m-0">
          {node.children.map((child) => (
            <NavTreeItem
              key={child.urlPath}
              node={child}
              depth={depth + 1}
              pathname={pathname}
              lang={lang}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export const ContentSidebar = () => {
  const lang = useLang()
  const t = useT()
  const { pathname } = useLocation()
  const tree = getNavTree()

  const initialExpanded = useMemo(() => {
    const path = findNavPath(tree, pathname)

    return new Set(path.map((n) => n.urlPath))
  }, [tree, pathname])

  const [expanded, setExpanded] = useState(initialExpanded)

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

  const handleToggle = (urlPath: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(urlPath)) next.delete(urlPath)
      else next.add(urlPath)

      return next
    })
  }

  const page = getPageByPath(pathname)
  const toc = page
    ? (lang === "en" && page.toc.en ? page.toc.en : page.toc.ja)
    : []

  return (
    <nav aria-label={t("contents.sidebarHeading")}>
      <SidebarHeading as="h2">
        <TextLink to="/contents">{t("contents.sidebarHeading")}</TextLink>
      </SidebarHeading>

      <ul className="mt-2 flex flex-col gap-0.5 list-none p-0 m-0">
        {tree.map((node) => (
          <NavTreeItem
            key={node.urlPath}
            node={node}
            depth={0}
            pathname={pathname}
            lang={lang}
            expanded={expanded}
            onToggle={handleToggle}
          />
        ))}
      </ul>

      {toc.length > 0 && (
        <div className="mt-5 pt-5 border-t border-border-soft">
          <ContentTocSidebar headings={toc} />
        </div>
      )}
    </nav>
  )
}
