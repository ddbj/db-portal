import { useMatches } from "react-router"

import { useT } from "~/lib/i18n/use-t"

export type BreadcrumbItem = {
  label: string
  href: string
}

type StaticHandle = { breadcrumbI18nKey: string }
type DynamicHandle = { breadcrumbResolver: string }

export type BreadcrumbResolverInput = {
  data: unknown
  pathname: string
  params: Readonly<Record<string, string | undefined>>
}

export type BreadcrumbResolver = (input: BreadcrumbResolverInput) => BreadcrumbItem | null

const isStaticHandle = (h: unknown): h is StaticHandle =>
  !!h && typeof h === "object" && typeof (h as Partial<StaticHandle>).breadcrumbI18nKey === "string"

const isDynamicHandle = (h: unknown): h is DynamicHandle =>
  !!h && typeof h === "object" && typeof (h as Partial<DynamicHandle>).breadcrumbResolver === "string"

export type BreadcrumbOptions = {
  resolvers?: Record<string, BreadcrumbResolver> | undefined
}

export const useBreadcrumb = (options: BreadcrumbOptions = {}): BreadcrumbItem[] => {
  const matches = useMatches()
  const t = useT()
  const resolvers = options.resolvers ?? {}
  const items: BreadcrumbItem[] = []
  for (const m of matches) {
    const handle = m.handle as unknown
    if (isStaticHandle(handle)) {
      items.push({ label: t(handle.breadcrumbI18nKey), href: m.pathname })
      continue
    }
    if (isDynamicHandle(handle)) {
      const resolver = resolvers[handle.breadcrumbResolver]
      if (!resolver) continue
      const item = resolver({ data: m.data, pathname: m.pathname, params: m.params })
      if (item) items.push(item)
    }
  }

  return items
}
