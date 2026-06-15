import type { ActionFunctionArgs } from "react-router"
import { z } from "zod"

import { isSecureRuntime, serializeLangCookie } from "~/lib/i18n/lang-cookie.server"

const langSchema = z.union([z.literal("ja"), z.literal("en")])

const isSafeRedirectPath = (raw: unknown): raw is string => {
  if (typeof raw !== "string") return false
  if (!raw.startsWith("/")) return false
  if (raw.startsWith("//")) return false
  if (raw.startsWith("/\\")) return false
  return true
}

const resolveRedirectTarget = (
  formRedirectTo: FormDataEntryValue | null,
  referer: string | null,
  requestUrl: string,
): string => {
  if (isSafeRedirectPath(formRedirectTo)) return formRedirectTo
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
  const redirectTo = resolveRedirectTarget(
    formData.get("redirectTo"),
    request.headers.get("Referer"),
    request.url,
  )
  return new Response(null, {
    status: 303,
    headers: {
      Location: redirectTo,
      "Set-Cookie": serializeLangCookie(parsed.data, { secure: isSecureRuntime() }),
    },
  })
}
