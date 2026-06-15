import type { DatabaseContent } from "~/schemas/content/database-content"
import { Callout, Heading, TextLink } from "~/ui"

import { SubmitGuideSection } from "../submit-guide-section"

export default {
  slug: "togovar",
  title: {
    ja: "TogoVar",
    en: "TogoVar",
  },
  description: {
    ja: "公開ヒトゲノムバリアントのデータベース。GRCh37/GRCh38 を参照とする頻度・アノテーション付きバリアントを登録できる。",
    en: "Database of public human genome variants. Accepts frequency- and annotation-bearing variants referenced against GRCh37/GRCh38.",
  },
  body: {
    ja: (
      <div className="flex flex-col gap-section-md">
        <section>
          <Heading as="h2" bar className="mb-3">TogoVar とは</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            TogoVar は、公開されたヒトゲノムバリアントを集約・統合するデータベースです。
            GRCh37 または GRCh38 を参照ゲノムとするバリアントに、頻度情報やアノテーションを付与して登録できます。
            DDBJ の登録ナビでは、公開ヒトバリアントの登録先として TogoVar を案内します。
          </p>
        </section>
        <SubmitGuideSection service="togovar" lang="ja" />
        <Callout tone="info">
          <TextLink to="/submit">登録ナビ</TextLink>
          {" "}
          でヒト × バリアントを選ぶと、TogoVar への登録経路が案内されます。
        </Callout>
      </div>
    ),
    en: (
      <div className="flex flex-col gap-section-md">
        <section>
          <Heading as="h2" bar className="mb-3">About TogoVar</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            TogoVar is a database that aggregates and integrates published human genome variants.
            You can submit variants referenced against GRCh37 or GRCh38, annotated with frequency
            and functional information. DDBJ&apos;s submission navigator directs public human variant
            data to TogoVar.
          </p>
        </section>
        <SubmitGuideSection service="togovar" lang="en" />
        <Callout tone="info">
          Choose human × variant in the{" "}
          <TextLink to="/submit">submission navigator</TextLink>
          {" "}
          to see the TogoVar registration path.
        </Callout>
      </div>
    ),
  },
  meta: {
    lastUpdated: "2026-06-15T00:00:00Z",
    relatedDbs: [],
    externalLinks: [
      { label: { ja: "TogoVar", en: "TogoVar" }, href: "https://grch38.togovar.org/" },
    ],
  },
} satisfies DatabaseContent
