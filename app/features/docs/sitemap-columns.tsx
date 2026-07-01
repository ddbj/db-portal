import { Link } from "react-router"

import {
  getSitemap,
  type RenderedSitemapItem,
  type RenderedSitemapSection,
} from "~/lib/content"
import { useLang, useT } from "~/lib/i18n"
import { SectionHeading, TextLink } from "~/ui"

type Lang = "ja" | "en"

const labelOf = (label: { ja: string; en?: string }, lang: Lang): string =>
  lang === "en" && label.en ? label.en : label.ja

const itemKey = (item: RenderedSitemapItem): string =>
  item.kind === "internal" ? item.path : item.url

type ItemRowProps = {
  item: RenderedSitemapItem
  lang: Lang
}

const ItemRow = ({ item, lang }: ItemRowProps) => {
  const t = useT()
  if (item.kind === "external") {
    return (
      <li>
        <TextLink
          href={item.url}
          external
          externalSrLabel={t("a11y.externalLink")}
          weight="semibold"
        >
          {labelOf(item.label, lang)}
        </TextLink>
      </li>
    )
  }

  return (
    <li>
      <Link
        to={item.path}
        className="font-semibold text-ink no-underline hover:text-brand-deep hover:underline"
      >
        {labelOf(item.label, lang)}
      </Link>
    </li>
  )
}

type SectionColumnProps = {
  section: RenderedSitemapSection
  lang: Lang
}

const SectionColumn = ({ section, lang }: SectionColumnProps) => (
  <div className="flex flex-col gap-2">
    <h3 className="text-fs-body-sm font-bold text-ink m-0 pb-1.5 border-b border-border-soft">
      {labelOf(section.heading, lang)}
    </h3>
    <ul className="list-none p-0 m-0 flex flex-col gap-1 text-fs-body-sm">
      {section.items.map((item) => (
        <ItemRow key={itemKey(item)} item={item} lang={lang} />
      ))}
    </ul>
  </div>
)

export const SitemapColumns = () => {
  const t = useT()
  const lang = useLang()
  const sections = getSitemap()

  return (
    <div>
      <SectionHeading>{t("docs.sections.sitemap")}</SectionHeading>
      <div className="grid gap-section-block sm:grid-cols-2 lg:grid-cols-4">
        {sections.map((section) => (
          <SectionColumn key={section.id} section={section} lang={lang} />
        ))}
      </div>
    </div>
  )
}
