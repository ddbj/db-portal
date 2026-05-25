import path from "node:path"

export const STORAGE_STATE_DIR = path.join(import.meta.dirname, "..", ".auth")
export const USER_STORAGE_STATE = path.join(STORAGE_STATE_DIR, "user.json")

export const TEST_USER = {
  username: "ts-db-portal-dev",
  passwordEnv: "DB_PORTAL_E2E_USER_PASSWORD",
} as const
