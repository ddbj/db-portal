import { type CardCopy, SUBMIT_CARDS } from "~/content/submit-routing/cards"
import { getServiceBySubmit } from "~/lib/content"
import type { Lang } from "~/lib/i18n"
import type { Service } from "~/schemas/submit"

export type ServiceSource = "DDBJ" | "DBCLS"

export type SubmitMeta = {
  externalUrl: string
  source: ServiceSource | null
}

export const getSubmitMeta = (service: Service, lang: Lang): SubmitMeta | undefined => {
  const entry = getServiceBySubmit(service)
  const submit = entry?.submit
  if (submit === undefined) return undefined

  const { externalUrl } = submit
  const resolvedUrl = externalUrl[lang] ?? externalUrl.ja

  return {
    externalUrl: resolvedUrl,
    source: submit.source,
  }
}

// 登録フロー詳細カードの service 別文言 (外部ウィザードの予告)。
export const getSubmitCard = (service: Service): CardCopy => SUBMIT_CARDS[service]
