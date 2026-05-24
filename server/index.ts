import { createRequestHandler } from "@react-router/express"
import express from "express"

import { makeHandleLlmHealth } from "./api/llm/health"
import { handleLlmProxy } from "./api/llm/proxy"
import { handleMe } from "./api/me"
import { handleNews } from "./api/news"
import { handleSearchSerialize } from "./api/search/serialize"
import { mountAuthRoutes } from "./auth/routes"
import { parseServerEnv } from "./lib/env"
import { createLogger } from "./lib/log"
import { startNewsMirror } from "./news/mirror"

const env = parseServerEnv()
const logger = createLogger(env.DB_PORTAL_LOG_LEVEL)
const isProd = process.env.NODE_ENV === "production"

const app = express()
app.disable("x-powered-by")
app.use(express.json({ limit: "1mb" }))

app.get("/api/me", handleMe)
app.get("/api/news", handleNews)
app.get("/api/llm/health", makeHandleLlmHealth(env))
app.all("/api/llm/*", handleLlmProxy)
app.post("/api/search/serialize", handleSearchSerialize)
mountAuthRoutes(app)

if (isProd) {
  app.use(
    "/assets",
    express.static("./build/client/assets", { immutable: true, maxAge: "1y" }),
  )
  app.use(express.static("./build/client", { maxAge: "1h" }))
  const buildModulePath = "../build/server/index.js"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const build = (await import(/* @vite-ignore */ buildModulePath)) as any
  app.all("*", createRequestHandler({ build, mode: "production" }))
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
    }),
  )
}

startNewsMirror(env, logger).start()

const port = env.DB_PORTAL_APP_INTERNAL_PORT
app.listen(port, () => {
  logger.info("server_listening", { port, env: env.DB_PORTAL_ENV })
})
