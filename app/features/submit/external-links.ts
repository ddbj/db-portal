import { type CardCopy, SUBMIT_CARDS } from "~/content/submit-routing/cards"
import { getServiceBySubmit } from "~/lib/content"
import type { Service } from "~/schemas/submit"

export type ServiceSource = "DDBJ" | "DBCLS"

export type SubmitMeta = {
  externalUrl: string
  source: ServiceSource | null
}

export const getSubmitMeta = (service: Service): SubmitMeta | undefined => {
  const entry = getServiceBySubmit(service)
  const submit = entry?.submit
  if (submit === undefined) return undefined

  return {
    externalUrl: submit.externalUrl,
    source: submit.source,
  }
}

// 登録フロー詳細カードの service 別文言 (外部ウィザードの予告)。
export const getSubmitCard = (service: Service): CardCopy => SUBMIT_CARDS[service]
