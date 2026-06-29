import { type MouseEvent, useCallback } from "react"
import { type LoaderFunctionArgs, useLoaderData, useNavigate } from "react-router"

import { pageTitleMeta } from "~/lib/content"
import { getPageBySlug } from "~/lib/content/markdown-loader"
import { useProseEnhance } from "~/lib/content/use-prose-enhance"
import { useLang } from "~/lib/i18n"
import { PageTitle, Section } from "~/ui"

export const handle = {
  titleResolver: "database-content",
  breadcrumbResolver: "database-content",
  i18n: { en: "complete" },
} as const

export const meta = pageTitleMeta

export const loader = ({ params }: LoaderFunctionArgs): { slug: string } => {
  const slug = params.slug ?? ""
  if (getPageBySlug("databases", slug) === undefined) {
    throw new Response("Not Found", { status: 404 })
  }

  return { slug }
}

const DatabaseSlugRoute = () => {
  const { slug } = useLoaderData<typeof loader>()
  const lang = useLang()
  const navigate = useNavigate()
  useProseEnhance(".prose-bsi")

  const handleClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const target = e.target
    if (!(target instanceof HTMLAnchorElement)) return
    const href = target.getAttribute("href")
    if (!href) return
    if (href.startsWith("/") && !href.startsWith("//")) {
      e.preventDefault()
      void navigate(href)
    }
  }, [navigate])

  const page = getPageBySlug("databases", slug)
  if (page === undefined) return null

  const fm = lang === "en" && page.frontmatter.en
    ? page.frontmatter.en
    : page.frontmatter.ja
  const html = lang === "en" && page.html.en
    ? page.html.en
    : page.html.ja

  return (
    <article className="pb-section-lg">
      <PageTitle title={fm.title} subtitle={fm.description} maxWidth={880} padTop="trimmed" padBottom="sm" />
      <Section padY="sm">
        <div
          className="prose prose-bsi"
          dangerouslySetInnerHTML={{ __html: html }}
          onClick={handleClick}
        />
      </Section>
    </article>
  )
}

export default DatabaseSlugRoute
