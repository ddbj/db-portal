import { createRequestHandler } from "@react-router/express"
import express from "express"

import { handleLlmHealth } from "./api/llm/health"
import { handleNews } from "./api/news"
import { handleRobots } from "./api/robots"
import { handleServices } from "./api/services"
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
import { createServicesMirror } from "./services/mirror"

const env = parseServerEnv()
const logger = createLogger(env.DB_PORTAL_LOG_LEVEL)
const isProd = process.env.NODE_ENV === "production"

// Express `trust proxy` accepts a hop count, a boolean, or a preset/IP list. The
// app sits behind the NIG reverse proxy via a container port-map, so the socket
// peer is the bridge gateway (not loopback); each env sets the value that makes
// `req.ip` resolve to the real client (see docs/deployment.md).
const parseTrustProxy = (value: string): boolean | number | string => {
  if (value === "true") return true
  if (value === "false") return false
  const n = Number(value)

  return Number.isInteger(n) && String(n) === value ? n : value
}

const app = express()
app.disable("x-powered-by")
app.set("trust proxy", parseTrustProxy(env.DB_PORTAL_TRUST_PROXY))
app.use(securityHeaders({ env: env.DB_PORTAL_ENV, searchApiUrl: env.DB_PORTAL_SEARCH_API_URL }))

// LLM prompt body は短い自然文なので 32KB で十分。 global で 1MB を許すと、
// route handler 内の LLM rate-limit に到達する前に毎リクエストが parse コストを
// 生んで amplification 経路になる (`docs/llm.md` の rate-limit 不変量)。 narrow
// に POST /api/llm/* だけに mount する。
const llmJsonParser = express.json({ limit: "32kb" })

const llmClient = createLlmClient(env)
setActiveRateLimiter(
  createRateLimiter({
    perIpPerMin: env.DB_PORTAL_LLM_RATE_LIMIT_PER_IP_MIN,
    perSessionPerMin: env.DB_PORTAL_LLM_RATE_LIMIT_PER_SESSION_MIN,
  }),
)

// `req.path` excludes the query string, so Vite-internal requests like
// `index.md?import&raw` fall through to the Vite dev middleware below.
const PAGE_ASSET_EXTENSIONS = /\.(png|jpg|jpeg|gif|svg|webp|avif|pdf)$/i
const pageAssetStatic = express.static("./page-contents", { maxAge: "1h", fallthrough: false })
app.use("/page-contents", (req, res, next) => {
  if (!PAGE_ASSET_EXTENSIONS.test(req.path)) return next()
  pageAssetStatic(req, res, next)
})

app.get("/api/news", handleNews)
app.get("/api/services", handleServices)
app.get("/api/llm/health", handleLlmHealth)
app.post("/api/llm/search-assistant", llmJsonParser, makeHandleSearchAssistant(env, logger, { client: llmClient }))
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

const servicesMirror = createServicesMirror(env, logger)
// Load the services cache from disk before the news mirror starts: news syncs
// drive servicesMirror.rebuildSource via onSourceSynced, and the disk load must
// not overwrite a state already rebuilt by that path.
await servicesMirror.init()
const newsMirror = createNewsMirror(env, logger, {
  onSourceSynced: servicesMirror.rebuildSource,
}).mirror
newsMirror.start()
const healthMonitor = startHealthMonitor(llmClient, logger)
healthMonitor.start()

const port = env.DB_PORTAL_APP_INTERNAL_PORT
const server = app.listen(port, () => {
  logger.info("server_listening", { port, env: env.DB_PORTAL_ENV })
})

// Graceful shutdown bounds the deploy swap window: stop background timers, drop
// idle keep-alive connections, and exit as soon as in-flight requests drain.
// Long-lived connections (LLM SSE) are cut off after a grace period so stop
// never waits for the SIGKILL timeout. The empty write flushes the shutdown log
// (stdout is a pipe) before exiting.
const SHUTDOWN_GRACE_MS = 3000
let shuttingDown = false
const finish = () => process.stdout.write("", () => process.exit(0))
const shutdown = (signal: NodeJS.Signals) => {
  if (shuttingDown) return
  shuttingDown = true
  logger.info("server_shutdown", { signal })
  newsMirror.stop()
  healthMonitor.stop()
  server.closeIdleConnections()
  server.close(finish)
  // grace 経過時点で残っている long-lived connection (SSE stream 等) を強制
  // close し、 SIGKILL 待ちを防ぐ。 closeAllConnections は Node 18.2+ で利用可能。
  setTimeout(() => {
    server.closeAllConnections?.()
    finish()
  }, SHUTDOWN_GRACE_MS).unref()
}
process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))
