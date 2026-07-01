import crypto from "node:crypto"

import type { RequestHandler } from "express"

type SecurityHeadersOptions = {
  env: "dev" | "staging" | "production"
  searchApiUrl?: string
}

const originOf = (url: string): string => {
  try {
    return new URL(url).origin
  } catch {
    return url
  }
}

// style-src の 'unsafe-inline' は既存の React inline style (style={{...}}) に
// 依存するため、 nonce/hash 化までは残す。 一方 object-src / frame-src / child-src
// は攻撃面が明確に閉じられるので現段階でも 'none' に狭める。 dev でも同じ CSP
// を emit することで開発時の accidental exposure を減らし、 CSP に噛む変更
// (nonce 抜けなど) が prod deploy 前に見える。
const buildCspHeader = (nonce: string, searchApiOrigin?: string): string =>
  [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    searchApiOrigin ? `connect-src 'self' ${searchApiOrigin}` : "connect-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "child-src 'none'",
    "worker-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ")

export const securityHeaders = ({ env, searchApiUrl }: SecurityHeadersOptions): RequestHandler =>
  (_req, res, next) => {
    const nonce = crypto.randomUUID()
    res.locals.cspNonce = nonce

    res.setHeader("X-Frame-Options", "DENY")
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")

    const searchApiOrigin = searchApiUrl ? originOf(searchApiUrl) : undefined
    res.setHeader("Content-Security-Policy", buildCspHeader(nonce, searchApiOrigin))

    if (env === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    }

    next()
  }
