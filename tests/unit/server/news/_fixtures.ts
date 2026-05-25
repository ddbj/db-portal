import { dbclsDateFromSlug, type SourceNormalizeConfig } from "../../../../server/news/normalize"

export const ddbjCfg: SourceNormalizeConfig = {
  source: "ddbj",
  urlBuilder: (lang, slug) =>
    lang === "ja"
      ? `https://www.ddbj.nig.ac.jp/news/ja/${slug}.html`
      : `https://www.ddbj.nig.ac.jp/news/en/${slug}-e.html`,
}

export const dbclsCfg: SourceNormalizeConfig = {
  source: "dbcls",
  urlBuilder: (lang, slug) => `https://dbcls.rois.ac.jp/${lang}/${slug}.html`,
  publishedAtFromSlug: dbclsDateFromSlug,
}
