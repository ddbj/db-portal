import { expect, type Page, test } from "@playwright/test"

// data-testid 経由でセレクタを安定化する。
// SSOT:
// - docs/submit-alt3.md (狙い + 9 ボタン)
// - docs/submit-alt3-flow-rules.md §8.1 (Rule 1-15) / §8.2 (代表例 1-12)
// - docs/submit-alt3-modals.md §+ 配列リード / §+ 組み立て済み配列
//
// テーブル列 / フローカードに装着されている data-testid:
//   file-row-<fileId> / file-cell-organism-<fileId> / file-cell-access-<fileId>
//   file-cell-dataForm-<fileId> / file-cell-chip-<fileId>-<axis>
//   flow-step-<stepId> / flow-step-card-<stepId> / flow-step-warning-bar-<stepId>
//   flow-step-edit-inputs-<stepId> / step-input-popover-<stepId>
//   add-file-button-<buttonType>
//
// Step ID の命名規約 (docs/submit-alt3-data-model.md §4.6.1):
//   step-umbrella-bioproject (固定)
//   step-primary-bioproject-<bpId>
//   step-biosample-<bsId>
//   step-dra-<discriminator>  (discriminator は bsId or "<bsId>-analysis")
//   step-mss-<discriminator>

const setOrganismAccess = async (
  page: Page,
  fileId: string,
  organism: string,
  access: string,
): Promise<void> => {
  await page
    .locator(`[data-testid="file-cell-organism-${fileId}"] select`)
    .selectOption(organism)
  await page
    .locator(`[data-testid="file-cell-access-${fileId}"] select`)
    .selectOption(access)
}

// 「追加」を押した後、modal は閉じないため Escape で明示的に閉じる (連続追加 UX 対応)
const closeModal = async (page: Page): Promise<void> => {
  await page.keyboard.press("Escape")
}

