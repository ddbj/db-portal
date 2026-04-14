import { index, route, type RouteConfig } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("design-system", "routes/design-system.tsx"),
] satisfies RouteConfig
