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

const buildCspHeader = (nonce: string, searchApiOrigin?: string): string =>
  [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    searchApiOrigin ? `connect-src 'self' ${searchApiOrigin}` : "connect-src 'self'",
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

    if (env !== "dev") {
      const searchApiOrigin = searchApiUrl ? originOf(searchApiUrl) : undefined
      res.setHeader("Content-Security-Policy", buildCspHeader(nonce, searchApiOrigin))
    }

    if (env === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    }

    next()
  }
