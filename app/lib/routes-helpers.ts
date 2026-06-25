import {
  index,
  layout,
  route,
  type RouteConfigEntry,
} from "@react-router/dev/routes"

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
        route("submit-flow-explorer", "routes/_design/submit-flow-explorer.tsx"),
      ]),
    ]
    : []

export const devContentRoutes = (): RouteConfigEntry[] =>
  isDesignPreviewEnabled
    ? [route("_dev/*", "routes/_dev/page-content.tsx")]
    : []

export { index, layout, route }
