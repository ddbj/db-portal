import {
  index,
  layout,
  route,
  type RouteConfigEntry,
} from "@react-router/dev/routes"

const LANG_EN_LAYOUT = "routes/lang-en/layout.tsx"

type BilingualIndexEntry = {
  kind: "index"
  file: string
  baseId: string
}

type BilingualRouteEntry = {
  kind: "route"
  path: string
  file: string
  baseId: string
}

export type BilingualEntry = BilingualIndexEntry | BilingualRouteEntry

const buildEntry = (entry: BilingualEntry, id: string | undefined): RouteConfigEntry => {
  if (entry.kind === "index") {
    return id === undefined ? index(entry.file) : index(entry.file, { id })
  }

  return id === undefined ? route(entry.path, entry.file) : route(entry.path, entry.file, { id })
}

export const bilingualRoutes = (entries: readonly BilingualEntry[]): RouteConfigEntry[] => {
  const jaEntries = entries.map((e) => buildEntry(e, undefined))
  const enEntries = entries.map((e) => buildEntry(e, `${e.baseId}.en`))

  return [...jaEntries, route("en", LANG_EN_LAYOUT, enEntries)]
}

const isDesignPreviewEnabled =
  process.env.NODE_ENV !== "production"
  || process.env.DB_PORTAL_ENABLE_DESIGN_PREVIEW === "true"

export const designRoutes = (): RouteConfigEntry[] =>
  isDesignPreviewEnabled
    ? [
      route("_design", "routes/_design/layout.tsx", [
        index("routes/_design/index.tsx"),
        route("tokens", "routes/_design/tokens.tsx"),
        route("primitives", "routes/_design/primitives.tsx"),
      ]),
    ]
    : []

export { layout, route }
