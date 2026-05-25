import type { Lang } from "~/lib/i18n"
import type { ServiceContent } from "~/schemas/content/service-content"
import { cn, LinkCard } from "~/ui"

type PopularCategory = "popular-ddbj" | "popular-dbcls"

type PopularService = ServiceContent & {
  top: Extract<NonNullable<ServiceContent["top"]>, { category: PopularCategory }>
}

type ResourceCardProps = {
  service: PopularService
  lang: Lang
}

const monogramClass = (category: PopularCategory): string =>
  category === "popular-ddbj"
    ? "bg-src-ddbj-soft text-src-ddbj"
    : "bg-src-dbcls-soft text-src-dbcls"

const prefixForLang = (lang: Lang): string => (lang === "en" ? "/en" : "")

export const ResourceCard = ({ service, lang }: ResourceCardProps) => {
  const link = service.link
  if (link === undefined) return null

  const title = service.title[lang]
  const description = service.description[lang]
  const inner = (
    <div className="flex items-center gap-3 p-3 h-full">
      <div
        className={cn(
          "w-9 h-9 rounded-card shrink-0 flex items-center justify-center font-bold text-fs-body-sm tracking-tight",
          monogramClass(service.top.category),
        )}
        aria-hidden
      >
        {service.top.monogram}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-ink font-semibold text-fs-body-sm leading-tight m-0">{title}</div>
        <p className="text-ink-soft text-fs-label leading-relaxed m-0 mt-1 line-clamp-2 min-h-10">
          {description}
        </p>
      </div>
    </div>
  )

  return link.kind === "internal"
    ? <LinkCard to={`${prefixForLang(lang)}${link.to}`} className="h-full">{inner}</LinkCard>
    : <LinkCard external href={link.href} className="h-full">{inner}</LinkCard>
}
