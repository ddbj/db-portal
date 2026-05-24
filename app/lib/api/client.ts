import { toAPIError } from "./errors"
import type { paths } from "./openapi-types"

export type Paths = paths

type GetOp<P extends keyof paths> = paths[P] extends { get: infer Op } ? Op : never
type PostOp<P extends keyof paths> = paths[P] extends { post: infer Op } ? Op : never

type RequestBody<Op> = Op extends { requestBody: { content: { "application/json": infer B } } } ? B : never
type QueryParams<Op> = Op extends { parameters: { query?: infer Q } } ? Q : never
type ResponseBody<Op> = Op extends { responses: { 200: { content: { "application/json": infer R } } } } ? R : never

export type ApiRequestOptions = {
  baseUrl: string
  signal?: AbortSignal
  headers?: HeadersInit
}

type GetOptions<P extends keyof paths> = ApiRequestOptions & (
  QueryParams<GetOp<P>> extends never
    ? { query?: undefined }
    : { query?: QueryParams<GetOp<P>> }
)

type PostOptions<P extends keyof paths> = ApiRequestOptions & (
  QueryParams<PostOp<P>> extends never
    ? { query?: undefined }
    : { query?: QueryParams<PostOp<P>> }
)

export const joinUrl = (baseUrl: string | undefined, path: string): string => {
  if (!baseUrl) return path
  const b = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl
  const p = path.startsWith("/") ? path : `/${path}`

  return `${b}${p}`
}

export const encodeQuery = (query: Record<string, unknown> | undefined): string => {
  if (!query) return ""
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v === undefined || v === null) continue
        params.append(key, String(v))
      }
    } else {
      params.set(key, String(value))
    }
  }
  const s = params.toString()

  return s ? `?${s}` : ""
}

const consumeJsonBody = async <T>(response: Response): Promise<T> => {
  if (response.status === 204) return undefined as T
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("json")) return undefined as T

  return await response.json() as T
}

export const apiGet = async <P extends keyof paths & string>(
  path: P,
  options: GetOptions<P>,
): Promise<ResponseBody<GetOp<P>>> => {
  const url = `${joinUrl(options.baseUrl, path)}${encodeQuery(options.query as Record<string, unknown> | undefined)}`
  const init: RequestInit = {
    method: "GET",
    headers: { Accept: "application/json", ...options.headers },
  }
  if (options.signal) init.signal = options.signal
  const response = await fetch(url, init)
  if (!response.ok) throw await toAPIError(response)

  return consumeJsonBody<ResponseBody<GetOp<P>>>(response)
}

export const apiPost = async <P extends keyof paths & string>(
  path: P,
  body: RequestBody<PostOp<P>>,
  options: PostOptions<P>,
): Promise<ResponseBody<PostOp<P>>> => {
  const url = `${joinUrl(options.baseUrl, path)}${encodeQuery(options.query as Record<string, unknown> | undefined)}`
  const init: RequestInit = {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: JSON.stringify(body),
  }
  if (options.signal) init.signal = options.signal
  const response = await fetch(url, init)
  if (!response.ok) throw await toAPIError(response)

  return consumeJsonBody<ResponseBody<PostOp<P>>>(response)
}
