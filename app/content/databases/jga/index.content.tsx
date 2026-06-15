import type { DatabaseContent } from "~/schemas/content/database-content"
import { Callout, Heading, TextLink } from "~/ui"

import { SubmitGuideSection } from "../submit-guide-section"

export default {
  slug: "jga",
  title: {
    ja: "JGA (Japanese Genotype-phenotype Archive)",
    en: "JGA (Japanese Genotype-phenotype Archive)",
  },
  description: {
    ja: "制限公開のヒトデータ（個人レベルの遺伝型・表現型データ）を収容するアーカイブ。アクセスには NBDC のデータ利用審査が必要。",
    en: "Archive for controlled-access human data (individual-level genotype-phenotype data). Access requires NBDC data-use review.",
  },
  body: {
    ja: (
      <div className="flex flex-col gap-section-md">
        <section>
          <Heading as="h2" bar className="mb-3">JGA とは</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            Japanese Genotype-phenotype Archive (JGA) は、利用制限のあるヒトの個人レベルデータ
            （ゲノム・遺伝型・表現型）を収容するアーカイブです。
            登録データの利用には NBDC ヒトデータベースの審査を経たデータ利用申請が必要で、
            利用目的や研究計画に応じた制限のもとでのみ提供されます。
          </p>
        </section>
        <SubmitGuideSection service="jga" lang="ja" />
        <Callout tone="info">
          JGA への登録には NBDC ヒトデータベースでのポリシー承認が前提になります。
          {" "}
          <TextLink to="/submit">登録ナビ</TextLink>
          {" "}
          で制限公開を選ぶと、ポリシー申請から JGA 登録までの経路が案内されます。
        </Callout>
      </div>
    ),
    en: (
      <div className="flex flex-col gap-section-md">
        <section>
          <Heading as="h2" bar className="mb-3">About JGA</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            Japanese Genotype-phenotype Archive (JGA) stores individual-level human data
            (genomic, genotype, and phenotype) under controlled access. Researchers who wish to
            use deposited data must apply through the NBDC Human Database review process and are
            granted access only under conditions matching their research plan.
          </p>
        </section>
        <SubmitGuideSection service="jga" lang="en" />
        <Callout tone="info">
          JGA submission requires prior policy approval at the NBDC Human Database. Choose
          &quot;controlled access&quot; in the{" "}
          <TextLink to="/submit">submission navigator</TextLink>
          {" "}
          to see the full path from policy application to JGA deposit.
        </Callout>
      </div>
    ),
  },
  meta: {
    lastUpdated: "2026-06-15T00:00:00Z",
    relatedDbs: ["humandbs"],
    externalLinks: [
      { label: { ja: "JGA 公式ページ", en: "JGA official site" }, href: "https://www.ddbj.nig.ac.jp/jga/index.html" },
    ],
  },
} satisfies DatabaseContent
