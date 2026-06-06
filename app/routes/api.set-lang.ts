import type { ActionFunctionArgs } from "react-router"
import { z } from "zod"

import { isSecureRuntime, serializeLangCookie } from "~/lib/i18n/lang-cookie.server"

const langSchema = z.union([z.literal("ja"), z.literal("en")])

// Only redirect back to a same-origin path derived from the Referer; anything
// cross-origin or unparseable falls back to `/` so this endpoint cannot be used
// as an open redirect.
const safeRedirectTarget = (referer: string | null, requestUrl: string): string => {
  if (!referer) return "/"
  try {
    const ref = new URL(referer)
    if (ref.origin !== new URL(requestUrl).origin) return "/"

    return ref.pathname + ref.search
  } catch {
    return "/"
  }
}

export const action = async ({ request }: ActionFunctionArgs): Promise<Response> => {
  const formData = await request.formData()
  const parsed = langSchema.safeParse(formData.get("lang"))
  if (!parsed.success) {
    return new Response("invalid lang", { status: 400 })
  }
  const redirectTo = safeRedirectTarget(request.headers.get("Referer"), request.url)
  return new Response(null, {
    status: 303,
    headers: {
      Location: redirectTo,
      "Set-Cookie": serializeLangCookie(parsed.data, { secure: isSecureRuntime() }),
    },
  })
}
