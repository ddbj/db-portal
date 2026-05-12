import type { ParseKeys } from "i18next"
import {
  BarChart3,
  Boxes,
  Cpu,
  Newspaper,
  SlidersHorizontal,
  Upload,
} from "lucide-react"
import { type ComponentType, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"

import NewsList from "@/components/news/NewsList"
import {
  Heading,
  LinkCard,
  SearchBox,
  type SelectOption,
  TextLink,
} from "@/components/ui"
import { pickLang } from "@/i18n"
import { resolveMeta } from "@/i18n/server"
import { DATABASES, EXAMPLE_CHIPS } from "@/lib/mock-data"
import { PORTAL_ORIGIN } from "@/lib/portal-origin"
import { astToDsl, qStringToAst } from "@/lib/search-ast"
import { ALL_DB_VALUE, buildSearchUrl, type DbSelectValue } from "@/lib/search-url"
import { searchNews } from "@/server/news-mirror"

import type { Route } from "./+types/home"

const HOME_NEWS_LIMIT = 8

export const loader = ({ request }: Route.LoaderArgs) => {
  const lang = pickLang(
    request.headers.get("Cookie"),
    request.headers.get("Accept-Language"),
  )
  const resource = resolveMeta(lang)

  const news = searchNews({ lang, type: "news", retired: "all", limit: HOME_NEWS_LIMIT }).hits

  return {
    lang,
    metaTitle: resource.routes.home.meta.title,
    metaDescription: resource.routes.home.meta.description,
    news,
  }
}

export const meta = ({ data }: Route.MetaArgs) => [
  { title: data?.metaTitle ?? "DDBJ 刷新 (仮)" },
  { name: "description", content: data?.metaDescription ?? "DDBJ 刷新 (仮)" },
  { name: "robots", content: "index, follow" },
  { tagName: "link", rel: "canonical", href: `${PORTAL_ORIGIN}/` },
]

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean }>
type TranslationKey = ParseKeys

interface ServiceCardCommon {
  key: string
  icon: IconComponent
  titleKey: TranslationKey
  descriptionKey: TranslationKey
  linkKey: TranslationKey
}

type ServiceCard =
  | (ServiceCardCommon & { external: false; to: string })
  | (ServiceCardCommon & { external: true; href: string })

const SERVICE_CARDS: readonly ServiceCard[] = [
  {
    key: "advancedSearch",
    icon: SlidersHorizontal,
    titleKey: "routes.home.services.cards.advancedSearch.title",
    descriptionKey: "routes.home.services.cards.advancedSearch.description",
    linkKey: "routes.home.services.cards.advancedSearch.link",
    external: false,
    to: "/advanced-search",
  },
  {
    key: "submit",
    icon: Upload,
    titleKey: "routes.home.services.cards.submit.title",
    descriptionKey: "routes.home.services.cards.submit.description",
    linkKey: "routes.home.services.cards.submit.link",
    external: false,
    to: "/submit",
  },
  {
    key: "services",
    icon: Boxes,
    titleKey: "routes.home.services.cards.services.title",
    descriptionKey: "routes.home.services.cards.services.description",
    linkKey: "routes.home.services.cards.services.link",
    external: true,
    href: "https://www.ddbj.nig.ac.jp/services/",
  },
  {
    key: "supercomputer",
    icon: Cpu,
    titleKey: "routes.home.services.cards.supercomputer.title",
    descriptionKey: "routes.home.services.cards.supercomputer.description",
    linkKey: "routes.home.services.cards.supercomputer.link",
    external: true,
    href: "https://sc.ddbj.nig.ac.jp/",
  },
  {
    key: "statistics",
    icon: BarChart3,
    titleKey: "routes.home.services.cards.statistics.title",
    descriptionKey: "routes.home.services.cards.statistics.description",
    linkKey: "routes.home.services.cards.statistics.link",
    external: true,
    href: "https://www.ddbj.nig.ac.jp/statistics/",
  },
  {
    key: "activities",
    icon: Newspaper,
    titleKey: "routes.home.services.cards.activities.title",
    descriptionKey: "routes.home.services.cards.activities.description",
    linkKey: "routes.home.services.cards.activities.link",
    external: true,
    href: "https://www.ddbj.nig.ac.jp/activities/",
  },
]

type ResourceGroup = "ddbj" | "dbcls"

interface PopularResource {
  key: string
  group: ResourceGroup
  labelKey: TranslationKey
  href: string
}

