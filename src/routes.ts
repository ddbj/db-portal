import { index, route, type RouteConfig } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("search", "routes/search.tsx"),
  route("search/results", "routes/search.results.tsx"),
  route("submit-alt3", "routes/submit-alt3.tsx"),
  route("news", "routes/news.tsx"),
  route("api/news", "routes/api.news.ts"),
  route("api/llm/suggest", "routes/api.llm.suggest.ts"),
  route("design-system", "routes/design-system.tsx"),
] satisfies RouteConfig
