import { expect, test } from "./helpers"

test.describe("Submit Domain", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/submit")
  })

  test("S-SUBMIT-01: /submit 初期表示で 9 ボタンと placeholder", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /登録ナビゲーション/ }).first()).toBeVisible()
    await expect(page.getByText(/NO FILES/)).toBeVisible()
    await expect(page.getByRole("button", { name: /配列リード/ })).toBeVisible()
  })

  test("S-SUBMIT-02: 配列リード 1 件で BP / BS / DRA Step が並ぶ", async ({ page }) => {
    await page.getByRole("button", { name: /配列リード/ }).click()

    await expect(page.getByTestId("flow-step")).toHaveCount(3, { timeout: 5_000 })
    await expect(page.getByText("BioProject")).toBeVisible()
    await expect(page.getByText("BioSample")).toBeVisible()
    await expect(page.getByText("DRA")).toBeVisible()
  })

  test("S-SUBMIT-03: 混在 5 行で multi step + TagProgress 3-5/5", async ({ page }) => {
    for (const name of ["配列リード", "配列リード", "組み立て済み配列", "変異情報", "表現型データ"]) {
      await page.getByRole("button", { name }).first().click()
    }

    await expect(page.getByTestId("file-row")).toHaveCount(5)
    await expect(page.getByTestId("tag-progress")).toContainText(/\d\s*\/\s*5/)
  })

  test("S-SUBMIT-04: open / restricted の分岐で JGA / DRA Step 両方", async ({ page }) => {
    await page.getByRole("button", { name: /配列リード/ }).click()
    await page.getByRole("button", { name: /配列リード/ }).click()

    const rows = page.getByTestId("file-row")
    await rows.nth(0).getByRole("combobox", { name: /生物/ }).selectOption("human")
    await rows.nth(0).getByRole("combobox", { name: /公開/ }).selectOption("restricted")
    await rows.nth(1).getByRole("combobox", { name: /生物/ }).selectOption("eukaryote")
    await rows.nth(1).getByRole("combobox", { name: /公開/ }).selectOption("open")

    await expect(page.getByTestId("flow-step").filter({ hasText: "JGA" })).toBeVisible()
    await expect(page.getByTestId("flow-step").filter({ hasText: "DRA" })).toBeVisible()
  })

  test("S-SUBMIT-05: 行詳細 modal 編集で DRA Step プレビュー再描画", async ({ page }) => {
    await page.getByRole("button", { name: /配列リード/ }).click()

    await page.getByRole("button", { name: /\+\s*設定/ }).first().click()
    await page.getByRole("radio", { name: /pair-end FASTQ/ }).check()
    await page.getByRole("dialog").getByRole("button", { name: /保存/ }).click()

    await expect(page.getByText(/pair-end/)).toBeVisible()
  })

  test("S-SUBMIT-06: 削除で Step が減る", async ({ page }) => {
    await page.getByRole("button", { name: /配列リード/ }).click()
    await page.getByRole("button", { name: /組み立て済み配列/ }).click()

    await page.getByTestId("file-row").last().getByRole("button", { name: /削除|×/ }).click()
    await page.getByRole("dialog").getByRole("button", { name: /削除する/ }).click()

    await expect(page.getByTestId("file-row")).toHaveCount(1)
  })

  test("E-SUBMIT-01: 必須項目未入力で warn 表示", async ({ page }) => {
    await page.getByRole("button", { name: /配列リード/ }).click()

    await expect(page.getByTestId("partial-failure-banner")).toBeVisible()
  })

  test("E-SUBMIT-03: 100 行追加で UI が応答する", async ({ page }) => {
    for (let i = 0; i < 100; i++) {
      await page.getByRole("button", { name: /配列リード/ }).click()
    }

    await expect(page.getByTestId("file-row")).toHaveCount(100, { timeout: 30_000 })
  })
})
