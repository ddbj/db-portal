import type { LoaderFunctionArgs } from "react-router"

import { readSubmitParams } from "~/lib/submit-url"

export const loader = ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url)

  return { urlState: readSubmitParams(url.searchParams) }
}
