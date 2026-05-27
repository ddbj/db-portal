import type { Lang } from "~/lib/i18n"
import type { ServiceContent } from "~/schemas/content/service-content"
import { cn, LinkCard } from "~/ui"

type PopularCategory = "popular-ddbj" | "popular-dbcls"

type PopularService = ServiceContent & {
  top: Extract<NonNullable<ServiceContent["top"]>, { category: PopularCategory }>
}

export type ResourceAccent =
  | "src-ddbj-warm"
  | "src-ddbj-mid"
  | "src-ddbj-deep"
  | "src-dbcls-warm"
  | "src-dbcls-mid"

type ResourceCardProps = {
  service: PopularService
  lang: Lang
  accent: ResourceAccent
}

const accentClass: Record<ResourceAccent, string> = {
  "src-ddbj-warm": "bg-src-ddbj-warm/12 text-src-ddbj-warm",
  "src-ddbj-mid": "bg-src-ddbj-mid/12 text-src-ddbj-mid",
  "src-ddbj-deep": "bg-src-ddbj-deep/12 text-src-ddbj-deep",
  "src-dbcls-warm": "bg-src-dbcls-warm/12 text-src-dbcls-warm",
  "src-dbcls-mid": "bg-src-dbcls-mid/12 text-src-dbcls-mid",
}

const prefixForLang = (lang: Lang): string => (lang === "en" ? "/en" : "")

export const ResourceCard = ({ service, lang, accent }: ResourceCardProps) => {
  const link = service.link
  if (link === undefined) return null

  const title = service.title[lang]
  const description = service.description[lang]
  const inner = (
    <div className="flex items-center gap-2.5 px-3 py-2.5">
      <div
        aria-hidden
        className={cn(
          "w-9 h-9 rounded-lg shrink-0 flex items-center justify-center font-extrabold text-fs-body-sm tracking-monogram",
          accentClass[accent],
        )}
      >
        {service.top.monogram}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-ink font-bold text-fs-body m-0 overflow-hidden text-ellipsis whitespace-nowrap">
          {title}
        </div>
        <div className="text-ink-soft text-fs-micro m-0 mt-px overflow-hidden text-ellipsis whitespace-nowrap">
          {description}
        </div>
      </div>
    </div>
  )

  return link.kind === "internal"
    ? <LinkCard to={`${prefixForLang(lang)}${link.to}`}>{inner}</LinkCard>
    : <LinkCard external href={link.href}>{inner}</LinkCard>
}
