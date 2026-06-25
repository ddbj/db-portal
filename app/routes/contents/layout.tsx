import { useState } from "react"
import { Outlet } from "react-router"

import { ContentSidebar } from "~/features/contents"
import { useT } from "~/lib/i18n"
import { Button } from "~/ui"

export const handle = {
  breadcrumbResolver: "contents-root",
} as const

const ContentsLayout = () => {
  const t = useT()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="max-w-content-max mx-auto px-page-gutter">
      <div className="grid gap-6 sm:grid-cols-[var(--spacing-sidebar)_1fr] items-start">
        <aside className="hidden sm:block sticky top-4">
          <ContentSidebar />
        </aside>

        <div className="sm:hidden">
          <Button kind="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {t("contents.sidebarHeading")}
          </Button>
          {sidebarOpen && (
            <div className="mt-2 mb-4">
              <ContentSidebar />
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

export default ContentsLayout
