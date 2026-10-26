import type { LoaderFunctionArgs } from "react-router"

import { readSubmitParams } from "~/lib/submit-url"

export const loader = ({ url }: LoaderFunctionArgs) => {
  return { urlState: readSubmitParams(url.searchParams) }
}
