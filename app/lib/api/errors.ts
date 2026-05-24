import { z } from "zod"

const ProblemDetails = z.object({
  type: z.string().default("about:blank"),
  title: z.string().default(""),
  status: z.number().int().optional(),
  detail: z.string().optional(),
  instance: z.string().optional(),
}).passthrough()

export type ProblemDetails = z.infer<typeof ProblemDetails>

export type APIErrorInit = {
  status: number
  type?: string | undefined
  title?: string | undefined
  detail?: string | undefined
  instance?: string | undefined
}

export class APIError extends Error {
  readonly status: number
  readonly type: string
  readonly title: string
  readonly detail?: string | undefined
  readonly instance?: string | undefined

  constructor(init: APIErrorInit) {
    const title = init.title ?? ""
    super(title ? `${init.status} ${title}` : `HTTP ${init.status}`)
    this.name = "APIError"
    this.status = init.status
    this.type = init.type ?? "about:blank"
    this.title = title
    this.detail = init.detail
    this.instance = init.instance
  }
}

export const isAPIError = (value: unknown): value is APIError =>
  value instanceof APIError

const isProblemJson = (contentType: string): boolean =>
  contentType.includes("application/problem+json") || contentType.includes("application/json")

export const toAPIError = async (response: Response): Promise<APIError> => {
  const contentType = response.headers.get("content-type") ?? ""
  let parsed: Partial<ProblemDetails> = {}
  if (isProblemJson(contentType)) {
    try {
      const body = await response.json() as unknown
      const result = ProblemDetails.safeParse(body)
      if (result.success) parsed = result.data
    } catch {
      // body is not JSON-decodable; fall back to status text
    }
  }

  return new APIError({
    status: parsed.status ?? response.status,
    type: parsed.type,
    title: parsed.title || response.statusText || undefined,
    detail: parsed.detail,
    instance: parsed.instance,
  })
}
