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
import { Link, useNavigate } from "react-router"

import {
  Heading,
  LinkCard,
  SearchBox,
  type SelectOption,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  TextLink,
} from "@/components/ui"
import { pickLang } from "@/i18n"
import { useLanguage } from "@/i18n"
import { resolveMeta } from "@/i18n/server"
import {
  DATABASES,
  EXAMPLE_CHIPS,
  HOME_NEWS_MOCK,
  type HomeNewsItem,
  type HomeNewsType,
} from "@/lib/mock-data"
import { PORTAL_ORIGIN } from "@/lib/portal-origin"
import { ALL_DB_VALUE, buildSearchUrl, type DbSelectValue } from "@/lib/search-url"

import type { Route } from "./+types/home"

export const loader = ({ request }: Route.LoaderArgs) => {
  const lang = pickLang(
    request.headers.get("Cookie"),
    request.headers.get("Accept-Language"),
  )
  const resource = resolveMeta(lang)

  return {
    lang,
    metaTitle: resource.routes.home.meta.title,
    metaDescription: resource.routes.home.meta.description,
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

const formatDate = (isoDate: string, lang: "ja" | "en") => {
  const [y, m, d] = isoDate.split("-")
  if (!y || !m || !d) return isoDate

  return lang === "ja" ? `${y}/${m}/${d}` : `${y}-${m}-${d}`
}

interface NewsListProps {
  items: readonly HomeNewsItem[]
  lang: "ja" | "en"
}

const NewsList = ({ items, lang }: NewsListProps) => {
  if (items.length === 0) {
    return <p className="px-1 py-6 text-sm text-gray-500">—</p>
  }

  return (
    <ul className="divide-y divide-gray-100">
      {items.map((item) => {
        const title = lang === "ja" ? item.titleJa : item.titleEn
        const isExternal = item.href.startsWith("http")
        const sharedClasses
          = "group flex flex-col gap-1 px-1 py-3 sm:flex-row sm:items-baseline sm:gap-4"
        const dateEl = (
          <time
            dateTime={item.date}
            className="shrink-0 font-mono text-xs text-gray-500 tabular-nums"
          >
            {formatDate(item.date, lang)}
          </time>
        )
        const titleEl = (
          <span className="group-hover:text-primary-700 text-sm text-gray-800 group-hover:underline">
            {title}
          </span>
        )

        return (
          <li key={item.id}>
            {isExternal ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={sharedClasses}
              >
                {dateEl}
                {titleEl}
              </a>
            ) : (
              <Link to={item.href} className={sharedClasses}>
                {dateEl}
                {titleEl}
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}

const Home = () => {
  const { t } = useTranslation()
  const { lang } = useLanguage()
  const navigate = useNavigate()
  const [db, setDb] = useState<DbSelectValue>(ALL_DB_VALUE)
  const [newsTab, setNewsTab] = useState<HomeNewsType>("announcement")

  const dbOptions: readonly SelectOption[] = [
    { value: ALL_DB_VALUE, label: t("routes.home.search.dbAll") },
    ...DATABASES.map((d) => ({ value: d.id, label: d.displayName })),
  ]

  const handleSubmit = (q: string) => {
    void navigate(buildSearchUrl({ q, db }))
  }

  const announcements = HOME_NEWS_MOCK.filter((n) => n.type === "announcement").slice(0, 5)
  const newsItems = HOME_NEWS_MOCK.filter((n) => n.type === "news").slice(0, 5)

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 pt-16 pb-24">
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

      <section className="mt-16">
        <Heading
          level={2}
          className="text-xl font-semibold tracking-wide text-gray-900"
        >
          {t("routes.home.services.heading")}
        </Heading>
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
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

      <section className="mt-16">
        <div className="flex items-baseline justify-between gap-4">
          <Heading
            level={2}
            className="text-xl font-semibold tracking-wide text-gray-900"
          >
            {t("routes.home.news.heading")}
          </Heading>
          <span className="text-xs text-gray-400">
            {t("routes.home.news.mockNotice")}
          </span>
        </div>
        <Tabs
          value={newsTab}
          onChange={(v) => setNewsTab(v as HomeNewsType)}
          className="mt-4"
        >
          <TabList ariaLabel={t("routes.home.news.heading")}>
            <Tab value="announcement">
              {t("routes.home.news.tabs.announcements")}
            </Tab>
            <Tab value="news">{t("routes.home.news.tabs.news")}</Tab>
          </TabList>
          <TabPanel value="announcement" className="mt-2">
            <NewsList items={announcements} lang={lang} />
          </TabPanel>
          <TabPanel value="news" className="mt-2">
            <NewsList items={newsItems} lang={lang} />
          </TabPanel>
        </Tabs>
        <div className="mt-4 text-right">
          <TextLink to="/news" className="text-sm">
            {t("routes.home.news.viewMore")}
            <span aria-hidden={true}> →</span>
          </TextLink>
        </div>
      </section>
    </div>
  )
}

export default Home
