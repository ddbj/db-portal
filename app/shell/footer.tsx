import { useT } from "~/lib/i18n"

export const Footer = () => {
  const t = useT()

  return (
    <footer className="bg-ink text-white">
      <div className="max-w-content-max mx-auto px-page-gutter py-7 flex justify-between gap-6 flex-wrap text-fs-body">
        <div>
          <div className="font-bold text-base">{t("footer.orgFullName")}</div>
          <div className="opacity-70 mt-1">{t("footer.orgSubtitle")}</div>
        </div>
        <ul className="flex gap-7 list-none p-0 m-0 items-center flex-wrap">
          <li>
            <a
              href="https://www.ddbj.nig.ac.jp/about/index.html"
              className="text-white no-underline hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("footer.operatedBy")}
            </a>
          </li>
          <li>
            <a
              href="https://www.ddbj.nig.ac.jp/about/policies/index.html"
              className="text-white no-underline hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("footer.termsOfUse")}
            </a>
          </li>
          <li>
            <a
              href="https://www.ddbj.nig.ac.jp/about/policies/index.html#privacy"
              className="text-white no-underline hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("footer.privacy")}
            </a>
          </li>
          <li>
            <a
              href="https://www.ddbj.nig.ac.jp/about/policies/accessibility.html"
              className="text-white no-underline hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("footer.accessibility")}
            </a>
          </li>
        </ul>
      </div>
    </footer>
  )
}
