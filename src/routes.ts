import { index, route, type RouteConfig } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("search", "routes/search.tsx"),
  route("advanced-search", "routes/advanced-search.tsx"),
  route("submit", "routes/submit.tsx"),
  route("submit-alt", "routes/submit-alt.tsx"),
  route("design-system", "routes/design-system.tsx"),
] satisfies RouteConfig
