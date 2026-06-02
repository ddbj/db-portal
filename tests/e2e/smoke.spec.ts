import { expect, test } from "./helpers"

test("smoke_topRoute_returnsBrandTitle", async ({ page }) => {
  const response = await page.goto("/")
  expect(response?.ok()).toBe(true)
  await expect(page).toHaveTitle(/BSI/)
})
