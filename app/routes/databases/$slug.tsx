import { type LoaderFunctionArgs, useLoaderData } from "react-router"

import { pageTitleMeta } from "~/lib/content"
import { getDatabaseBySlug } from "~/lib/content/loader"
import { type Lang, useLang, useT } from "~/lib/i18n"
import { PageTitle, Section, SectionHeading, Tag, TextLink } from "~/ui"

export const handle = {
  breadcrumbResolver: "database-content",
  titleResolver: "database-content",
  i18n: { en: "complete" },
} as const

export const meta = pageTitleMeta

export const loader = ({ params }: LoaderFunctionArgs): { slug: string } => {
  const slug = params.slug ?? ""
  if (getDatabaseBySlug(slug) === undefined) {
    throw new Response("Not Found", { status: 404 })
  }

  return { slug }
}

const formatDate = (iso: string, lang: Lang): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString(lang === "en" ? "en-US" : "ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  })
}

const DatabaseSlugRoute = () => {
  const { slug } = useLoaderData<typeof loader>()
  const lang = useLang()
  const t = useT()
  const db = getDatabaseBySlug(slug)
  if (db === undefined) return null

  return (
    <article className="pb-section-lg">
      <PageTitle title={db.title[lang]} subtitle={db.description[lang]} />
      <Section padY="sm">
        {db.body[lang]}
      </Section>
      {db.meta.relatedDbs.length > 0 && (
        <Section padY="md">
          <SectionHeading as="h2">{t("databases.relatedHeading")}</SectionHeading>
          <ul className="list-none p-0 m-0 flex flex-wrap gap-2">
            {db.meta.relatedDbs.map((relatedSlug) => {
              const related = getDatabaseBySlug(relatedSlug)
              if (related === undefined) return null
              return (
                <li key={relatedSlug} className="m-0">
                  <TextLink to={`/databases/${relatedSlug}`}>{related.title[lang]}</TextLink>
                </li>
              )
            })}
          </ul>
        </Section>
      )}
      {db.meta.externalLinks.length > 0 && (
        <Section padY="md">
          <SectionHeading as="h2">{t("databases.externalLinksHeading")}</SectionHeading>
          <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
            {db.meta.externalLinks.map((link) => (
              <li key={link.href} className="m-0">
                <TextLink external href={link.href}>{link.label[lang]}</TextLink>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section padY="sm">
        <div className="flex items-center gap-2 text-fs-body-sm text-ink-soft">
          <Tag kind="tag" size="sm">{t("databases.lastUpdatedLabel")}</Tag>
          <time dateTime={db.meta.lastUpdated} className="font-mono">
            {formatDate(db.meta.lastUpdated, lang)}
          </time>
        </div>
      </Section>
    </article>
  )
}

export default DatabaseSlugRoute