const POPULAR_RESOURCES: readonly PopularResource[] = [
  {
    key: "bioproject",
    group: "ddbj",
    labelKey: "routes.home.popularResources.items.bioproject.label",
    href: "https://www.ddbj.nig.ac.jp/bioproject/index.html",
  },
  {
    key: "biosample",
    group: "ddbj",
    labelKey: "routes.home.popularResources.items.biosample.label",
    href: "https://www.ddbj.nig.ac.jp/biosample/index.html",
  },
  {
    key: "dra",
    group: "ddbj",
    labelKey: "routes.home.popularResources.items.dra.label",
    href: "https://www.ddbj.nig.ac.jp/dra/index.html",
  },
  {
    key: "ddbj",
    group: "ddbj",
    labelKey: "routes.home.popularResources.items.ddbj.label",
    href: "https://www.ddbj.nig.ac.jp/ddbj/index.html",
  },
  {
    key: "gea",
    group: "ddbj",
    labelKey: "routes.home.popularResources.items.gea.label",
    href: "https://www.ddbj.nig.ac.jp/gea/index.html",
  },
  {
    key: "jga",
    group: "ddbj",
    labelKey: "routes.home.popularResources.items.jga.label",
    href: "https://www.ddbj.nig.ac.jp/jga/index.html",
  },
  {
    key: "metabobank",
    group: "ddbj",
    labelKey: "routes.home.popularResources.items.metabobank.label",
    href: "https://www.ddbj.nig.ac.jp/metabobank/index.html",
  },
  {
    key: "togovar",
    group: "dbcls",
    labelKey: "routes.home.popularResources.items.togovar.label",
    href: "https://togovar.org/",
  },
  {
    key: "togogenome",
    group: "dbcls",
    labelKey: "routes.home.popularResources.items.togogenome.label",
    href: "https://togogenome.org/",
  },
  {
    key: "gggenome",
    group: "dbcls",
    labelKey: "routes.home.popularResources.items.gggenome.label",
    href: "https://gggenome.dbcls.jp/",
  },
  {
    key: "refex",
    group: "dbcls",
    labelKey: "routes.home.popularResources.items.refex.label",
    href: "https://refex.dbcls.jp/",
  },
  {
    key: "togotv",
    group: "dbcls",
    labelKey: "routes.home.popularResources.items.togotv.label",
    href: "https://togotv.dbcls.jp/",
  },
]

const RESOURCE_GROUPS: readonly ResourceGroup[] = ["ddbj", "dbcls"]

const Home = ({ loaderData }: Route.ComponentProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [db, setDb] = useState<DbSelectValue>(ALL_DB_VALUE)
  const { news } = loaderData

  const dbOptions: readonly SelectOption[] = [
    { value: ALL_DB_VALUE, label: t("routes.home.search.dbAll") },
    ...DATABASES.map((d) => ({ value: d.id, label: d.displayName })),
  ]

  const handleSubmit = (q: string) => {
    const dsl = astToDsl(qStringToAst(q))
    void navigate(buildSearchUrl({ q: dsl, db }))
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 pt-16 pb-24">
      <div className="mx-auto max-w-3xl">
        <SearchBox
          size="large"
          placeholder={t("routes.home.search.placeholder")}
          hintText={t("routes.home.search.hint")}
          helperText={t("routes.home.search.examplesLabel")}
          buttonLabel={t("routes.home.search.submit")}
          examples={EXAMPLE_CHIPS}
          dbOptions={dbOptions}
          selectedDb={db}
          onDbChange={(v) => setDb(v as DbSelectValue)}
          dbAriaLabel={t("routes.home.search.dbSelectorAria")}
          onSubmit={handleSubmit}
        />
      </div>

      <div className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_320px]">
        <section className="min-w-0">
          <Heading
            level={2}
            className="text-xl font-semibold tracking-wide text-gray-900"
          >
            {t("routes.home.services.heading")}
          </Heading>
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            {SERVICE_CARDS.map((card) => {
              const Icon = card.icon
              const title = t(card.titleKey)
              const description = t(card.descriptionKey)
              const linkText = t(card.linkKey)
              const icon = <Icon className="h-5 w-5" aria-hidden={true} />

              return card.external
                ? (
                  <LinkCard
                    key={card.key}
                    external
                    href={card.href}
                    color="primary"
                    icon={icon}
                    title={title}
                    description={description}
                    linkText={linkText}
                  />
                )
                : (
                  <LinkCard
                    key={card.key}
                    to={card.to}
                    color="primary"
                    icon={icon}
                    title={title}
                    description={description}
                    linkText={linkText}
                  />
                )
            })}
          </div>
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <section aria-labelledby="home-news-heading">
            <div className="flex items-baseline justify-between gap-4">
              <Heading
                level={2}
                id="home-news-heading"
                className="text-base font-semibold tracking-wide text-gray-900"
              >
                {t("routes.home.news.tabs.news")}
              </Heading>
              <TextLink to="/news" className="text-xs">
                {t("routes.home.news.viewMore")}
                <span aria-hidden={true}> →</span>
              </TextLink>
            </div>
            <div className="mt-3">
              <NewsList items={news} variant="compact" />
            </div>
          </section>

          <section
            aria-labelledby="home-popular-resources-heading"
            className="mt-10"
          >
            <Heading
              level={2}
              id="home-popular-resources-heading"
              className="text-base font-semibold tracking-wide text-gray-900"
            >
              {t("routes.home.popularResources.heading")}
            </Heading>
            <div className="mt-3 space-y-4">
              {RESOURCE_GROUPS.map((group) => {
                const items = POPULAR_RESOURCES.filter((r) => r.group === group)

                return (
                  <div key={group}>
                    <h3 className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                      {t(`routes.home.popularResources.groups.${group}.label`)}
                    </h3>
                    <ul className="mt-1.5 space-y-1.5">
                      {items.map((r) => (
                        <li key={r.key} className="text-sm">
                          <TextLink external href={r.href}>
                            {t(r.labelKey)}
                          </TextLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default Home
