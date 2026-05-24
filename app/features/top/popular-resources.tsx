import { listServicesByTopCategory } from "~/lib/content"
import { type Lang, useLang, useT } from "~/lib/i18n"
import { cn, SectionHeading } from "~/ui"

import { ResourceCard } from "./resource-card"

type PopularResourcesProps = {
  lang?: Lang
}

const GroupLabel = ({ tone, children }: { tone: "ddbj" | "dbcls"; children: string }) => (
  <div className="flex items-center gap-2 mb-3">
    <span
      aria-hidden
      className={cn(
        "inline-block w-2 h-2 rounded-pill",
        tone === "ddbj" ? "bg-src-ddbj" : "bg-src-dbcls",
      )}
    />
    <span className="text-fs-label font-bold tracking-label uppercase text-brand">
      {children}
    </span>
  </div>
)

export const PopularResources = ({ lang: explicitLang }: PopularResourcesProps = {}) => {
  const hookLang = useLang()
  const lang = explicitLang ?? hookLang
  const t = useT()
  const ddbjServices = listServicesByTopCategory("popular-ddbj")
  const dbclsServices = listServicesByTopCategory("popular-dbcls")

  return (
    <section>
      <SectionHeading as="h2">{t("top.popularResources.heading")}</SectionHeading>
      <div className="flex flex-col gap-section-md">
        <div>
          <GroupLabel tone="ddbj">{t("top.popularResources.groupDdbj")}</GroupLabel>
          <ul className="list-none p-0 m-0 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {ddbjServices.map((service) => (
              <li key={service.id} className="m-0">
                <ResourceCard service={service} lang={lang} />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <GroupLabel tone="dbcls">{t("top.popularResources.groupDbcls")}</GroupLabel>
          <ul className="list-none p-0 m-0 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {dbclsServices.map((service) => (
              <li key={service.id} className="m-0">
                <ResourceCard service={service} lang={lang} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
