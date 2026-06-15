import type { DatabaseContent } from "~/schemas/content/database-content"
import { Callout, Heading, TextLink } from "~/ui"

import { SubmitGuideSection } from "../submit-guide-section"

export default {
  slug: "eva",
  title: {
    ja: "European Variation Archive (EVA)",
    en: "European Variation Archive (EVA)",
  },
  description: {
    ja: "EBI が運用するバリアントアーカイブ。全生物種の短い変異 (SNP/InDel) と構造変異を受け付ける。DDBJ では非ヒトバリアントの登録先として案内する。",
    en: "EBI-operated variant archive accepting short variants (SNP/InDel) and structural variants from any species. DDBJ directs non-human variants here.",
  },
  body: {
    ja: (
      <div className="flex flex-col gap-section-md">
        <section>
          <Heading as="h2" bar className="mb-3">EVA とは</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            European Variation Archive (EVA) は、EBI が運用する全生物種のゲノムバリアントアーカイブです。
            SNP・InDel などの短いバリアントと構造バリアントの両方を受け付けます。
            DDBJ の登録ナビでは、非ヒトのバリアントデータの登録先として EVA を案内します。
          </p>
        </section>
        <SubmitGuideSection service="eva" lang="ja" />
        <Callout tone="info">
          <TextLink to="/submit">登録ナビ</TextLink>
          {" "}
          でバリアントを選ぶと、生物ドメインに応じて EVA または TogoVar への登録経路が組み立てられます。
        </Callout>
      </div>
    ),
    en: (
      <div className="flex flex-col gap-section-md">
        <section>
          <Heading as="h2" bar className="mb-3">About EVA</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            The European Variation Archive (EVA) is an EBI-operated archive for genome variants
            across all species. It accepts both short variants (SNP/InDel) and structural variants.
            DDBJ&apos;s submission navigator directs non-human variant data to EVA.
          </p>
        </section>
        <SubmitGuideSection service="eva" lang="en" />
        <Callout tone="info">
          Choose &quot;variant&quot; in the{" "}
          <TextLink to="/submit">submission navigator</TextLink>
          {" "}
          and the path will branch to EVA or TogoVar depending on the biological domain.
        </Callout>
      </div>
    ),
  },
  meta: {
    lastUpdated: "2026-06-15T00:00:00Z",
    relatedDbs: [],
    externalLinks: [
      { label: { ja: "EVA (EBI)", en: "EVA (EBI)" }, href: "https://www.ebi.ac.uk/eva/" },
    ],
  },
} satisfies DatabaseContent
