import type { Page } from "@playwright/test"

import { expect, test } from "./helpers"

// FmtRadio は label と sub を 1 つの <label> に入れるため、accessible name は
// label + sub の連結になる。識別は部分一致 (regex) で行う。
// "ヒト" は "ヒト以外の真核生物" の前方一致になるため sub 文言で曖昧さを排除する。
const Q2_HUMAN = /ヒト個人由来のデータ/
const Q2_EUKARYOTE = /ヒト以外の真核生物/

const selectQ2 = async (page: Page, name: RegExp): Promise<void> => {
  await page.getByRole("radiogroup", { name: "生物ドメイン" }).getByRole("radio", { name }).check()
}

const kindButton = (page: Page, label: string) =>
  page.locator("#submit-kind-selection").getByRole("button", { name: label, exact: true })

const toggleKind = async (page: Page, label: string): Promise<void> => {
  await kindButton(page, label).click()
}

const flowSteps = (page: Page) => page.locator('[data-testid="flow-step"]')

const flowStep = (page: Page, service: string) =>
  page.locator(`[data-testid="flow-step"][data-service="${service}"]`)

const detailItems = (page: Page) => page.locator('[data-testid="detail-item"]')

const detailItemWith = (page: Page, radio: RegExp) =>
  detailItems(page).filter({ has: page.getByRole("radio", { name: radio }) })

const validationBanner = (page: Page) => page.getByText(/確認事項が \d+ 件あります/)

const toggleAccessSwitch = async (page: Page, name: RegExp): Promise<void> => {
  await page.getByRole("switch", { name }).check()
}

