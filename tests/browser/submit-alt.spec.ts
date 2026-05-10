import { expect, test } from "@playwright/test"

test.describe("Submit Alt (/submit-alt)", () => {
  test("initial render shows hero and 4 sections", async ({ page }) => {
    const response = await page.goto("/submit-alt")
    expect(response?.status()).toBe(200)
    await expect(
      page.getByRole("heading", { level: 1, name: "登録ナビゲーション v2" }),
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { level: 2, name: "持っているデータの種別" }),
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { level: 2, name: "ユースケースから選ぶ" }),
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { level: 2, name: "判断フローから辿る" }),
    ).toBeVisible()
    await expect(page.getByRole("heading", { level: 2, name: "詳細" })).toBeVisible()
    await expect(page.getByText(/leaf を選択すると詳細が表示されます/)).toBeVisible()
  })

  test("renders all 10 data type checkboxes", async ({ page }) => {
    await page.goto("/submit-alt")
    for (const name of [
      "ヒト制限公開アクセス",
      "シーケンスリード",
      "ゲノム",
      "バリアント解析",
      "プロテオミクス",
      "EST 解析",
      "Microarray",
      "空間トランスクリプトーム",
      "メタボロミクス",
      "小規模塩基配列",
    ]) {
      await expect(
        page.getByRole("checkbox", { name: new RegExp(name) }),
      ).toBeVisible()
    }
  })

  test("renders all 10 use case cards", async ({ page }) => {
    await page.goto("/submit-alt")
    for (const name of [
      "微生物ゲノム",
      "真核生物ゲノム",
      "メタゲノム / MAG / SAG",
      "遺伝子発現",
      "空間トランスクリプトーム",
      "変異データ",
      "プロテオミクス",
      "メタボロミクス",
      "小規模塩基配列・PCR 産物",
      "ヒト制限アクセス",
    ]) {
      await expect(
        page.getByRole("button", { name: new RegExp(name) }).first(),
      ).toBeVisible()
    }
  })

  test("?types=genome,sequence-read shows merged-submission callout", async ({
    page,
  }) => {
    await page.goto("/submit-alt?types=genome,sequence-read")
    await expect(page.getByText("1 つの登録フローに統合できます")).toBeVisible()
  })

  test("adding human-restricted switches callout to jga-unified", async ({ page }) => {
    await page.goto("/submit-alt?types=human-restricted,genome")
    await expect(page.getByText("JGA に統合されます")).toBeVisible()
  })

  test("proteomics + genome shows fully-independent callout", async ({ page }) => {
    await page.goto("/submit-alt?types=genome,proteomics")
    await expect(page.getByText("外部窓口での別登録が必要")).toBeVisible()
  })

  test("metabolomics + genome shows shared-bp-bs callout", async ({ page }) => {
    await page.goto("/submit-alt?types=genome,metabolomics")
    await expect(
      page.getByText("BioProject / BioSample を共有して別 submission"),
    ).toBeVisible()
  })

  test("?for=eukaryote-raw-assembly renders detail panel with masters", async ({
    page,
  }) => {
    await page.goto("/submit-alt?for=eukaryote-raw-assembly")
    await expect(page.getByText("BP+BS+DRA+MSS").first()).toBeVisible()
    await expect(page.getByRole("heading", { level: 3, name: "登録の流れ" })).toBeVisible()
    await expect(
      page.getByRole("heading", { level: 3, name: "登録項目の詳細" }),
    ).toBeVisible()
    await expect(page.getByText("Genome Sequencing")).toBeVisible()
  })

  test("breadcrumb shows types chip and tree path", async ({ page }) => {
    await page.goto("/submit-alt?types=genome,sequence-read&for=eukaryote-raw-assembly")
    await expect(
      page.getByRole("navigation", { name: /パンくずリスト/ }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "ゲノムの種別は？" }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "真核ゲノムのデータ形式は？" }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Raw + アセンブリ" }),
    ).toBeVisible()
  })
})
