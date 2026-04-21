import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"

import { Heading, LinkCard, SearchBox, type SelectOption } from "@/components/ui"
import { pickLang } from "@/i18n"
import { resolveMeta } from "@/i18n/server"
import { DATABASES, EXAMPLE_CHIPS } from "@/lib/mock-data"
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
  { title: data?.metaTitle ?? "DB ポータル (仮)" },
  { name: "description", content: data?.metaDescription ?? "DB ポータル (仮)" },
  { name: "robots", content: "index, follow" },
  { tagName: "link", rel: "canonical", href: `${PORTAL_ORIGIN}/` },
]

const Home = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [db, setDb] = useState<DbSelectValue>(ALL_DB_VALUE)

  const dbOptions: readonly SelectOption[] = [
    { value: ALL_DB_VALUE, label: t("routes.home.search.dbAll") },
    ...DATABASES.map((d) => ({ value: d.id, label: d.displayName })),
  ]

  const handleSubmit = (q: string) => {
    void navigate(buildSearchUrl({ q, db }))
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 pt-20 pb-24">
      <div className="text-center">
        <Heading level={1} className="text-4xl font-semibold tracking-wide text-gray-900">
          {t("routes.home.hero.title")}
        </Heading>
        <p className="mx-auto mt-4 max-w-xl text-base text-gray-600">
          {t("routes.home.hero.subtitle")}
        </p>
      </div>
      <SearchBox
        size="large"
        className="mt-12"
        placeholder={t("routes.home.search.placeholder")}
        helperText={t("routes.home.search.examplesLabel")}
        buttonLabel={t("routes.home.search.submit")}
        examples={EXAMPLE_CHIPS}
        dbOptions={dbOptions}
        selectedDb={db}
        onDbChange={(v) => setDb(v as DbSelectValue)}
        dbAriaLabel={t("routes.home.search.dbSelectorAria")}
        onSubmit={handleSubmit}
      />
      <div className="mt-20 grid grid-cols-1 gap-5 md:grid-cols-2">
        <LinkCard
          to="/advanced-search"
          color="primary"
          className="p-7"
          title={t("routes.home.cta.advancedSearch.title")}
          description={t("routes.home.cta.advancedSearch.description")}
          linkText={t("routes.home.cta.advancedSearch.link")}
        />
        <LinkCard
          to="/submit"
          color="primary"
          className="p-7"
          title={t("routes.home.cta.submit.title")}
          description={t("routes.home.cta.submit.description")}
          linkText={t("routes.home.cta.submit.link")}
        />
      </div>
    </section>
  )
}

export default Home