test.describe("Submit Domain", () => {
  test("S-SUBMIT-01: 初期表示 (Q2 未選択で種別トグル disabled)", async ({ page }) => {
    await page.goto("/submit")

    await expect(page.getByRole("link", { name: "登録" })).toHaveAttribute("aria-current", "page")
    await expect(
      page.getByRole("heading", { level: 1, name: "登録ナビゲーション" }),
    ).toBeVisible()
    await expect(page.getByRole("heading", { name: "登録データ種別" })).toBeVisible()

    const q2group = page.getByRole("radiogroup", { name: "生物ドメイン" })
    for (const radio of await q2group.getByRole("radio").all()) {
      await expect(radio).not.toBeChecked()
    }

    for (const label of [
      "配列リード", "塩基配列", "バリアント", "発現マトリクス",
      "マイクロアレイ", "空間トランスクリプトーム", "メタボロミクス", "プロテオーム",
    ]) {
      await expect(kindButton(page, label)).toBeDisabled()
    }

    await expect(flowSteps(page)).toHaveCount(0)
    await expect(
      page.getByText("ファイルを追加すると、ここに登録フローが表示されます"),
    ).toBeVisible()
    await expect(validationBanner(page)).toHaveCount(0)
  })

  test("S-SUBMIT-02: 配列リードのトグルで BioProject/BioSample/DRA が組まれる", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await toggleKind(page, "配列リード")

    await expect(kindButton(page, "配列リード")).toHaveAttribute("aria-pressed", "true")
    await expect(flowSteps(page)).toHaveCount(3)
    await expect(flowSteps(page).nth(0)).toHaveAttribute("data-service", "bioproject")
    await expect(flowSteps(page).nth(1)).toHaveAttribute("data-service", "biosample")
    await expect(flowSteps(page).nth(2)).toHaveAttribute("data-service", "dra")

    await expect(flowStep(page, "dra").getByText("登録先", { exact: true })).toBeVisible()
  })

  test("S-SUBMIT-03: 複数種別で複数 destination が並ぶ", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await toggleKind(page, "配列リード")
    await toggleKind(page, "バリアント")
    await toggleKind(page, "発現マトリクス")

    await expect(flowStep(page, "bioproject")).toHaveCount(1)
    await expect(flowStep(page, "biosample")).toHaveCount(1)
    await expect(flowStep(page, "dra")).toHaveCount(1)
    await expect(flowStep(page, "eva")).toHaveCount(1)
    await expect(flowStep(page, "gea")).toHaveCount(1)
  })

  test("S-SUBMIT-04: 制限公開ヒトで JGA/DRA を分岐", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_HUMAN)
    await toggleAccessSwitch(page, /制限公開を希望する/)
    await toggleKind(page, "配列リード")

    await expect(flowStep(page, "jga")).toHaveCount(1)
    await expect(flowStep(page, "humandbs")).toHaveCount(1)
  })

  test("S-SUBMIT-05: 塩基配列の detail で MAG 選択", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await toggleKind(page, "塩基配列")

    const item = detailItemWith(page, /MAG/)
    await expect(item).toHaveCount(1)
    await expect(page.getByRole("button", { name: /保存/ })).toHaveCount(0)
    await expect(page.getByRole("dialog")).toHaveCount(0)

    await item.getByRole("radio", { name: /MAG/ }).check()
    await expect(item.getByText("設定済み", { exact: true })).toBeVisible()
    await expect(flowStep(page, "ddbj")).toHaveCount(1)
  })

  test("S-SUBMIT-06: 種別トグル off でフローカードが減る", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await toggleKind(page, "配列リード")
    await toggleKind(page, "発現マトリクス")
    await expect(flowStep(page, "gea")).toHaveCount(1)

    await toggleKind(page, "発現マトリクス")
    await expect(kindButton(page, "発現マトリクス")).toHaveAttribute("aria-pressed", "false")
    await expect(flowStep(page, "gea")).toHaveCount(0)
    await expect(flowStep(page, "dra")).toHaveCount(1)
    await expect(validationBanner(page)).toHaveCount(0)
  })

  test("S-SUBMIT-07: カスケードの enable/disable", async ({ page }) => {
    await page.goto("/submit")
    const reads = kindButton(page, "配列リード")
    await expect(reads).toBeDisabled()
    await expect(reads).toHaveAttribute("title", "生物ドメインを選択してください")

    await selectQ2(page, Q2_EUKARYOTE)
    await expect(reads).toBeEnabled()
    await expect(kindButton(page, "バリアント")).toBeEnabled()
    await expect(kindButton(page, "発現マトリクス")).toBeEnabled()
    await expect(kindButton(page, "塩基配列")).toBeEnabled()
  })

  test("S-SUBMIT-08: プロテオーム→jPOST / メタボロミクス→MetaboBank", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await toggleKind(page, "プロテオーム")

    await expect(flowStep(page, "jpost")).toHaveCount(1)
    await expect(flowStep(page, "bioproject")).toHaveCount(1)
    await expect(flowStep(page, "biosample")).toHaveCount(1)

    await toggleKind(page, "プロテオーム")
    await toggleKind(page, "メタボロミクス")
    await expect(flowStep(page, "jpost")).toHaveCount(0)
    await expect(flowStep(page, "metabobank")).toHaveCount(1)
    await expect(flowStep(page, "bioproject")).toHaveCount(1)
    await expect(flowStep(page, "biosample")).toHaveCount(1)
  })

  test("S-SUBMIT-09: 制限公開ヒトで JGA + humandbs 前提ゲート、随伴抑制", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_HUMAN)
    await toggleAccessSwitch(page, /制限公開を希望する/)
    await toggleKind(page, "配列リード")

    await expect(flowStep(page, "humandbs")).toHaveCount(1)
    await expect(flowStep(page, "jga")).toHaveCount(1)

    const services = await flowSteps(page).evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("data-service")),
    )
    expect(services.indexOf("humandbs")).toBeLessThan(services.indexOf("jga"))

    await expect(flowStep(page, "bioproject")).toHaveCount(0)
    await expect(flowStep(page, "biosample")).toHaveCount(0)
  })

  test("S-SUBMIT-12: 種別トグル解除でフローと確認事項が解消する", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await toggleKind(page, "発現マトリクス")
    await expect(flowStep(page, "gea")).toHaveCount(1)

    await toggleKind(page, "配列リード")
    await expect(flowStep(page, "dra")).toHaveCount(1)

    await toggleKind(page, "発現マトリクス")
    await expect(flowStep(page, "gea")).toHaveCount(0)
    await expect(flowStep(page, "dra")).toHaveCount(1)
    await expect(validationBanner(page)).toHaveCount(0)

    await toggleKind(page, "配列リード")
    await expect(flowSteps(page)).toHaveCount(0)
    await expect(validationBanner(page)).toHaveCount(0)
  })

  test("E-SUBMIT-01: 未設定の詳細種別が notify で示される", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await toggleKind(page, "空間トランスクリプトーム")

    const item = detailItemWith(page, /Visium/)
    await expect(item.getByText("未設定", { exact: true })).toBeVisible()
    await expect(validationBanner(page)).toHaveCount(0)
  })

  test("E-SUBMIT-04: spatial Visium で DRA + GEA の 2 段", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await toggleKind(page, "空間トランスクリプトーム")

    const item = detailItemWith(page, /Visium/)
    await item.getByRole("radio", { name: /Visium/ }).check()

    await expect(item.getByText("設定済み", { exact: true })).toBeVisible()
    await expect(flowStep(page, "gea")).toHaveCount(1)
    await expect(flowStep(page, "dra")).toHaveCount(1)
  })
})