const addSequenceReadPairEnd = async (
  page: Page,
  options: { functionalGenomicsYes?: boolean } = {},
): Promise<void> => {
  // 既定: pair-end + multiplex=single-sample + Q1=はい (functional-genomics=yes)
  // Q1=いいえ で Q2 が出る (デフォルト wgs-target、 chip=wgs-target)
  await page.getByTestId("add-file-button-sequence-read").click()
  if (options.functionalGenomicsYes === false) {
    await page
      .getByRole("radio", { name: /^いいえ \(raw 配列だけ/ })
      .check()
  }
  await page.getByRole("button", { name: "追加" }).click()
  await closeModal(page)
}

const addAssembledPhased = async (page: Page): Promise<void> => {
  // form=wgs + 「Haplotype phased」チェック → chipTag = haplotype-mode:phased
  await page.getByTestId("add-file-button-assembled").click()
  await page
    .getByRole("checkbox", { name: /Haplotype phased/ })
    .check()
  await page.getByRole("button", { name: "追加" }).click()
  await closeModal(page)
}

const countFlowStepCards = async (page: Page): Promise<number> =>
  await page.locator('[data-testid^="flow-step-card-"]').count()

test.describe("Submit Alt 3 (/submit-alt3) — Phase C 動作確認の自動化", () => {
  // Playwright のデフォルト Accept-Language は en-US。pickLang は Cookie 優先なので、
  // 各テストの先頭で lang=ja cookie を仕込んでから navigate する。
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      { name: "lang", value: "ja", url: "http://localhost:3000" },
    ])
  })

  test("initial render: hero, 9 add buttons, empty flow placeholder", async ({
    page,
  }) => {
    const response = await page.goto("/submit-alt3")
    expect(response?.status()).toBe(200)
    await expect(
      page.getByRole("heading", { level: 1, name: "登録ナビゲーション v3" }),
    ).toBeVisible()
    await expect(
      page.locator('[data-testid^="add-file-button-"]'),
    ).toHaveCount(9)
    await expect(
      page.locator('[data-testid^="flow-step-card-"]'),
    ).toHaveCount(0)
    await expect(
      page.getByText("ファイル種別ボタンを押してテーブルにファイルを追加してください"),
    ).toBeVisible()
  })

  test("Example 1: prokaryote raw + assembly with sample association emits BP + BS + DRA + MSS (4 Step)", async ({
    page,
  }) => {
    // flow-rules.md §8.2 例 1 + data-model §4.3.1 「同 sample 関連付け」。
    // raw Group の bs-1 と assembly Group を関連付けることで BS を共通化 → 4 Step に正規化。
    await page.goto("/submit-alt3")

    await addSequenceReadPairEnd(page, { functionalGenomicsYes: false })
    await setOrganismAccess(page, "file-1", "prokaryote", "open")
    await setOrganismAccess(page, "file-2", "prokaryote", "open")

    // 「組み立て済み配列」追加 modal で「既存 sample (bs-1)」と関連付ける。
    // AssembledModal は default で 公開 (access=open) が選ばれているので組織だけ追加で済む。
    await page.getByTestId("add-file-button-assembled").click()
    const linkSelect = page.getByTestId("assembled-link-to-bs")
    await expect(linkSelect).toBeVisible()
    await linkSelect.selectOption("bs-1")
    await page.getByRole("button", { name: "追加" }).click()
    await closeModal(page)
    // assembled 行 (file-3) は modal で access=open 確定済み、organism のみ補完
    await page
      .locator('[data-testid="file-cell-organism-file-3"] select')
      .selectOption("prokaryote")

    await expect(
      page.getByTestId("flow-step-card-step-primary-bioproject-bp-1"),
    ).toBeVisible()
    await expect(
      page.getByTestId("flow-step-card-step-biosample-bs-1"),
    ).toBeVisible()
    await expect(
      page.locator('[data-testid="flow-step-card-step-biosample-bs-2"]'),
    ).toHaveCount(0)
    await expect(
      page.getByTestId("flow-step-card-step-dra-bs-1"),
    ).toBeVisible()
    await expect(
      page.getByTestId("flow-step-card-step-mss-bs-1"),
    ).toBeVisible()
    expect(await countFlowStepCards(page)).toBe(4)
  })

  test("Example 9: Haplotype phased emits Umbrella + 3 BP + BS + DRA + MSS×2 (8 Step)", async ({
    page,
  }) => {
    // flow-rules.md §8.2 例 9 / Rule 11。
    // rule03 は bpSplit.haplotypeMode で skip され、共通 BS は rule11 が 1 個だけ emit。
    // Umbrella + Principal/Alternate/DRA-shared BP + 共通 BS + DRA Run + MSS Principal/Alternate = 8 Step。
    await page.goto("/submit-alt3")

    await addSequenceReadPairEnd(page, { functionalGenomicsYes: false })
    await addAssembledPhased(page)
    await addAssembledPhased(page)
    for (const fileId of ["file-1", "file-2", "file-3", "file-4"]) {
      await setOrganismAccess(page, fileId, "eukaryote", "open")
    }

    await expect(
      page.getByTestId("flow-step-card-step-umbrella-bioproject"),
    ).toBeVisible()
    for (const bpId of ["bp-principal", "bp-alternate", "bp-dra-shared"]) {
      await expect(
        page.getByTestId(`flow-step-card-step-primary-bioproject-${bpId}`),
      ).toBeVisible()
    }
    await expect(page.getByTestId("flow-step-card-step-dra-bs-1")).toBeVisible()
    await expect(
      page.getByTestId("flow-step-card-step-mss-bp-principal"),
    ).toBeVisible()
    await expect(
      page.getByTestId("flow-step-card-step-mss-bp-alternate"),
    ).toBeVisible()

    // 共通 BS は bs-1 1 個のみ (rule03 skip 後)
    await expect(
      page.getByTestId("flow-step-card-step-biosample-bs-1"),
    ).toBeVisible()
    await expect(
      page.locator('[data-testid="flow-step-card-step-biosample-bs-2"]'),
    ).toHaveCount(0)
    await expect(
      page.locator('[data-testid="flow-step-card-step-biosample-bs-3"]'),
    ).toHaveCount(0)
    expect(await countFlowStepCards(page)).toBe(8)
  })

  test("Rule 14a: DRA Library Strategy=WGS + chip functional-genomics=yes triggers warning bar", async ({
    page,
  }) => {
    // Q1=はい のままだと chip functional-genomics=yes が立つ。
    // DRA Step Library Strategy=WGS を選ぶと chip と矛盾 → warning (rule14_consistencyCheck.ts checkDraStrategy)。
    await page.goto("/submit-alt3")

    await addSequenceReadPairEnd(page) // Q1=はい (default) → chip functional-genomics=yes
    await setOrganismAccess(page, "file-1", "prokaryote", "open")
    await setOrganismAccess(page, "file-2", "prokaryote", "open")

    // chip = yes が確かに立っていることを確認 (前提を可視化、chip 側でバグると後段 assertion が silent に通る)
    await expect(
      page.getByTestId("file-cell-chip-file-1-functional-genomics"),
    ).toBeVisible()

    await expect(
      page.getByTestId("flow-step-warning-bar-step-dra-bs-1"),
    ).toHaveCount(0)

    await page.getByTestId("flow-step-edit-inputs-step-dra-bs-1").click()
    const popover = page.getByTestId("step-input-popover-step-dra-bs-1")
    await expect(popover).toBeVisible()
    await popover
      .locator("label", { hasText: /^Library Strategy$/ })
      .locator("..")
      .locator("select")
      .selectOption("WGS")
    await page.keyboard.press("Escape")

    const bar = page.getByTestId("flow-step-warning-bar-step-dra-bs-1")
    await expect(bar).toBeVisible()
    await expect(
      bar.locator('[data-testid^="flow-warning-"]').first(),
    ).toBeVisible()
  })

  test("Rule 14b: acknowledge → acknowledged badge; restore → active again", async ({
    page,
  }) => {
    // Rule 14a の続き。「無視 (上級者向け)」を押すと acknowledged 表示に切替、
    // 「確認済みを取り消す」で active に戻る。
    await page.goto("/submit-alt3")

    await addSequenceReadPairEnd(page)
    await setOrganismAccess(page, "file-1", "prokaryote", "open")
    await setOrganismAccess(page, "file-2", "prokaryote", "open")

    await page.getByTestId("flow-step-edit-inputs-step-dra-bs-1").click()
    const popover = page.getByTestId("step-input-popover-step-dra-bs-1")
    await popover
      .locator("label", { hasText: /^Library Strategy$/ })
      .locator("..")
      .locator("select")
      .selectOption("WGS")
    await page.keyboard.press("Escape")

    const bar = page.getByTestId("flow-step-warning-bar-step-dra-bs-1")
    await expect(bar).toBeVisible()
    const warning = bar.locator('[data-testid^="flow-warning-"]').first()
    await expect(warning).toBeVisible()

    await warning
      .getByRole("button", { name: /無視 \(上級者向け\)/ })
      .click()
    await expect(warning).toContainText("確認済み")
    await expect(
      warning.getByRole("button", { name: /確認済みを取り消す/ }),
    ).toBeVisible()

    await warning
      .getByRole("button", { name: /確認済みを取り消す/ })
      .click()
    await expect(warning).not.toContainText("確認済み")
    await expect(
      warning.getByRole("button", { name: /無視 \(上級者向け\)/ }),
    ).toBeVisible()
  })
})
