import type { paths } from "./openapi-types"

export type Paths = paths

const buildUrl = (path: string): string => {
  const base = import.meta.env.VITE_DB_PORTAL_SEARCH_API_URL ?? ""

  return base.endsWith("/") ? `${base.slice(0, -1)}${path}` : `${base}${path}`
}

export const apiFetch = async (
  path: string,
  init?: RequestInit,
): Promise<Response> =>
  fetch(buildUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })
