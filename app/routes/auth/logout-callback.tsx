import { Link } from "react-router"

import { useT } from "~/lib/i18n"
import { PageTitle } from "~/ui"

const AuthLogoutCallback = () => {
  const t = useT()

  return (
    <main className="mx-auto max-w-content-max">
      <PageTitle
        title={t("auth.logoutCallback.title")}
        subtitle={t("auth.logoutCallback.description")}
      />
      <div className="px-page-gutter pb-section-md">
        <Link to="/" className="text-brand underline">
          {t("auth.logoutCallback.backHome")}
        </Link>
      </div>
    </main>
  )
}

export const handle = { i18n: { en: "complete" } } as const

export default AuthLogoutCallback
