import { Link, useLocation } from "react-router"

import { getContentTree } from "~/lib/content/content-tree"
import { useLang, useT } from "~/lib/i18n"
import { SidebarGroupLabel, SidebarHeading, TextLink } from "~/ui"

const sectionI18nKey = (section: string): string =>
  `contents.section.${section}`

export const ContentSidebar = () => {
  const lang = useLang()
  const t = useT()
  const { pathname } = useLocation()
  const tree = getContentTree()

  return (
    <nav aria-label={t("contents.sidebarHeading")}>
      <SidebarHeading as="h2">
        <TextLink to="/contents">{t("contents.sidebarHeading")}</TextLink>
      </SidebarHeading>

      <div className="mt-4 flex flex-col gap-6">
        {tree.map((section) => (
          <div key={section.section}>
            <SidebarGroupLabel>{t(sectionI18nKey(section.section))}</SidebarGroupLabel>
            <ul className="flex flex-col gap-0.5 list-none p-0 m-0">
              {section.pages.map((page) => {
                const isActive = pathname === page.urlPath
                const title = lang === "en" && page.title.en
                  ? page.title.en
                  : page.title.ja

                return (
                  <li key={page.urlPath}>
                    <Link
                      to={page.urlPath}
                      aria-current={isActive ? "page" : undefined}
                      className={
                        isActive
                          ? "block py-1 px-2 rounded-button text-fs-body-sm font-bold text-brand no-underline bg-brand/5"
                          : "block py-1 px-2 rounded-button text-fs-body-sm text-ink-mid no-underline hover:text-ink hover:bg-surface-hover"
                      }
                    >
                      {title}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}
