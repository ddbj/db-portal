import crypto from "node:crypto"

import type { RequestHandler } from "express"

export type SecurityHeadersOptions = {
  env: "dev" | "staging" | "production"
}

const buildCspHeader = (nonce: string): string =>
  [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ")

export const securityHeaders = ({ env }: SecurityHeadersOptions): RequestHandler =>
  (_req, res, next) => {
    const nonce = crypto.randomUUID()
    res.locals.cspNonce = nonce

    res.setHeader("X-Frame-Options", "DENY")
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")

    if (env !== "dev") {
      res.setHeader("Content-Security-Policy", buildCspHeader(nonce))
    }

    if (env === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    }

    next()
  }
