import type { ReactNode } from "react"

import type { Lang } from "~/lib/i18n"
import type { ServiceContent } from "~/schemas/content/service-content"
import {
  ExternalIcon,
  GlobeIcon,
  LinkCard,
  SearchIcon,
  UserIcon,
} from "~/ui"

type ServiceCardProps = {
  service: ServiceContent
  lang: Lang
}

const ICON_BY_ID: Record<string, ReactNode> = {
  "search": <SearchIcon size={26} />,
  "submit-nav": <UserIcon size={26} />,
  "services-index": <GlobeIcon size={26} />,
  "supercomputer": <GlobeIcon size={26} />,
  "statistics": <GlobeIcon size={26} />,
  "activity": <GlobeIcon size={26} />,
}

const renderIcon = (id: string): ReactNode => ICON_BY_ID[id] ?? <GlobeIcon size={26} />

const prefixForLang = (lang: Lang): string => (lang === "en" ? "/en" : "")

export const ServiceCard = ({ service, lang }: ServiceCardProps) => {
  const link = service.link
  if (link === undefined) return null

  const title = service.title[lang]
  const description = service.description[lang]
  const inner = (
    <div className="flex items-start gap-4 p-5">
      <div className="w-14 h-14 rounded-card bg-surface-subtle flex items-center justify-center text-brand shrink-0">
        {renderIcon(service.id)}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-fs-card-title font-bold text-ink m-0 mb-1 flex items-center gap-1.5">
          <span className="min-w-0">{title}</span>
          {link.kind === "external" && (
            <ExternalIcon size={12} className="text-ink-soft" />
          )}
        </h3>
        <p className="text-fs-body-sm text-ink-soft leading-relaxed m-0">{description}</p>
      </div>
    </div>
  )

  return link.kind === "internal"
    ? <LinkCard to={`${prefixForLang(lang)}${link.to}`}>{inner}</LinkCard>
    : <LinkCard external href={link.href}>{inner}</LinkCard>
}
