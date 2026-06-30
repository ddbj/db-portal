import crypto from "node:crypto"

import type { Request, Response, Router } from "express"

import { handleMe } from "../api/me"
import type { ServerEnv } from "../lib/env"
import type { Logger } from "../lib/log"
import { clearSidCookie, getSidFromHeader, setSidCookie } from "./cookie"
import {
  buildAuthorizeUrl,
  buildLogoutUrl,
  exchangeCodeForTokens,
  extractUserInfo,
  generateNonce,
  generatePkce,
  generateState,
  IdTokenValidationError,
  type OidcConfig,
} from "./oidc"
import { pendingLogins } from "./pending-logins"
import { normalizeReturnTo } from "./return-to"
import { sessionStore } from "./session-store"

const isSecureRuntime = (env: ServerEnv): boolean => env.DB_PORTAL_ENV !== "dev"

const oidcConfig = (env: ServerEnv): OidcConfig => ({
  realmUrl: env.DB_PORTAL_KEYCLOAK_REALM_URL,
  clientId: env.DB_PORTAL_KEYCLOAK_CLIENT_ID,
  redirectUri: `${env.DB_PORTAL_PORTAL_ORIGIN}/api/auth/callback`,
})

const logoutRedirectUri = (env: ServerEnv): string =>
  `${env.DB_PORTAL_PORTAL_ORIGIN}/api/auth/logout-callback`

const sendError = (res: Response, status: number, code: string): void => {
  res.status(status).json({ error: code })
}

export const mountAuthRoutes = (router: Router, env: ServerEnv, logger: Logger): void => {
  const config = oidcConfig(env)
  const cookieOpts = { secure: isSecureRuntime(env) }

  // /api/me は handler が session-store に直接触る auth surface の一部なので、
  // docs/auth.md の SSOT 主張に従ってここに登録する (server/api/me.ts は handler
  // の実装を持つだけ)。
  router.get("/api/me", handleMe)

  router.get("/api/auth/login", (req: Request, res: Response): void => {
    const returnTo = normalizeReturnTo(
      typeof req.query.return_to === "string" ? req.query.return_to : undefined,
    )
    const { codeVerifier, codeChallenge } = generatePkce()
    const state = generateState()
    const nonce = generateNonce()
    pendingLogins.put({ codeVerifier, state, nonce, returnTo, createdAt: Date.now() })
    const url = buildAuthorizeUrl(config, state, codeChallenge, nonce)
    res.redirect(302, url)
  })

  router.get("/api/auth/callback", async (req: Request, res: Response): Promise<void> => {
    const code = typeof req.query.code === "string" ? req.query.code : undefined
    const state = typeof req.query.state === "string" ? req.query.state : undefined
    if (!code || !state) {
      sendError(res, 400, "invalid_request")

      return
    }
    const pending = pendingLogins.take(state)
    if (!pending) {
      logger.warn("auth_callback_invalid_state", { stateLen: state.length })
      sendError(res, 400, "invalid_state")

      return
    }
    try {
      const tokens = await exchangeCodeForTokens(config, code, pending.codeVerifier)
      const userInfo = extractUserInfo(tokens.idToken, {
        issuer: env.DB_PORTAL_KEYCLOAK_REALM_URL,
        audience: env.DB_PORTAL_KEYCLOAK_CLIENT_ID,
        nonce: pending.nonce,
      })
      const sid = crypto.randomUUID()
      sessionStore.set(sid, {
        tokens: { idToken: tokens.idToken },
        userInfo,
        expiresAt: 0,
      })
      res.setHeader("Set-Cookie", setSidCookie(sid, cookieOpts))
      logger.info("auth_login_success", { sub: userInfo.sub })
      res.redirect(302, normalizeReturnTo(pending.returnTo))
    } catch (error) {
      if (error instanceof IdTokenValidationError) {
        logger.warn("auth_callback_invalid_id_token", { reason: error.reason })
        sendError(res, 400, "invalid_id_token")

        return
      }
      logger.error("auth_callback_failed", {
        message: error instanceof Error ? error.message : String(error),
      })
      sendError(res, 502, "code_exchange_failed")
    }
  })

  router.get("/api/auth/logout", (req: Request, res: Response): void => {
    const returnTo = normalizeReturnTo(
      typeof req.query.return_to === "string" ? req.query.return_to : undefined,
    )
    const sid = getSidFromHeader(req.headers.cookie)
    const entry = sid ? sessionStore.get(sid) : undefined
    if (!sid || !entry) {
      // session が無くてもクライアント側は logout 動作完了と見なす
      res.setHeader("Set-Cookie", clearSidCookie(cookieOpts))
      res.redirect(302, returnTo)

      return
    }
    const postLogoutRedirect = `${logoutRedirectUri(env)}?return_to=${encodeURIComponent(returnTo)}`
    const url = buildLogoutUrl(config, entry.tokens.idToken, postLogoutRedirect)
    res.redirect(302, url)
  })

  router.get("/api/auth/logout-callback", (req: Request, res: Response): void => {
    const returnTo = normalizeReturnTo(
      typeof req.query.return_to === "string" ? req.query.return_to : undefined,
    )
    const sid = getSidFromHeader(req.headers.cookie)
    if (sid) sessionStore.remove(sid)
    res.setHeader("Set-Cookie", clearSidCookie(cookieOpts))
    res.redirect(302, returnTo)
  })
}
