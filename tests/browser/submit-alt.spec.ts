import { expect, test } from "@playwright/test"

test.describe("Submit Alt (/submit-alt)", () => {
  test("initial render shows hero, Q&A wizard, and detail empty state", async ({
    page,
  }) => {
    const response = await page.goto("/submit-alt")
    expect(response?.status()).toBe(200)
    await expect(
      page.getByRole("heading", { level: 1, name: "登録ナビゲーション v2" }),
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { level: 2, name: "質問ウィザード" }),
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { level: 2, name: "詳細" }),
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { level: 2, name: "ユースケースから選ぶ" }),
    ).toHaveCount(0)
    await expect(
      page.getByRole("heading", { level: 2, name: "判断フローから辿る" }),
    ).toHaveCount(0)
    await expect(
      page.getByText("Q&A に答えると詳細が表示されます"),
    ).toBeVisible()
  })

  test("URL has no query string after Q&A interaction", async ({ page }) => {
    await page.goto("/submit-alt")
    await page
      .getByRole("checkbox", { name: /配列リード（NGS \/ 長鎖シーケンサ）/ })
      .check()
    await page.getByRole("radio", { name: /^ヒト以外の真核生物$/ }).check()
    expect(new URL(page.url()).search).toBe("")
  })

  test("Q&A golden path narrows to eukaryote-raw-assembly (leaf-26)", async ({
    page,
  }) => {
    await page.goto("/submit-alt")

    await page
      .getByRole("checkbox", { name: /配列リード（NGS \/ 長鎖シーケンサ）/ })
      .check()
    await page
      .getByRole("checkbox", { name: /組み立て済み配列（アセンブリ）/ })
      .check()
    await page.getByRole("radio", { name: /^ヒト以外の真核生物$/ }).check()
    await page
      .getByRole("radio", { name: /^自分で新規に決定したデータ$/ })
      .check()
    await page.getByRole("radio", { name: /^通常規模$/ }).check()
    await page.getByRole("checkbox", { name: /^どれにも該当しない$/ }).check()

    await expect(page.getByText("BP+BS+DRA+MSS").first()).toBeVisible()
    await expect(
      page.getByRole("heading", { level: 3, name: "登録の流れ" }),
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { level: 3, name: "登録項目の詳細" }),
    ).toBeVisible()
    await expect(page.getByText("Genome Sequencing").first()).toBeVisible()
  })

  test("partial Q&A shows candidate prompt", async ({ page }) => {
    await page.goto("/submit-alt")
    await page
      .getByRole("checkbox", { name: /配列リード（NGS \/ 長鎖シーケンサ）/ })
      .check()
    await page.getByRole("radio", { name: /^原核生物$/ }).check()
    await expect(page.getByText(/候補があります/)).toBeVisible()
  })

  test("multi-select callout: merged-submission for prokaryote read+assembly", async ({
    page,
  }) => {
    await page.goto("/submit-alt")
    await page
      .getByRole("checkbox", { name: /配列リード（NGS \/ 長鎖シーケンサ）/ })
      .check()
    await page
      .getByRole("checkbox", { name: /組み立て済み配列（アセンブリ）/ })
      .check()
    await page.getByRole("radio", { name: /^原核生物$/ }).check()
    await expect(
      page.getByText("1 つの登録フローに統合できます"),
    ).toBeVisible()
  })

  test("multi-select callout: jga-unified for human-restricted", async ({
    page,
  }) => {
    await page.goto("/submit-alt")
    await page
      .getByRole("checkbox", { name: /配列リード（NGS \/ 長鎖シーケンサ）/ })
      .check()
    await page.getByRole("radio", { name: /^ヒト$/ }).check()
    await page.getByRole("radio", { name: /^制限公開が必要$/ }).check()
    await expect(page.getByText("JGA に統合されます")).toBeVisible()
  })

  test("multi-select callout: fully-independent for proteomics + genome", async ({
    page,
  }) => {
    await page.goto("/submit-alt")
    await page
      .getByRole("checkbox", { name: /組み立て済み配列（アセンブリ）/ })
      .check()
    await page
      .getByRole("checkbox", { name: /質量分析データ/ })
      .check()
    await page.getByRole("radio", { name: /^ヒト以外の真核生物$/ }).check()
    await page.getByRole("radio", { name: /^プロテオミクス$/ }).check()
    await expect(page.getByText("外部窓口での別登録が必要")).toBeVisible()
  })

  test("breadcrumb shows chips for Q&A answers and supports removal", async ({
    page,
  }) => {
    await page.goto("/submit-alt")
    await page
      .getByRole("checkbox", { name: /配列リード（NGS \/ 長鎖シーケンサ）/ })
      .check()
    await page.getByRole("radio", { name: /^ヒト以外の真核生物$/ }).check()

    const breadcrumb = page.getByRole("navigation", {
      name: /パンくずリスト/,
    })
    await expect(breadcrumb).toBeVisible()
    await expect(
      breadcrumb.getByText(/配列リード/),
    ).toBeVisible()
    await expect(breadcrumb.getByText(/ヒト以外の真核生物/)).toBeVisible()
  })

  test("legacy URL query parameters are ignored (no longer routed)", async ({
    page,
  }) => {
    await page.goto("/submit-alt?q1=sequence-read&q2=eukaryote&for=eukaryote-raw")
    await expect(
      page.getByText("Q&A に答えると詳細が表示されます"),
    ).toBeVisible()
    await expect(
      page.getByRole("navigation", { name: /パンくずリスト/ }),
    ).toHaveCount(0)
  })
})
