import type { ActionFunctionArgs } from "react-router"
import { z } from "zod"

import { serializeLangCookie } from "~/lib/i18n/lang-cookie.server"

const langSchema = z.union([z.literal("ja"), z.literal("en")])

const isSecureRuntime = (): boolean => process.env.DB_PORTAL_ENV !== "dev"

export const action = async ({ request }: ActionFunctionArgs): Promise<Response> => {
  const formData = await request.formData()
  const parsed = langSchema.safeParse(formData.get("lang"))
  if (!parsed.success) {
    return new Response("invalid lang", { status: 400 })
  }
  const redirectTo = request.headers.get("Referer") ?? "/"
  return new Response(null, {
    status: 303,
    headers: {
      Location: redirectTo,
      "Set-Cookie": serializeLangCookie(parsed.data, { secure: isSecureRuntime() }),
    },
  })
}
