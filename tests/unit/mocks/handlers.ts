import { http, HttpResponse, type RequestHandler } from "msw"

import type { UserInfo } from "~/lib/auth/types"
import type { LlmHealth } from "~/schemas/api-bff/llm"
import type { NewsList } from "~/schemas/api-bff/news"
import type { ServiceList } from "~/schemas/api-bff/service"

const unsetHealth: LlmHealth = { status: "unset" }
const emptyNews: NewsList = []
const emptyServices: ServiceList = []

export const meAuthenticated = (user: UserInfo): RequestHandler =>
  http.get("*/api/me", () => HttpResponse.json({ user }))

export const meAnonymous = (): RequestHandler =>
  http.get("*/api/me", () => new HttpResponse(null, { status: 401 }))

export const newsList = (items: NewsList): RequestHandler =>
  http.get("*/api/news", () => HttpResponse.json(items))

export const servicesList = (items: ServiceList): RequestHandler =>
  http.get("*/api/services", () => HttpResponse.json(items))

export const llmHealth = (health: LlmHealth): RequestHandler =>
  http.get("*/api/llm/health", () => HttpResponse.json(health))

export const handlers: RequestHandler[] = [
  meAnonymous(),
  newsList(emptyNews),
  servicesList(emptyServices),
  llmHealth(unsetHealth),
]
