import { useT } from "~/lib/i18n/use-t"
import { PageTitle, TextLink } from "~/ui"

export type ErrorKind = "not-found" | "generic"

type ErrorPageProps = {
  kind: ErrorKind
}

export const ErrorPage = ({ kind }: ErrorPageProps) => {
  const t = useT()
  const ns = kind === "not-found" ? "errors.notFound" : "errors.generic"

  return (
    <div role="alert" aria-live="assertive">
      <PageTitle
        title={t(`${ns}.title`)}
        subtitle={t(`${ns}.description`)}
      />
      <div className="px-page-gutter pb-section-md">
        <div className="max-w-content-max mx-auto">
          <TextLink to="/" weight="bold">
            {t(`${ns}.backToTop`)}
          </TextLink>
        </div>
      </div>
    </div>
  )
}
