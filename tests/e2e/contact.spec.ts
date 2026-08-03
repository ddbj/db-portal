import { expect, test } from "./helpers"

const HELPDESK_EMAIL = "bsi-helpdesk@nig.ac.jp"

const copyButton = /アドレスをコピー|Copy address/
const copiedLabel = /コピーしました|Copied/

test.describe("Contact Domain", () => {
  test("S-CONTACT-01: ヘッダー nav から /contact へ、窓口アドレスが平文で読める", async ({ page }) => {
    await page.goto("/")

    await page.getByRole("navigation").getByRole("link", { name: /お問い合わせ|Contact/ }).click()
    await expect(page).toHaveURL(/\/contact$/)

    await expect(
      page.getByRole("heading", { name: /お問い合わせ|Contact/, level: 1 }),
    ).toBeVisible()

    // アドレスは平文テキストで露出する (画像でも link でもない)
    await expect(page.getByText(HELPDESK_EMAIL, { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: copyButton })).toHaveCount(1)

    // mailto は環境によって開けないため窓口手段に置かない
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0)
  })

  test("S-CONTACT-02: アドレスのコピーと一時フィードバック", async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"])
    await page.goto("/contact")

    await page.getByRole("button", { name: copyButton }).click()

    await expect(page.getByRole("button", { name: copiedLabel })).toBeVisible()
    await expect(page.getByRole("status").filter({ hasText: copiedLabel })).toHaveCount(1)
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(HELPDESK_EMAIL)

    // 1.5 秒後に元のラベルへ戻る
    await expect(page.getByRole("button", { name: copyButton })).toBeVisible()
  })

  test("S-CONTACT-03: 各セクションのリンク先", async ({ page }) => {
    await page.goto("/contact")
    // header nav にも /docs /services /contact への link があるため本文に限定する。
    const body = page.locator("main")

    await expect(body.locator('a[href="/docs"]')).toHaveCount(1)
    await expect(body.locator('a[href="/services"]')).toHaveCount(1)
    await expect(body.locator('a[href="/policy"]')).toHaveCount(1)

    // ja locale では ja 側の外部窓口 URL が出る
    const externalHrefs = [
      "https://www.ddbj.nig.ac.jp/faq/ja/",
      "https://www.ddbj.nig.ac.jp/contact-ddbj.html",
      "https://sc.ddbj.nig.ac.jp/application/reference/",
    ]
    for (const href of externalHrefs) {
      const link = body.locator(`a[href="${href}"]`)
      await expect(link).toHaveCount(1)
      await expect(link).toHaveAttribute("target", "_blank")
      await expect(link).toHaveAttribute("rel", "noopener noreferrer")
    }
  })

  test("S-CONTACT-04: /docs 目次から /contact に辿れる", async ({ page }) => {
    await page.goto("/docs")

    const support = page.getByRole("heading", { name: /サポート|Support/ })
    await expect(support).toBeVisible()

    // header nav の「お問い合わせ」ではなく、 目次側の link から辿ることを固定する。
    await page.locator("main").locator('a[href="/contact"]').click()
    await expect(page).toHaveURL(/\/contact$/)
  })

  test("E-CONTACT-01: clipboard を持たない環境でも窓口が機能する", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true })
    })
    await page.goto("/contact")

    await page.getByRole("button", { name: copyButton }).click()

    // 成功フィードバックを出さないまま、ページも窓口表示も保たれる
    await expect(page.getByRole("button", { name: copiedLabel })).toHaveCount(0)
    await expect(page.getByRole("button", { name: copyButton })).toBeVisible()
    await expect(
      page.getByRole("heading", { name: /お問い合わせ|Contact/, level: 1 }),
    ).toBeVisible()
    await expect(page.getByText(HELPDESK_EMAIL, { exact: true })).toBeVisible()
  })
})
