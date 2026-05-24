import { type RouteConfig } from "@react-router/dev/routes"

import {
  type BilingualEntry,
  bilingualRoutes,
  designRoutes,
  layout,
  route,
} from "./lib/routes-helpers"

const bilingualEntries: BilingualEntry[] = [
  { kind: "index", file: "routes/top/route.tsx", baseId: "top" },
  { kind: "route", path: "search", file: "routes/search/route.tsx", baseId: "search" },
  { kind: "route", path: "search/results", file: "routes/search-results/route.tsx", baseId: "search-results" },
  { kind: "route", path: "submit", file: "routes/submit/route.tsx", baseId: "submit" },
  { kind: "route", path: "news", file: "routes/news/route.tsx", baseId: "news" },
  { kind: "route", path: "databases/:slug", file: "routes/databases/$slug.tsx", baseId: "databases-slug" },
]

export default [
  ...bilingualRoutes(bilingualEntries),
  layout("routes/auth/layout.tsx", [
    route("auth/callback", "routes/auth/callback.tsx"),
    route("auth/silent-callback", "routes/auth/silent-callback.tsx"),
    route("auth/logout-callback", "routes/auth/logout-callback.tsx"),
  ]),
  ...designRoutes(),
] satisfies RouteConfig
