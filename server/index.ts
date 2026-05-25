import { createRequestHandler } from "@react-router/express"
import express from "express"

import { handleLlmHealth } from "./api/llm/health"
import { handleMe } from "./api/me"
import { handleNews } from "./api/news"
import { handleRobots } from "./api/robots"
import { handleSearchSerialize } from "./api/search/serialize"
import { handleSitemap } from "./api/sitemap"
import { mountAuthRoutes } from "./auth/routes"
import { parseServerEnv } from "./lib/env"
import { createLogger } from "./lib/log"
import { securityHeaders } from "./lib/security"
import { makeHandleSearchAssistant } from "./llm/assistant/route"
import { createLlmClient } from "./llm/client"
import { startHealthMonitor } from "./llm/health"
import { createRateLimiter, setActiveRateLimiter } from "./llm/rate-limit"
import { createNewsMirror } from "./news/mirror"

const env = parseServerEnv()
const logger = createLogger(env.DB_PORTAL_LOG_LEVEL)
const isProd = process.env.NODE_ENV === "production"

const app = express()
app.disable("x-powered-by")
app.set("trust proxy", "loopback")
app.use(securityHeaders({ env: env.DB_PORTAL_ENV }))
app.use(express.json({ limit: "1mb" }))

const llmClient = createLlmClient(env)
setActiveRateLimiter(
  createRateLimiter({
    perIpPerMin: env.DB_PORTAL_LLM_RATE_LIMIT_PER_IP_MIN,
    perSessionPerMin: env.DB_PORTAL_LLM_RATE_LIMIT_PER_SESSION_MIN,
  }),
)

app.get("/api/me", handleMe)
app.get("/api/news", handleNews)
app.get("/api/llm/health", handleLlmHealth)
app.post("/api/llm/search-assistant", makeHandleSearchAssistant(env, logger, { client: llmClient }))
app.post("/api/search/serialize", handleSearchSerialize)
app.get("/sitemap.xml", handleSitemap(env))
app.get("/robots.txt", handleRobots(env))
mountAuthRoutes(app, env, logger)

const getLoadContext = (_req: express.Request, res: express.Response) => ({
  cspNonce: (res.locals.cspNonce as string | undefined) ?? "",
})

if (isProd) {
  app.use(
    "/assets",
    express.static("./build/client/assets", { immutable: true, maxAge: "1y" }),
  )
  app.use(express.static("./build/client", { maxAge: "1h" }))
  const buildModulePath = "../build/server/index.js"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const build = (await import(/* @vite-ignore */ buildModulePath)) as any
  app.all("*", createRequestHandler({ build, mode: "production", getLoadContext }))
} else {
  const { createServer } = await import("vite")
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  })
  app.use(vite.middlewares)
  app.all(
    "*",
    createRequestHandler({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      build: () => vite.ssrLoadModule("virtual:react-router/server-build") as any,
      mode: "development",
      getLoadContext,
    }),
  )
}

createNewsMirror(env, logger).mirror.start()
startHealthMonitor(llmClient, logger).start()

const port = env.DB_PORTAL_APP_INTERNAL_PORT
app.listen(port, () => {
  logger.info("server_listening", { port, env: env.DB_PORTAL_ENV })
})
