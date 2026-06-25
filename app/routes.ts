import { type RouteConfig } from "@react-router/dev/routes"

import { designRoutes, devContentRoutes, index, layout, route } from "./lib/routes-helpers"

export default [
  index("routes/top/route.tsx"),
  route("search", "routes/search/route.tsx"),
  route("search/results", "routes/search-results/route.tsx"),
  route("submit", "routes/submit/route.tsx"),
  route("news", "routes/news/route.tsx"),
  route("services", "routes/services/route.tsx"),
  route("databases/:slug", "routes/databases/$slug.tsx"),
  route("api/set-lang", "routes/api.set-lang.ts"),
  layout("routes/auth/layout.tsx", [
    route("auth/callback", "routes/auth/callback.tsx"),
    route("auth/silent-callback", "routes/auth/silent-callback.tsx"),
    route("auth/logout-callback", "routes/auth/logout-callback.tsx"),
  ]),
  ...designRoutes(),
  ...devContentRoutes(),
] satisfies RouteConfig
