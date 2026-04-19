import { useTranslation } from "react-i18next"

const Footer = () => {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-200 bg-white py-2">
      <div className="mx-auto max-w-6xl px-4 text-center text-xs font-light text-gray-400">
        {t("footer.copyright", { year })}
      </div>
    </footer>
  )
}

export default Footer
