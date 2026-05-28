import { listServicesByTopCategory } from "~/lib/content"
import { type Lang, useLang, useT } from "~/lib/i18n"
import { cn, SectionHeading } from "~/ui"

import { type ResourceAccent,ResourceCard } from "./resource-card"

type PopularResourcesProps = {
  lang?: Lang
}

const DDBJ_ACCENTS: readonly ResourceAccent[] = [
  "src-ddbj-warm",
  "src-ddbj-mid",
  "src-ddbj-deep",
]
const DBCLS_ACCENTS: readonly ResourceAccent[] = [
  "src-dbcls-warm",
  "src-dbcls-mid",
]

const pickAccent = (
  palette: readonly ResourceAccent[],
  i: number,
): ResourceAccent => palette[i % palette.length] ?? palette[0] ?? "src-ddbj-warm"

const GroupLabel = ({ tone, children }: { tone: "ddbj" | "dbcls"; children: string }) => (
  <div className="flex items-center gap-2.5 mb-2">
    <span
      aria-hidden
      className={cn(
        "inline-block w-2 h-2 rounded-pill",
        tone === "ddbj" ? "bg-src-ddbj" : "bg-src-dbcls",
      )}
    />
    <span
      className={cn(
        "text-fs-label font-bold tracking-eyebrow uppercase font-mono",
        tone === "ddbj" ? "text-src-ddbj" : "text-src-dbcls",
      )}
    >
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
      <div>
        <GroupLabel tone="ddbj">{t("top.popularResources.groupDdbj")}</GroupLabel>
        <ul className="list-none p-0 m-0 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {ddbjServices.map((service, i) => (
            <li key={service.id} className="m-0">
              <ResourceCard
                service={service}
                lang={lang}
                accent={pickAccent(DDBJ_ACCENTS, i)}
              />
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-5">
        <GroupLabel tone="dbcls">{t("top.popularResources.groupDbcls")}</GroupLabel>
        <ul className="list-none p-0 m-0 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {dbclsServices.map((service, i) => (
            <li key={service.id} className="m-0">
              <ResourceCard
                service={service}
                lang={lang}
                accent={pickAccent(DBCLS_ACCENTS, i)}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
