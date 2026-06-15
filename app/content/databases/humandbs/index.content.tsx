import type { DatabaseContent } from "~/schemas/content/database-content"
import { Callout, Heading, TextLink } from "~/ui"

import { SubmitGuideSection } from "../submit-guide-section"

export default {
  slug: "humandbs",
  title: {
    ja: "NBDC ヒトデータベース",
    en: "NBDC Human Database",
  },
  description: {
    ja: "DBCLS が運用する、制限公開ヒトデータの利用制限ポリシー申請・承認プラットフォーム。JGA への登録前にポリシー承認が必要。",
    en: "DBCLS-operated platform for applying for and approving data-use policies for controlled-access human data. Policy approval is required before JGA submission.",
  },
  body: {
    ja: (
      <div className="flex flex-col gap-section-md">
        <section>
          <Heading as="h2" bar className="mb-3">NBDC ヒトデータベースとは</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            NBDC ヒトデータベースは、DBCLS が運用する制限公開ヒトデータのガバナンスプラットフォームです。
            制限公開データを JGA に登録するには、まずここでデータ利用ポリシーの審査と承認を受ける必要があります。
            NBDC 標準ポリシーまたは独自ポリシー (JGAP) のいずれかを選択し申請します。
          </p>
        </section>
        <SubmitGuideSection service="humandbs" lang="ja" />
        <Callout tone="info">
          <TextLink to="/submit">登録ナビ</TextLink>
          {" "}
          で制限公開を選ぶと、NBDC ポリシー申請から JGA 登録までの経路が案内されます。
        </Callout>
      </div>
    ),
    en: (
      <div className="flex flex-col gap-section-md">
        <section>
          <Heading as="h2" bar className="mb-3">About NBDC Human Database</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            The NBDC Human Database is a governance platform operated by DBCLS for controlled-access
            human data. Before depositing restricted data to JGA, you must apply for and obtain
            approval of a data-use policy here — either the NBDC standard policy or a custom policy
            (JGAP).
          </p>
        </section>
        <SubmitGuideSection service="humandbs" lang="en" />
        <Callout tone="info">
          Choose &quot;controlled access&quot; in the{" "}
          <TextLink to="/submit">submission navigator</TextLink>
          {" "}
          to see the full path from NBDC policy application to JGA deposit.
        </Callout>
      </div>
    ),
  },
  meta: {
    lastUpdated: "2026-06-15T00:00:00Z",
    relatedDbs: ["jga"],
    externalLinks: [
      { label: { ja: "NBDC ヒトデータベース", en: "NBDC Human Database" }, href: "https://humandbs.ddbj.nig.ac.jp/" },
    ],
  },
} satisfies DatabaseContent
