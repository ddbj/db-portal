import { Link } from "react-router"

import { useLang, useT } from "~/lib/i18n"
import { PageTitle } from "~/ui"

const AuthCallback = () => {
  const t = useT()
  const lang = useLang()
  const homeHref = lang === "en" ? "/en" : "/"

  return (
    <main className="mx-auto max-w-content-max">
      <PageTitle
        title={t("auth.callback.title")}
        subtitle={t("auth.callback.description")}
      />
      <div className="px-page-gutter pb-section-md">
        <Link to={homeHref} className="text-brand underline">
          {t("auth.callback.backHome")}
        </Link>
      </div>
    </main>
  )
}

export const handle = { i18n: { en: "complete" } } as const

export default AuthCallback
