import { index, layout, route, type RouteConfig } from "@react-router/dev/routes"

const isDesignPreviewEnabled =
  process.env.NODE_ENV !== "production"
  || process.env.DB_PORTAL_ENABLE_DESIGN_PREVIEW === "true"

const designRoutes = isDesignPreviewEnabled
  ? [
    route("_design", "routes/_design/layout.tsx", [
      index("routes/_design/index.tsx"),
      route("tokens", "routes/_design/tokens.tsx"),
      route("primitives", "routes/_design/primitives.tsx"),
    ]),
  ]
  : []

export default [
  index("routes/top/route.tsx"),
  route("search", "routes/search/route.tsx"),
  route("search/results", "routes/search-results/route.tsx"),
  route("submit", "routes/submit/route.tsx"),
  route("news", "routes/news/route.tsx"),
  route("databases/:slug", "routes/databases/$slug.tsx"),
  layout("routes/auth/layout.tsx", [
    route("auth/callback", "routes/auth/callback.tsx"),
    route("auth/silent-callback", "routes/auth/silent-callback.tsx"),
    route("auth/logout-callback", "routes/auth/logout-callback.tsx"),
  ]),
  route("en", "routes/lang-en/layout.tsx", [
    index("routes/top/route.tsx", { id: "top.en" }),
    route("search", "routes/search/route.tsx", { id: "search.en" }),
    route("search/results", "routes/search-results/route.tsx", { id: "search-results.en" }),
    route("submit", "routes/submit/route.tsx", { id: "submit.en" }),
    route("news", "routes/news/route.tsx", { id: "news.en" }),
    route("databases/:slug", "routes/databases/$slug.tsx", { id: "databases-slug.en" }),
  ]),
  ...designRoutes,
] satisfies RouteConfig
