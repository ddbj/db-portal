import type { DatabaseContent } from "~/schemas/content/database-content"
import { Callout, TextLink } from "~/ui"

export default {
  slug: "biosample",
  title: { ja: "BioSample", en: "BioSample" },
  description: {
    ja: "実験データの取得に使われた試料 (細胞株 / 組織 / 個体 / 環境試料) の属性を集中管理するデータベース。",
    en: "Database that centrally captures attributes of the biological materials used to generate experimental data (cell lines, tissues, individuals, environmental samples).",
  },
  body: {
    ja: (
      <div className="flex flex-col gap-section-md">
        <section>
          <h2 className="text-fs-h2 font-bold text-ink m-0 mb-3">BioSample とは</h2>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            BioSample は、DDBJ の一次データベース (DRA / DDBJ Annotated / GEA など) に登録された実験データの
            出典となる生物学的試料の情報をまとめるデータベースです。
            細胞株、組織の生検試料、生物個体、環境試料 (土壌・水・空気など) が代表的な例です。
          </p>
        </section>
        <Callout tone="info">
          BioSample の登録は、シーケンスデータや発現量データの登録と同時に進めることが多くなります。
          {" "}
          <TextLink to="/submit">登録ナビ</TextLink>
          {" "}
          で実験データの種別を選ぶと、BioSample を含む登録経路が自動で組み立てられます。
        </Callout>
        <section>
          <h2 className="text-fs-h2 font-bold text-ink m-0 mb-3">アクセッション番号と package</h2>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            DDBJ BioSample では各試料に
            {" "}
            <code className="font-mono text-ink">SAMD</code>
            {" "}
            から始まるアクセッション番号を発行します。
            登録時には、試料の種別に応じた INSDC 共通の package (例: Human / Microbe / Environmental) を選び、
            必要な属性を入力します。
          </p>
        </section>
        <section>
          <h2 className="text-fs-h2 font-bold text-ink m-0 mb-3">国際的な共有</h2>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            登録された BioSample は、DDBJ・EBI・NCBI の各 BioSample データベース間で双方向に共有されます。
            つまり一度 DDBJ に登録した試料情報は、他センターの一次データベースからも参照可能です。
          </p>
        </section>
      </div>
    ),
    en: (
      <div className="flex flex-col gap-section-md">
        <section>
          <h2 className="text-fs-h2 font-bold text-ink m-0 mb-3">What BioSample captures</h2>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            BioSample is the central place where descriptive information about the biological
            material used to generate experimental data in DDBJ&apos;s primary archives (DRA, DDBJ
            Annotated, GEA, and others) lives. Typical examples include a cell line, a primary
            tissue biopsy, an individual organism, or an environmental isolate.
          </p>
        </section>
        <Callout tone="info">
          BioSample submission usually happens alongside sequence or expression data. Open the
          {" "}
          <TextLink to="/submit">submission navigator</TextLink>
          {" "}
          and choose your data type — the registration path it assembles will include BioSample
          when needed.
        </Callout>
        <section>
          <h2 className="text-fs-h2 font-bold text-ink m-0 mb-3">Accession prefix and packages</h2>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            DDBJ BioSample issues accessions prefixed with
            {" "}
            <code className="font-mono text-ink">SAMD</code>
            . At submission time you choose an INSDC-common package (e.g. Human, Microbe,
            Environmental) suited to your material and fill in the required attributes.
          </p>
        </section>
        <section>
          <h2 className="text-fs-h2 font-bold text-ink m-0 mb-3">International exchange</h2>
          <p className="text-fs-body text-ink-mid leading-relaxed m-0">
            All sample information held by DDBJ, EBI, and NCBI BioSample databases is shared
            bidirectionally. A sample you submit to DDBJ is therefore reachable from the primary
            archives operated by the other centres as well.
          </p>
        </section>
      </div>
    ),
  },
  meta: {
    lastUpdated: "2026-05-25T00:00:00Z",
    relatedDbs: ["bioproject", "dra"],
    externalLinks: [
      { label: { ja: "NCBI BioSample", en: "NCBI BioSample" }, href: "https://www.ncbi.nlm.nih.gov/biosample" },
      { label: { ja: "EBI BioSamples", en: "EBI BioSamples" }, href: "https://www.ebi.ac.uk/biosamples/" },
      { label: { ja: "DDBJ BioSample 公式ページ", en: "DDBJ BioSample site" }, href: "https://www.ddbj.nig.ac.jp/biosample/index.html" },
    ],
  },
} satisfies DatabaseContent
