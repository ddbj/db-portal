import { listServicesByTopCategory } from "~/lib/content"
import { type Lang, useLang } from "~/lib/i18n"

import { ServiceCard } from "./service-card"

type ServiceGridProps = {
  lang?: Lang
}

export const ServiceGrid = ({ lang: explicitLang }: ServiceGridProps = {}) => {
  const hookLang = useLang()
  const lang = explicitLang ?? hookLang
  const services = listServicesByTopCategory("primary-service")

  return (
    <section>
      <ul className="list-none p-0 m-0 grid lg:grid-cols-2 gap-3">
        {services.map((service) => (
          <li key={service.id} className="m-0">
            <ServiceCard service={service} lang={lang} />
          </li>
        ))}
      </ul>
    </section>
  )
}
