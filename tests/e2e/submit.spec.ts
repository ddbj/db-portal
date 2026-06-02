import type { Page } from "@playwright/test"

import { expect, test } from "./helpers"

// Q1/Q2 の FmtRadio は label と sub を 1 つの <label> に入れるため、accessible name は
// label + sub の連結になる。識別は部分一致 (regex) で行う。
const Q1_PUBLIC = /公開データの登録/
const Q1_RESTRICTED = /制限公開データを含む登録/
// "ヒト" は "ヒト以外の真核生物" の前方一致になるため sub 文言で曖昧さを排除する。
const Q2_HUMAN = /ヒト個人由来のデータ/
const Q2_EUKARYOTE = /ヒト以外の真核生物/

const selectQ1 = async (page: Page, name: RegExp): Promise<void> => {
  await page
    .getByRole("radiogroup", { name: "登録種別" })
    .getByRole("radio", { name })
    .check()
}

const selectQ2 = async (page: Page, name: RegExp): Promise<void> => {
  await page
    .getByRole("radiogroup", { name: "生物ドメイン" })
    .getByRole("radio", { name })
    .check()
}

const addFileType = async (page: Page, label: string, times = 1): Promise<void> => {
  const button = page.getByRole("button", { name: label })
  for (let i = 0; i < times; i++) {
    await button.click()
  }
}

const fileRows = (page: Page) => page.locator('[data-testid="file-row"]')

const flowSteps = (page: Page) => page.locator('[data-testid="flow-step"]')

const flowStep = (page: Page, service: string) =>
  page.locator(`[data-testid="flow-step"][data-service="${service}"]`)

const detailItems = (page: Page) => page.locator('[data-testid="detail-item"]')

const validationBanner = (page: Page) => page.getByText(/確認事項が \d+ 件あります/)

