import { useState } from "react"
import { Outlet } from "react-router"

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

  return (
    <div className="max-w-content-max mx-auto px-page-gutter">
      <div className="grid gap-4 lg:gap-6 lg:grid-cols-[var(--spacing-sidebar)_1fr] items-start">
        <aside className="hidden lg:block sticky top-4 mt-section-sm">
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
