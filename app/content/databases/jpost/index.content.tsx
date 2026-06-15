import type { DatabaseContent } from "~/schemas/content/database-content"
import { Callout, Heading, TextLink } from "~/ui"

import { SubmitGuideSection } from "../submit-guide-section"

export default {
  slug: "jpost",
  title: {
    ja: "jPOST",
    en: "jPOST",
  },
  description: {
    ja: "プロテオーム質量分析データの国際的なリポジトリ。プロテオミクスデータは DDBJ ではなく jPOST に登録する。",
    en: "International repository for proteomics mass-spectrometry data. Proteomics data goes to jPOST instead of DDBJ.",
  },
  body: {
    ja: (
      <div className="flex flex-col gap-section-md">
        <section>
          <Heading as="h2" bar className="mb-3">jPOST とは</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            jPOST (Japan ProteOme STandard Repository) は、プロテオーム解析の質量分析データを登録・共有するための
            国際的なリポジトリです。
            DDBJ の登録ナビでは、プロテオミクス用途の質量分析データの登録先として jPOST を案内します。
          </p>
        </section>
        <SubmitGuideSection service="jpost" lang="ja" />
        <Callout tone="info">
          <TextLink to="/submit">登録ナビ</TextLink>
          {" "}
          で質量分析を選びプロテオミクスを指定すると、jPOST への登録経路が案内されます。
        </Callout>
      </div>
    ),
    en: (
      <div className="flex flex-col gap-section-md">
        <section>
          <Heading as="h2" bar className="mb-3">About jPOST</Heading>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            jPOST (Japan ProteOme STandard Repository) is an international repository for sharing
            proteomics mass-spectrometry data. DDBJ&apos;s submission navigator directs proteomics
            mass-spec data to jPOST.
          </p>
        </section>
        <SubmitGuideSection service="jpost" lang="en" />
        <Callout tone="info">
          Choose mass spectrometry and specify proteomics in the{" "}
          <TextLink to="/submit">submission navigator</TextLink>
          {" "}
          to see the jPOST registration path.
        </Callout>
      </div>
    ),
  },
  meta: {
    lastUpdated: "2026-06-15T00:00:00Z",
    relatedDbs: [],
    externalLinks: [
      { label: { ja: "jPOST Repository", en: "jPOST Repository" }, href: "https://repository.jpostdb.org/" },
    ],
  },
} satisfies DatabaseContent
