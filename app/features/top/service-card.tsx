import type { Lang } from "~/lib/i18n"
import type { ServiceContent } from "~/schemas/content/service-content"
import { ExternalIcon, Heading, LinkCard } from "~/ui"

import { ServiceIcon } from "./service-icon"

type ServiceCardProps = {
  service: ServiceContent
  lang: Lang
}

export const ServiceCard = ({ service, lang }: ServiceCardProps) => {
  const link = service.link
  if (link === undefined) return null

  const title = service.title[lang]
  const description = service.description[lang]
  const inner = (
    <div className="flex items-center gap-4 px-5 py-4.5">
      <div className="w-14 h-14 rounded-card bg-surface-subtle border border-border-soft flex items-center justify-center text-brand shrink-0">
        <ServiceIcon id={service.id} size={30} />
      </div>
      <div className="flex-1 min-w-0">
        <Heading as="h3" size="h2" className="flex items-center gap-1.5">
          <span className="min-w-0">{title}</span>
          {link.kind === "external" && (
            <ExternalIcon size={12} className="text-ink-soft" />
          )}
        </Heading>
        <p className="text-fs-body-sm text-ink-soft m-0 leading-relaxed mt-1">{description}</p>
      </div>
    </div>
  )

  return link.kind === "internal"
    ? <LinkCard to={link.to}>{inner}</LinkCard>
    : <LinkCard external href={link.href}>{inner}</LinkCard>
}
