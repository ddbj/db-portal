import { type MouseEvent, useCallback } from "react"
import { type LoaderFunctionArgs, useLoaderData, useNavigate } from "react-router"

import { EditOnGitHubLink } from "~/features/docs"
import { pageTitleMeta } from "~/lib/content"
import { getPageByPath } from "~/lib/content/markdown-loader"
import { useProseEnhance } from "~/lib/content/use-prose-enhance"
import { formatDate, useLang, useT } from "~/lib/i18n"
import { PageTitle, Section } from "~/ui"

import { decideAnchorIntercept } from "./anchor-intercept"

export const handle = {
  titleResolver: "page-content",
  breadcrumbResolver: "page-content",
  i18n: { en: "complete" },
} as const

export const meta = pageTitleMeta

export const loader = ({ params }: LoaderFunctionArgs): { urlPath: string } => {
  const splat = params["*"] ?? ""
  const urlPath = `/${splat}`
  if (getPageByPath(urlPath) === undefined) {
    throw new Response("Not Found", { status: 404 })
  }

  return { urlPath }
}

const PageContentRoute = () => {
  const { urlPath } = useLoaderData<typeof loader>()
  const lang = useLang()
  const t = useT()
  const navigate = useNavigate()
  useProseEnhance(".prose-bsi")

  const handleClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const decision = decideAnchorIntercept(e.target, e)
    if (decision.kind !== "intercept") return
    e.preventDefault()
    void navigate(decision.href)
  }, [navigate])

  const page = getPageByPath(urlPath)
  if (page === undefined) return null

  const fm = lang === "en" && page.frontmatter.en
    ? page.frontmatter.en
    : page.frontmatter.ja
  const html = lang === "en" && page.html.en
    ? page.html.en
    : page.html.ja
  const iso = lang === "en"
    ? page.lastUpdated?.en ?? page.lastUpdated?.ja
    : page.lastUpdated?.ja ?? page.lastUpdated?.en

  const meta = (
    <div className="flex items-center gap-3">
      {iso !== undefined && (
        <span className="text-fs-body-sm font-mono text-ink-soft whitespace-nowrap">
          {t("docs.lastUpdatedPrefix")} {formatDate(iso)}
        </span>
      )}
      <EditOnGitHubLink sourcePath={page.sourcePath} />
    </div>
  )

  return (
    <article>
      <PageTitle
        title={fm.title}
        subtitle={fm.description}
        meta={meta}
        maxWidth={880}
        padTop="trimmed"
        padBottom="sm"
      />
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

export default PageContentRoute
