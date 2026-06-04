import type { Page } from "@playwright/test"

import { expect, test } from "./helpers"

// Q1/Q2 の FmtRadio は label と sub を 1 つの <label> に入れるため、accessible name は
// label + sub の連結になる。識別は部分一致 (regex) で行う。
const Q1_PUBLIC = /公開データの登録/
const Q1_RESTRICTED = /制限公開データを含む登録/
const Q1_THIRD = /第三者による解析結果の登録/
// "ヒト" は "ヒト以外の真核生物" の前方一致になるため sub 文言で曖昧さを排除する。
const Q2_HUMAN = /ヒト個人由来のデータ/
const Q2_EUKARYOTE = /ヒト以外の真核生物/

const selectQ1 = async (page: Page, name: RegExp): Promise<void> => {
  await page.getByRole("radiogroup", { name: "登録種別" }).getByRole("radio", { name }).check()
}

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

test.describe("Submit Domain", () => {
  test("S-SUBMIT-01: 初期表示 (Q2 未選択で種別トグル disabled)", async ({ page }) => {
    await page.goto("/submit")

    await expect(page.getByRole("link", { name: "登録" })).toHaveAttribute("aria-current", "page")
    await expect(
      page.getByRole("heading", { level: 1, name: "登録ナビゲーション" }),
    ).toBeVisible()
    await expect(page.getByRole("heading", { name: "登録データ種別" })).toBeVisible()

    await expect(
      page.getByRole("radiogroup", { name: "登録種別" }).getByRole("radio", { name: Q1_PUBLIC }),
    ).toBeChecked()
    const q2group = page.getByRole("radiogroup", { name: "生物ドメイン" })
    for (const radio of await q2group.getByRole("radio").all()) {
      await expect(radio).not.toBeChecked()
    }

    // Q2 未選択では allowedRepos が空なので全種別トグルが disabled
    for (const label of ["配列リード", "FASTA 塩基配列", "バリアント", "発現マトリクス", "質量分析", "NMR"]) {
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
    await expect(flowStep(page, "dra").getByText("配列リード", { exact: true })).toBeVisible()

    await expect(
      page
        .locator('[data-testid="flow-overview"]')
        .getByRole("button", { name: /登録ステップに移動:/ }),
    ).toHaveCount(3)
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

  test("S-SUBMIT-04: 公開+制限で種別別 access トグルが出て JGA/DRA を分岐", async ({ page }) => {
    await page.goto("/submit")
    await selectQ1(page, Q1_RESTRICTED)
    await selectQ2(page, Q2_HUMAN)
    await toggleKind(page, "配列リード")

    const access = page.getByRole("combobox", { name: "配列リード 公開区分" })
    await expect(access).toBeVisible()
    // ヒトの access-sensitive 種別は default 制限公開
    await expect(access).toHaveText(/制限公開/)
    await expect(flowStep(page, "jga")).toHaveCount(1)
    await expect(flowStep(page, "humandbs")).toHaveCount(1)

    // 公開に倒すと DRA へ
    await access.click()
    await page.getByRole("option", { name: "公開", exact: true }).click()
    await expect(flowStep(page, "dra")).toHaveCount(1)
    await expect(flowStep(page, "jga")).toHaveCount(0)
  })

  test("S-SUBMIT-05: 配列+アノテーションの自動ペア (拡張子・採番なし)", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await toggleKind(page, "FASTA 塩基配列")
    await toggleKind(page, "配列アノテーション")

    const annItem = detailItemWith(page, /配列ペア/)
    await expect(annItem).toHaveCount(1)
    // live-commit: 保存ボタンやダイアログは無い
    await expect(page.getByRole("button", { name: /保存/ })).toHaveCount(0)
    await expect(page.getByRole("dialog")).toHaveCount(0)

    await annItem.getByRole("radio", { name: /配列ペア/ }).check()
    // 単独 FASTA が自動でペアになり 設定済み (相方選択 UI は無い)
    await expect(annItem.getByText("設定済み", { exact: true })).toBeVisible()
    await expect(annItem.getByRole("combobox", { name: "ペアにする配列" })).toHaveCount(0)
    await expect(flowStep(page, "ddbj-trad")).toHaveCount(1)

    // 単独アノテーションに戻すと FASTA が単独詳細項目として復活する
    await annItem.getByRole("radio", { name: /単独アノテーション/ }).check()
    await expect(detailItemWith(page, /単独配列/)).toHaveCount(1)
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
    await expect(reads).toHaveAttribute("title", "登録種別を選択してください")

    await selectQ2(page, Q2_EUKARYOTE)
    await expect(reads).toBeEnabled()
    await expect(kindButton(page, "バリアント")).toBeEnabled()

    // 第三者 (ddbj-trad / metabobank) では variant / expression は登録先が無く disable
    await selectQ1(page, Q1_THIRD)
    await expect(kindButton(page, "バリアント")).toBeDisabled()
    await expect(kindButton(page, "発現マトリクス")).toBeDisabled()
    await expect(kindButton(page, "FASTA 塩基配列")).toBeEnabled()
  })

  test("S-SUBMIT-08: 質量分析 proteomics→jPOST / metabolomics→MetaboBank", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await toggleKind(page, "質量分析")

    const msItem = detailItemWith(page, /プロテオミクス/)
    await expect(msItem).toHaveCount(1)

    await msItem.getByRole("radio", { name: /プロテオミクス/ }).check()
    await expect(flowStep(page, "jpost")).toHaveCount(1)
    await expect(flowStep(page, "jpost").getByText("外部登録先", { exact: true })).toBeVisible()

    await msItem.getByRole("radio", { name: /メタボロミクス/ }).check()
    await expect(flowStep(page, "jpost")).toHaveCount(0)
    await expect(flowStep(page, "metabobank")).toHaveCount(1)
    await expect(flowStep(page, "bioproject")).toHaveCount(1)
    await expect(flowStep(page, "biosample")).toHaveCount(1)
  })

  test("S-SUBMIT-09: 制限公開ヒトで JGA + humandbs 前提ゲート、随伴抑制", async ({ page }) => {
    await page.goto("/submit")
    await selectQ1(page, Q1_RESTRICTED)
    await selectQ2(page, Q2_HUMAN)
    await toggleKind(page, "配列リード")

    await expect(flowStep(page, "humandbs")).toHaveCount(1)
    await expect(flowStep(page, "jga")).toHaveCount(1)
    await expect(flowStep(page, "humandbs").getByText("申請窓口", { exact: true })).toBeVisible()

    const services = await flowSteps(page).evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("data-service")),
    )
    expect(services.indexOf("humandbs")).toBeLessThan(services.indexOf("jga"))

    await expect(flowStep(page, "bioproject")).toHaveCount(0)
    await expect(flowStep(page, "biosample")).toHaveCount(0)
  })

  test("S-SUBMIT-12: Q1 変更で既存行が前提矛盾になり確認事項に出る", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_HUMAN)
    await toggleKind(page, "発現マトリクス")
    await expect(flowStep(page, "gea")).toHaveCount(1)

    await selectQ1(page, Q1_THIRD)

    // 選択は破棄されない。第三者では発現マトリクスが登録先を持たないが、disable は新規選択
    // だけをブロックし、前段変更で無効化された選択済み種別は常にクリックで解除できる
    // (docs/submit.md「データ種別の選択 UX」)。よってトグルは enable のまま conflict 表示
    // (aria-pressed 維持 + 解除を促す tooltip) になり、経路導出から除外されて gea step は
    // 消え (conflict-kind-no-step)、確認事項に precondition-conflict が出る。
    await expect(
      page.getByRole("radiogroup", { name: "生物ドメイン" }).getByRole("radio", { name: Q2_HUMAN }),
    ).toBeChecked()
    const conflictKind = kindButton(page, "発現マトリクス")
    await expect(conflictKind).toBeEnabled()
    await expect(conflictKind).toHaveAttribute("aria-pressed", "true")
    await expect(conflictKind).toHaveAttribute("title", /クリックで選択を解除できます/)
    await expect(flowStep(page, "gea")).toHaveCount(0)
    await expect(validationBanner(page)).toBeVisible()

    // conflict はトグルのクリックで解除でき、確認事項が解消する。
    await conflictKind.click()
    await expect(conflictKind).toHaveAttribute("aria-pressed", "false")
    await expect(validationBanner(page)).toHaveCount(0)
  })

  test("S-SUBMIT-13: FlowOverview のステーションクリックで該当カードへスクロール", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await toggleKind(page, "配列リード")
    await expect(flowSteps(page)).toHaveCount(3)

    await page
      .locator('[data-testid="flow-overview"]')
      .getByRole("button", { name: "登録ステップに移動: DRA" })
      .click()

    await expect(flowStep(page, "dra")).toBeInViewport()
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
