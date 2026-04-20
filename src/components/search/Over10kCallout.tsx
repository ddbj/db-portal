import { useTranslation } from "react-i18next"

import { Callout, TextLink } from "@/components/ui"
import type { DbId } from "@/types/db"

export interface Over10kCalloutProps {
  db: DbId
}

const Over10kCallout = ({ db }: Over10kCalloutProps) => {
  const { t } = useTranslation()

  return (
    <Callout type="info">
      <p>{t("routes.search.dbMode.over10k.message")}</p>
      <TextLink to={`/advanced-search?db=${db}`} className="mt-2 inline-block">
        {t("routes.search.dbMode.over10k.cta")}
      </TextLink>
    </Callout>
  )
}

export default Over10kCallout
