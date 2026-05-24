import { getServiceBySubmit } from "~/lib/content"
import type { Service } from "~/schemas/submit"

export type ServiceSource = "DDBJ" | "DBCLS"

export type SubmitMeta = {
  externalUrl: string
  accessionPlaceholders: readonly string[]
  source: ServiceSource | null
}

export const getSubmitMeta = (service: Service): SubmitMeta | undefined => {
  const entry = getServiceBySubmit(service)
  const submit = entry?.submit
  if (submit === undefined) return undefined

  return {
    externalUrl: submit.externalUrl,
    accessionPlaceholders: submit.accessionPlaceholders,
    source: submit.source,
  }
}
