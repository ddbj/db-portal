import { expect, test } from "@playwright/test"

test.describe("Phase 4: Submit (/submit)", () => {

  test("initial render shows hero, active microbial card, tree and Detail Panel overview", async ({ page }) => {
    const response = await page.goto("/submit")
    expect(response?.status()).toBe(200)
    await expect(page.getByRole("heading", { level: 1, name: "登録ナビゲーション" })).toBeVisible()
    // 9 枚のカードが描画される（aria-pressed="true" で active を特定）
    await expect(page.getByRole("button", { name: /微生物ゲノム/, pressed: true })).toBeVisible()
    // Tree と Detail Panel（初期は microbial 概要レベル）
    await expect(page.getByRole("heading", { level: 2, name: "詳細" })).toBeVisible()
    await expect(page.getByText(/3 層構造で登録/)).toBeVisible()
  })

  test("all 9 use case cards are rendered", async ({ page }) => {
    await page.goto("/submit")
    for (const name of [
      "微生物ゲノム",
      "真核生物ゲノム",
      "メタゲノム / MAG / SAG",
      "遺伝子発現",
      "変異データ",
      "プロテオミクス",
      "メタボロミクス",
      "小規模塩基配列・PCR 産物",
      "ヒト制限アクセス",
    ]) {
      await expect(page.getByRole("button", { name: new RegExp(name) })).toBeVisible()
    }
  })

  test("?for=prokaryote-raw-assembly renders the microbial genome leaf TSX content", async ({ page }) => {
    await page.goto("/submit?for=prokaryote-raw-assembly")
    await expect(page.getByRole("heading", { name: "登録の流れ" })).toBeVisible()
    // Badge に goal が出る
    await expect(page.getByText("BP+BS+DRA+MSS", { exact: true }).first()).toBeVisible()
    // 戻りリンク
    await expect(page.getByRole("button", { name: /概要に戻る/ })).toBeVisible()
  })

  test("?for=eukaryote-raw-assembly renders the eukaryote genome leaf TSX content", async ({ page }) => {
    await page.goto("/submit?for=eukaryote-raw-assembly")
    await expect(page.getByRole("heading", { name: "生物種ごとの BioSample パッケージ・qualifier" })).toBeVisible()
  })

  test("?for=<placeholder leaf> shows 準備中 and a back-to-overview action", async ({ page }) => {
    await page.goto("/submit?for=metagenome-genome-bin")
    await expect(page.getByText("詳細は準備中です")).toBeVisible()
    await expect(page.getByRole("button", { name: /カードの概要を見る/ })).toBeVisible()
  })

  test("clicking 'カードの概要を見る' navigates back to the parent card node", async ({ page }) => {
    await page.goto("/submit?for=metagenome-genome-bin")
    await page.getByRole("button", { name: /カードの概要を見る/ }).click()
    await expect(page).toHaveURL(/for=metagenome$/)
  })

  test("invalid ?for value falls back to microbial overview", async ({ page }) => {
    await page.goto("/submit?for=not-a-valid-node")
    await expect(page.getByRole("button", { name: /微生物ゲノム/, pressed: true })).toBeVisible()
  })

  test("clicking a use case card updates the URL ?for parameter", async ({ page }) => {
    await page.goto("/submit")
    await page.getByRole("button", { name: /真核生物ゲノム/ }).click()
    await expect(page).toHaveURL(/for=eukaryote/)
    await expect(page.getByRole("button", { name: /真核生物ゲノム/, pressed: true })).toBeVisible()
  })

  test("EN locale renders English hero and content", async ({ page, context }) => {
    await context.addCookies([{
      name: "lang",
      value: "en",
      url: "http://localhost:3000",
    }])
    await page.goto("/submit")
    await expect(page.getByRole("heading", { level: 1, name: "Submission Guide" })).toBeVisible()
    // English card
    await expect(page.getByRole("button", { name: /Microbial genome/ })).toBeVisible()
  })

  test("EN locale + prokaryote-raw-assembly renders English leaf TSX", async ({ page, context }) => {
    await context.addCookies([{
      name: "lang",
      value: "en",
      url: "http://localhost:3000",
    }])
    await page.goto("/submit?for=prokaryote-raw-assembly")
    await expect(page.getByRole("heading", { name: "Submission flow" })).toBeVisible()
    await expect(page.getByRole("button", { name: /Back to overview/ })).toBeVisible()
  })
})
