import { test as setup } from "@playwright/test"

import { STORAGE_STATE_DIR, USER_STORAGE_STATE } from "./fixtures/users"
import { loginViaKeycloak } from "./helpers"

setup("authenticate-user", async ({ page }) => {
  await loginViaKeycloak(page, "/")
  await page.context().storageState({ path: USER_STORAGE_STATE })
  setup.info().attachments.push({
    name: "storage-state-dir",
    contentType: "text/plain",
    body: Buffer.from(STORAGE_STATE_DIR),
  })
})
