import { useT } from "~/lib/i18n"
import { ArrowLeftIcon, PageTitle, TextLink } from "~/ui"

const AuthCallback = () => {
  const t = useT()

  return (
    <main className="mx-auto max-w-content-max">
      <PageTitle
        title={t("auth.callback.title")}
        subtitle={t("auth.callback.description")}
      />
      <div className="px-page-gutter pb-section-md">
        <TextLink to="/" weight="bold">
          <ArrowLeftIcon size={14} aria-hidden />
          {t("auth.callback.backHome")}
        </TextLink>
      </div>
    </main>
  )
}

export const handle = { i18n: { en: "complete" } } as const

export default AuthCallback
