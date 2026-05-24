import type { Logger } from "../lib/log"

const GITHUB_API_ORIGIN = "https://api.github.com"

const USER_AGENT = "db-portal"

export type GitHubClientConfig = {
  repo: string
  branch: string
  token: string | undefined
  logger: Logger
  fetchImpl?: typeof fetch
}

export type ContentEntry = {
  name: string
  path: string
  download_url: string | null
  sha: string
}

export type CompareFile = {
  filename: string
  status: "added" | "modified" | "removed" | "renamed" | "copied" | "changed" | "unchanged"
  previous_filename?: string
}

type FetchOk = { ok: true; status: number; body: unknown; etag: string | undefined }
type FetchFail = { ok: false; status: number; body: string }
type FetchOutcome = FetchOk | FetchFail

const buildHeaders = (token: string | undefined, extra?: HeadersInit): Headers => {
  const headers = new Headers(extra)
  headers.set("Accept", "application/vnd.github+json")
  headers.set("User-Agent", USER_AGENT)
  headers.set("X-GitHub-Api-Version", "2022-11-28")
  if (token) headers.set("Authorization", `Bearer ${token}`)

  return headers
}

const requestJson = async (
  url: string,
  init: RequestInit,
  client: GitHubClientConfig,
): Promise<FetchOutcome> => {
  const fetcher = client.fetchImpl ?? fetch
  const response = await fetcher(url, init)
  const etag = response.headers.get("etag") ?? undefined
  if (response.status === 304) return { ok: true, status: 304, body: undefined, etag }
  if (!response.ok) {
    const body = await response.text()
    client.logger.warn("news_github_request_failed", {
      url,
      status: response.status,
      bodyExcerpt: body.slice(0, 200),
    })

    return { ok: false, status: response.status, body }
  }
  const body = (await response.json()) as unknown

  return { ok: true, status: response.status, body, etag }
}

export const fetchLatestCommitSha = async (
  client: GitHubClientConfig,
  path: string,
): Promise<string | undefined> => {
  const url = new URL(`${GITHUB_API_ORIGIN}/repos/${client.repo}/commits`)
  url.searchParams.set("path", path)
  url.searchParams.set("per_page", "1")
  url.searchParams.set("sha", client.branch)
  const outcome = await requestJson(url.toString(), { headers: buildHeaders(client.token) }, client)
  if (!outcome.ok) return undefined
  const body = outcome.body
  if (!Array.isArray(body) || body.length === 0) return undefined
  const top = body[0] as { sha?: unknown }

  return typeof top.sha === "string" ? top.sha : undefined
}

export const fetchContents = async (
  client: GitHubClientConfig,
  path: string,
): Promise<ContentEntry[]> => {
  const url = new URL(`${GITHUB_API_ORIGIN}/repos/${client.repo}/contents/${path}`)
  url.searchParams.set("ref", client.branch)
  const outcome = await requestJson(url.toString(), { headers: buildHeaders(client.token) }, client)
  if (!outcome.ok || !Array.isArray(outcome.body)) return []

  return outcome.body.flatMap((entry): ContentEntry[] => {
    if (
      entry === null
      || typeof entry !== "object"
      || (entry as { type?: unknown }).type !== "file"
    ) return []
    const raw = entry as Record<string, unknown>
    const name = typeof raw.name === "string" ? raw.name : undefined
    const filePath = typeof raw.path === "string" ? raw.path : undefined
    const download = typeof raw.download_url === "string" ? raw.download_url : null
    const sha = typeof raw.sha === "string" ? raw.sha : undefined
    if (!name || !filePath || !sha) return []

    return [{ name, path: filePath, download_url: download, sha }]
  })
}

export const compareCommits = async (
  client: GitHubClientConfig,
  baseSha: string,
  headSha: string,
): Promise<CompareFile[] | undefined> => {
  const url = `${GITHUB_API_ORIGIN}/repos/${client.repo}/compare/${baseSha}...${headSha}`
  const outcome = await requestJson(url, { headers: buildHeaders(client.token) }, client)
  if (!outcome.ok) return undefined
  const body = outcome.body
  if (
    body === null
    || typeof body !== "object"
    || !Array.isArray((body as { files?: unknown }).files)
  ) return []

  return (body as { files: unknown[] }).files.flatMap((file): CompareFile[] => {
    if (file === null || typeof file !== "object") return []
    const raw = file as Record<string, unknown>
    const filename = typeof raw.filename === "string" ? raw.filename : undefined
    const status = typeof raw.status === "string" ? raw.status : undefined
    if (!filename || !status) return []
    const previous = typeof raw.previous_filename === "string"
      ? raw.previous_filename
      : undefined

    return [{
      filename,
      status: status as CompareFile["status"],
      ...(previous ? { previous_filename: previous } : {}),
    }]
  })
}

export const fetchRawText = async (
  client: GitHubClientConfig,
  url: string,
): Promise<string | undefined> => {
  const fetcher = client.fetchImpl ?? fetch
  const response = await fetcher(url, { headers: buildHeaders(client.token) })
  if (!response.ok) {
    client.logger.warn("news_github_raw_failed", { url, status: response.status })

    return undefined
  }

  return response.text()
}
