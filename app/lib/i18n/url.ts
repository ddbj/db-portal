import type { Lang } from "./use-lang"

export const getCounterpartUrl = (pathname: string, target: Lang): string => {
  if (target === "en") {
    if (pathname === "/") return "/en"

    return `/en${pathname.startsWith("/") ? pathname : `/${pathname}`}`
  }
  if (pathname === "/en") return "/"
  if (pathname.startsWith("/en/")) return pathname.slice(3)

  return pathname
}
