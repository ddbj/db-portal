import type { Lang } from "~/lib/i18n/use-lang"
import { useT } from "~/lib/i18n/use-t"
import { PageTitle, TextLink } from "~/ui"

export type ErrorKind = "not-found" | "generic"

type ErrorPageProps = {
  kind: ErrorKind
  lang: Lang
}

export const ErrorPage = ({ kind, lang }: ErrorPageProps) => {
  const t = useT()
  const home = lang === "en" ? "/en" : "/"
  const ns = kind === "not-found" ? "errors.notFound" : "errors.generic"

  return (
    <div role="alert" aria-live="polite">
      <PageTitle
        title={t(`${ns}.title`)}
        subtitle={t(`${ns}.description`)}
      />
      <div className="px-page-gutter pb-section-md">
        <div className="max-w-content-max mx-auto">
          <TextLink to={home} weight="bold">
            {t(`${ns}.backToTop`)}
          </TextLink>
        </div>
      </div>
    </div>
  )
}
