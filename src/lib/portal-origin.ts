const fallback = "https://portal.ddbj.nig.ac.jp"
const origin = import.meta.env.VITE_PORTAL_ORIGIN as string | undefined

if (import.meta.env.PROD && (origin === undefined || origin === "")) {
  throw new Error("VITE_PORTAL_ORIGIN is not set in production")
}

export const PORTAL_ORIGIN: string = origin ?? fallback
