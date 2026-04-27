const fallback = "https://ddbj.nig.ac.jp/search/api"
const url = import.meta.env.VITE_DB_PORTAL_SEARCH_API_URL as string | undefined

if (import.meta.env.PROD && (url === undefined || url === "")) {
  throw new Error("VITE_DB_PORTAL_SEARCH_API_URL is not set in production")
}

export const SEARCH_API_URL: string = url ?? fallback
