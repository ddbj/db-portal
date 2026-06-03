import { useT } from "~/lib/i18n/use-t"
import { ArrowLeftIcon, PageTitle, TextLink } from "~/ui"

type ErrorKind = "not-found" | "generic"

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
            <ArrowLeftIcon size={14} aria-hidden />
            {t(`${ns}.backToTop`)}
          </TextLink>
        </div>
      </div>
    </div>
  )
}
