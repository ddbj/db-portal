import type { Page } from "@playwright/test"

import { TEST_USER } from "./fixtures/users"

export type ScenarioContext = {
  page: Page
}

export const clearBrowserState = async (page: Page): Promise<void> => {
  await page.context().clearCookies()
  try {
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  } catch {
    // page may have navigated to a state without a window (e.g. before goto)
  }
}

export const getTestUserPassword = (): string => {
  const password = process.env[TEST_USER.passwordEnv]
  if (!password) {
    throw new Error(
      `Missing ${TEST_USER.passwordEnv} env. Set it before running auth specs.`,
    )
  }

  return password
}

const escapeForRegExp = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export const loginViaKeycloak = async (page: Page, returnTo = "/"): Promise<void> => {
  await page.goto(`/api/auth/login?return_to=${encodeURIComponent(returnTo)}`)
  await page.locator("#username").fill(TEST_USER.username)
  await page.locator("#password").fill(getTestUserPassword())
  await page.locator("#kc-login").click()
  await page.waitForURL(new RegExp(`${escapeForRegExp(returnTo)}$`))
}
