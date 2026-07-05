import { useState } from "react"
import { Outlet, useLocation } from "react-router"

import { ContentSidebar } from "~/features/docs"
import { useT } from "~/lib/i18n"
import { Button } from "~/ui"
import { CloseIcon, MenuIcon } from "~/ui/icons"

export const handle = {
  breadcrumbResolver: "docs-root",
} as const

const DocsLayout = () => {
  const t = useT()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // breadcrumb 非表示 page (/docs root) は PageTitle の pt-9 (36px) + h1(fs-h1)/
  // h2(fs-h2) の baseline offset (~8px) を合わせて mt-11 で下げ、sidebar heading
  // と main h1 の上端を揃える。breadcrumb 描画 page は breadcrumb 高 (~40px) で
  // 相殺されるので現状の mt-2 を維持。
  const isDocsRoot = useLocation().pathname === "/docs"

  return (
    <div className="max-w-content-max mx-auto px-page-gutter">
      <div className="grid gap-section-mid lg:grid-cols-[var(--spacing-sidebar)_1fr] items-start">
        <aside className={`hidden lg:block sticky top-4 ${isDocsRoot ? "mt-11" : "mt-2"}`}>
          <ContentSidebar />
        </aside>

        <div className="lg:hidden">
          {/* ハンバーガー / ✕ + 「全ドキュメント」 ラベルだけ。outline 無しの
              ghost、`-mx-3` で padding を外に逃がしてテキスト x をパンくずと揃える。
              開いた時は ContentSidebar 内の h2 を hideHeading で抑制して重複回避。 */}
          <div className="-mx-3">
            <Button
              kind="ghost"
              size="sm"
              block
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen
                ? <CloseIcon size={16} aria-hidden className="text-ink" />
                : <MenuIcon size={16} aria-hidden className="text-ink" />}
              <span className="text-ink">{t("docs.sidebar.heading")}</span>
            </Button>
          </div>
          {sidebarOpen && (
            <div className="mt-2">
              <ContentSidebar hideHeading />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default DocsLayout