test.describe("Submit Domain", () => {
  test("S-SUBMIT-01: /submit 初期表示 (Q2 未選択で全ボタン disabled)", async ({ page }) => {
    await page.goto("/submit")

    await expect(page.getByRole("link", { name: "登録" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    await expect(
      page.getByRole("heading", { level: 1, name: "登録ナビゲーション" }),
    ).toBeVisible()

    await expect(
      page
        .getByRole("radiogroup", { name: "登録種別" })
        .getByRole("radio", { name: Q1_PUBLIC }),
    ).toBeChecked()

    const q2group = page.getByRole("radiogroup", { name: "生物ドメイン" })
    for (const radio of await q2group.getByRole("radio").all()) {
      await expect(radio).not.toBeChecked()
    }

    const fileTypeLabels = [
      "配列リード (FASTQ)",
      "FASTA 塩基配列 (FASTA)",
      "配列アノテーション (GFF)",
      "バリアント (VCF)",
      "発現マトリクス (TSV)",
      "マイクロアレイ発現 (CEL)",
      "空間トランスクリプトーム (TSV)",
      "空間画像 (TIFF)",
      "質量分析 (mzML)",
      "NMR (nmrML)",
      "代謝物アサインメント (TSV)",
    ]
    for (const label of fileTypeLabels) {
      await expect(page.getByRole("button", { name: label })).toBeDisabled()
    }

    await expect(
      page.getByText("上のボタンからファイル種別を追加してください"),
    ).toBeVisible()
    await expect(
      page.getByText("ファイルを追加すると、ここに登録フローが表示されます"),
    ).toBeVisible()
    await expect(flowSteps(page)).toHaveCount(0)
    await expect(page.locator('[data-testid="flow-overview"]')).toHaveCount(0)
    await expect(validationBanner(page)).toHaveCount(0)
  })

  test("S-SUBMIT-02: Q2 選択後の配列リードで BioProject/BioSample/DRA が組まれる", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await addFileType(page, "配列リード (FASTQ)")

    await expect(fileRows(page)).toHaveCount(1)
    const row = fileRows(page).first()
    await expect(row.getByText("read-001.fastq")).toBeVisible()
    await expect(row.getByRole("combobox", { name: "公開区分" })).toHaveText(/公開/)

    await expect(flowSteps(page)).toHaveCount(3)
    await expect(flowSteps(page).nth(0)).toHaveAttribute("data-service", "bioproject")
    await expect(flowSteps(page).nth(1)).toHaveAttribute("data-service", "biosample")
    await expect(flowSteps(page).nth(2)).toHaveAttribute("data-service", "dra")

    await expect(flowStep(page, "bioproject").getByText("随伴", { exact: true })).toBeVisible()
    await expect(flowStep(page, "biosample").getByText("随伴", { exact: true })).toBeVisible()
    await expect(flowStep(page, "dra").getByText("登録先", { exact: true })).toBeVisible()

    const draCard = flowStep(page, "dra")
    await expect(draCard.getByText("DDBJ", { exact: true })).toBeVisible()
    const popupPromise = page.waitForEvent("popup")
    await draCard.getByRole("button", { name: "登録サイトを開く" }).click()
    const popup = await popupPromise
    expect(popup).toBeTruthy()
    await popup.close()

    await expect(page.locator('[data-testid="flow-overview"]')).toBeVisible()
    await expect(
      page
        .locator('[data-testid="flow-overview"]')
        .getByRole("button", { name: /登録ステップに移動:/ }),
    ).toHaveCount(3)
  })

  test("S-SUBMIT-03: 同一 Q1/Q2 下の混在行で複数 destination が並ぶ", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await addFileType(page, "配列リード (FASTQ)", 2)
    await addFileType(page, "バリアント (VCF)")
    await addFileType(page, "発現マトリクス (TSV)")

    await expect(fileRows(page)).toHaveCount(4)
    for (const filename of ["read-001.fastq", "read-002.fastq", "var-001.vcf", "mtx-001.tsv"]) {
      await expect(page.getByText(filename, { exact: true }).first()).toBeVisible()
    }

    await expect(flowStep(page, "bioproject")).toHaveCount(1)
    await expect(flowStep(page, "biosample")).toHaveCount(1)
    await expect(flowStep(page, "dra")).toHaveCount(1)
    await expect(flowStep(page, "eva")).toHaveCount(1)
    await expect(flowStep(page, "gea")).toHaveCount(1)

    await expect(page.locator('[data-testid="tag-progress"]')).toContainText("4 / 4")

    await expect(page.getByRole("heading", { name: "データ詳細" })).toBeVisible()
    await expect(detailItems(page)).toHaveCount(0)
    await expect(
      page.getByText("追加の詳細設定が必要なファイルはありません"),
    ).toBeVisible()
  })

  test("S-SUBMIT-04: open / restricted の分岐 (Q1/Q2 と行 access)", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_HUMAN)
    await addFileType(page, "配列リード (FASTQ)", 2)

    const firstAccess = fileRows(page).nth(0).getByRole("combobox", { name: "公開区分" })
    await firstAccess.click()
    await page.getByRole("option", { name: "制限公開" }).click()
    await expect(firstAccess).toHaveText(/制限公開/)

    await expect(
      fileRows(page).nth(1).getByRole("combobox", { name: "公開区分" }),
    ).toHaveText(/公開/)

    await expect(flowStep(page, "jga")).toHaveCount(1)
    await expect(flowStep(page, "dra")).toHaveCount(1)

    const jgaCard = flowStep(page, "jga")
    await expect(jgaCard).toContainText("JGA に登録")
    await expect(jgaCard).toContainText(/DBCLS で Policy 承認 \(JGAP\)/)

    await expect(jgaCard).toContainText("read-001.fastq")
    await expect(jgaCard).not.toContainText("read-002.fastq")
    await expect(flowStep(page, "dra")).toContainText("read-002.fastq")
    await expect(flowStep(page, "dra")).not.toContainText("read-001.fastq")
  })

  test("S-SUBMIT-05: live-commit 詳細パネルで配列ペアを設定する", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await addFileType(page, "FASTA 塩基配列 (FASTA)")
    await addFileType(page, "配列アノテーション (GFF)")

    const annItem = detailItems(page).filter({ hasText: "ann-001.gff" })
    await expect(annItem).toHaveCount(1)
    await expect(page.getByRole("button", { name: /保存/ })).toHaveCount(0)
    await expect(page.getByRole("dialog")).toHaveCount(0)

    await annItem.getByRole("radio", { name: /配列ペア/ }).check()

    const partnerSelect = annItem.getByRole("combobox", { name: "ペアにする配列" })
    await expect(partnerSelect).toBeVisible()
    await expect(partnerSelect).toHaveAttribute("aria-invalid", "true")

    await partnerSelect.click()
    await page.getByRole("option", { name: "seq-001.fasta" }).click()

    await expect(annItem.getByText("設定済み", { exact: true })).toBeVisible()
    await expect(detailItems(page).filter({ hasText: "seq-001.fasta" })).toHaveCount(0)

    await annItem.getByRole("radio", { name: /単独アノテーション/ }).check()
    await expect(detailItems(page).filter({ hasText: "seq-001.fasta" })).toHaveCount(1)
  })

  test("S-SUBMIT-06: 行削除でフローカードが減る (確認ダイアログ無し)", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await addFileType(page, "配列リード (FASTQ)")
    await addFileType(page, "発現マトリクス (TSV)")
    await expect(fileRows(page)).toHaveCount(2)

    const mtxRow = fileRows(page).filter({ hasText: "mtx-001.tsv" })
    await mtxRow.getByRole("button", { name: "行を削除" }).click()

    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(fileRows(page)).toHaveCount(1)
    await expect(flowStep(page, "gea")).toHaveCount(0)
    await expect(flowStep(page, "bioproject")).toHaveCount(1)
    await expect(flowStep(page, "biosample")).toHaveCount(1)
    await expect(flowStep(page, "dra")).toHaveCount(1)
    await expect(validationBanner(page)).toHaveCount(0)
  })

  test("S-SUBMIT-07: カスケードの enable/disable 遷移", async ({ page }) => {
    await page.goto("/submit")

    const fastqButton = page.getByRole("button", { name: "配列リード (FASTQ)" })
    await expect(fastqButton).toBeDisabled()
    await expect(fastqButton).toHaveAttribute("title", "登録種別を選択してください")

    await selectQ2(page, Q2_EUKARYOTE)
    await expect(fastqButton).toBeEnabled()
    await expect(page.getByRole("button", { name: "バリアント (VCF)" })).toBeEnabled()
    await expect(page.getByRole("button", { name: "発現マトリクス (TSV)" })).toBeEnabled()

    await selectQ1(page, Q1_RESTRICTED)

    const q2group = page.getByRole("radiogroup", { name: "生物ドメイン" })
    await expect(q2group.getByRole("radio", { name: Q2_EUKARYOTE })).toBeDisabled()
    await expect(q2group.getByRole("radio", { name: /原核生物/ })).toBeDisabled()
    await expect(q2group.getByRole("radio", { name: /ファージ・ウイルス/ })).toBeDisabled()
    await expect(q2group.getByRole("radio", { name: /環境サンプル/ })).toBeDisabled()
    await expect(q2group.getByRole("radio", { name: Q2_HUMAN })).toBeEnabled()
    await expect(
      q2group
        .getByRole("radio", { name: Q2_EUKARYOTE })
        .locator("xpath=ancestor::label[1]"),
    ).toHaveAttribute(
      "title",
      "選択した登録種別では、この生物ドメインは登録先を持ちません",
    )

    await expect(q2group.getByRole("radio", { name: Q2_EUKARYOTE })).not.toBeChecked()
    await expect(fastqButton).toBeDisabled()
    await expect(fastqButton).toHaveAttribute("title", "登録種別を選択してください")
  })

  test("S-SUBMIT-08: 質量分析の proteomics → jPOST / metabolomics → MetaboBank の外部分岐", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await addFileType(page, "質量分析 (mzML)")

    const msItem = detailItems(page).filter({ hasText: "ms-001.mzML" })
    await expect(msItem).toHaveCount(1)

    await msItem.getByRole("radio", { name: /プロテオミクス/ }).check()
    await expect(flowStep(page, "jpost")).toHaveCount(1)
    await expect(flowStep(page, "jpost").getByText("外部登録先", { exact: true })).toBeVisible()
    await expect(flowStep(page, "jpost")).toContainText("jPOST に登録")
    await expect(flowStep(page, "bioproject")).toHaveCount(1)
    await expect(flowStep(page, "biosample")).toHaveCount(1)

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
    await addFileType(page, "配列リード (FASTQ)")

    await expect(
      fileRows(page).first().getByRole("combobox", { name: "公開区分" }),
    ).toHaveText(/制限公開/)

    await expect(flowStep(page, "humandbs")).toHaveCount(1)
    await expect(flowStep(page, "jga")).toHaveCount(1)
    await expect(flowStep(page, "humandbs").getByText("申請窓口", { exact: true })).toBeVisible()
    await expect(flowStep(page, "jga").getByText("登録先", { exact: true })).toBeVisible()

    const services = await flowSteps(page).evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("data-service")),
    )
    expect(services.indexOf("humandbs")).toBeLessThan(services.indexOf("jga"))

    await expect(flowStep(page, "bioproject")).toHaveCount(0)
    await expect(flowStep(page, "biosample")).toHaveCount(0)
  })

  test("S-SUBMIT-10: 複数行追加後の即時削除でカードが連動する", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await addFileType(page, "配列リード (FASTQ)", 2)
    await expect(fileRows(page)).toHaveCount(2)

    const secondRow = fileRows(page).filter({ hasText: "read-002.fastq" })
    await secondRow.getByRole("button", { name: "行を削除" }).click()

    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(fileRows(page)).toHaveCount(1)

    await expect(flowStep(page, "bioproject")).toHaveCount(1)
    await expect(flowStep(page, "biosample")).toHaveCount(1)
    await expect(flowStep(page, "dra")).toHaveCount(1)
    await expect(flowStep(page, "dra")).toContainText("read-001.fastq")
    await expect(flowStep(page, "dra")).not.toContainText("read-002.fastq")
  })

  test("S-SUBMIT-11: 配列ペアの相方変更と解消のライフサイクル", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await addFileType(page, "FASTA 塩基配列 (FASTA)", 2)
    await addFileType(page, "配列アノテーション (GFF)")

    const annItem = detailItems(page).filter({ hasText: "ann-001.gff" })
    await annItem.getByRole("radio", { name: /配列ペア/ }).check()
    const partnerSelect = annItem.getByRole("combobox", { name: "ペアにする配列" })

    await partnerSelect.click()
    await page.getByRole("option", { name: "seq-001.fasta" }).click()
    await expect(detailItems(page).filter({ hasText: "seq-001.fasta" })).toHaveCount(0)
    await expect(annItem.getByText("設定済み", { exact: true })).toBeVisible()

    await partnerSelect.click()
    await page.getByRole("option", { name: "seq-002.fasta" }).click()
    await expect(detailItems(page).filter({ hasText: "seq-002.fasta" })).toHaveCount(0)
    await expect(detailItems(page).filter({ hasText: "seq-001.fasta" })).toHaveCount(1)

    await annItem.getByRole("radio", { name: /単独アノテーション/ }).check()
    await expect(detailItems(page).filter({ hasText: "seq-001.fasta" })).toHaveCount(1)
    await expect(detailItems(page).filter({ hasText: "seq-002.fasta" })).toHaveCount(1)
  })

  test("S-SUBMIT-12: Q1 変更で既存行が前提矛盾になり確認事項に出る", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_HUMAN)
    await addFileType(page, "発現マトリクス (TSV)")
    await expect(flowStep(page, "gea")).toHaveCount(1)

    await selectQ1(page, Q1_RESTRICTED)

    await expect(
      page
        .getByRole("radiogroup", { name: "生物ドメイン" })
        .getByRole("radio", { name: Q2_HUMAN }),
    ).toBeChecked()
    await expect(fileRows(page)).toHaveCount(1)

    const mtxButton = page.getByRole("button", { name: "発現マトリクス (TSV)" })
    await expect(mtxButton).toBeDisabled()
    await expect(mtxButton).toHaveAttribute(
      "title",
      "選択した登録種別と生物ドメインの組み合わせでは、登録先がありません",
    )

    await expect(validationBanner(page)).toBeVisible()
    await expect(
      page.getByText("登録前提と矛盾する種別の行があります"),
    ).toBeVisible()
  })

  test("S-SUBMIT-13: FlowOverview のステーションクリックで該当カードへスクロール", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await addFileType(page, "配列リード (FASTQ)")
    await expect(flowSteps(page)).toHaveCount(3)

    await page
      .locator('[data-testid="flow-overview"]')
      .getByRole("button", { name: "登録ステップに移動: DRA" })
      .click()

    await expect(flowStep(page, "dra")).toBeInViewport()
  })

  test("E-SUBMIT-01: 未設定の詳細行が notify Tag と warning tone で示される", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await addFileType(page, "空間トランスクリプトーム (TSV)")

    const row = fileRows(page).filter({ hasText: "spt-001.tsv" })
    await expect(row.getByText("未設定", { exact: true })).toBeVisible()

    const sptItem = detailItems(page).filter({ hasText: "spt-001.tsv" })
    await expect(sptItem.getByText("未設定", { exact: true })).toBeVisible()

    await expect(validationBanner(page)).toHaveCount(0)
  })

  test("E-SUBMIT-03: 100 行追加でも UI が応答する", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await addFileType(page, "配列リード (FASTQ)", 100)

    await expect(fileRows(page)).toHaveCount(100, { timeout: 20_000 })

    await expect(flowStep(page, "bioproject")).toHaveCount(1)
    await expect(flowStep(page, "biosample")).toHaveCount(1)
    await expect(flowStep(page, "dra")).toHaveCount(1)
    await expect(flowStep(page, "dra")).toContainText("read-100.fastq")

    const lastRow = fileRows(page).filter({ hasText: "read-100.fastq" })
    await lastRow.getByRole("button", { name: "行を削除" }).click()
    await expect(fileRows(page)).toHaveCount(99)
  })

  test("E-SUBMIT-04: spatial-transcriptomics の platform 未確定で no-destination 相当を確認", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await addFileType(page, "空間トランスクリプトーム (TSV)")

    const row = fileRows(page).filter({ hasText: "spt-001.tsv" })
    const sptItem = detailItems(page).filter({ hasText: "spt-001.tsv" })
    await expect(row.getByText("未設定", { exact: true })).toBeVisible()
    await expect(sptItem.getByText("未設定", { exact: true })).toBeVisible()
    await expect(validationBanner(page)).toHaveCount(0)

    await sptItem.getByRole("radio", { name: /Visium/ }).check()

    await expect(sptItem.getByText("未設定", { exact: true })).toHaveCount(0)
    await expect(sptItem.getByText("設定済み", { exact: true })).toBeVisible()
    await expect(flowStep(page, "gea")).toHaveCount(1)
    await expect(flowStep(page, "dra")).toHaveCount(1)
  })

  test("E-SUBMIT-05: 削除後の連番ギャップで自動採番が衝突しない", async ({ page }) => {
    await page.goto("/submit")
    await selectQ2(page, Q2_EUKARYOTE)
    await addFileType(page, "配列リード (FASTQ)", 3)
    await expect(fileRows(page)).toHaveCount(3)

    await fileRows(page)
      .filter({ hasText: "read-002.fastq" })
      .getByRole("button", { name: "行を削除" })
      .click()

    await expect(fileRows(page)).toHaveCount(2)
    await expect(fileRows(page).filter({ hasText: "read-001.fastq" })).toHaveCount(1)
    await expect(fileRows(page).filter({ hasText: "read-003.fastq" })).toHaveCount(1)

    await addFileType(page, "配列リード (FASTQ)")

    await expect(fileRows(page)).toHaveCount(3)
    await expect(fileRows(page).filter({ hasText: "read-004.fastq" })).toHaveCount(1)
    await expect(fileRows(page).filter({ hasText: "read-002.fastq" })).toHaveCount(0)
  })
})
