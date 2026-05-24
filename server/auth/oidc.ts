export type PendingLogin = {
  codeVerifier: string
  state: string
  returnTo: string
  createdAt: number
}

export type AuthorizeUrlConfig = {
  realmUrl: string
  clientId: string
  redirectUri: string
}

export const buildAuthorizeUrl = (_config: AuthorizeUrlConfig, _returnTo: string): { url: string; state: string } => {
  throw new Error("OIDC code exchange not implemented")
}

export type RefreshedTokens = {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export const exchangeCodeForTokens = async (): Promise<RefreshedTokens> => {
  throw new Error("OIDC code exchange not implemented")
}

export const refreshTokens = async (): Promise<RefreshedTokens> => {
  throw new Error("OIDC token refresh not implemented")
}
