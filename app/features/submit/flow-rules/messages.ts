// Tier2 構造エンジン / named recipe が付ける note の messageKey。
// カタログ (content/submit-routing) の messageKey とは別管理で、i18n 整合テストはこの 2 源を合わせて検証する。
export const ENGINE_MESSAGE_KEYS = {
  bioprojectIntro: "submit.bioproject.intro",
  biosampleIntro: "submit.biosample.intro",

  jgaDatasetIntro: "submit.jga.dataset.intro",
  jgaPolicyApplication: "submit.jga.policyApplication",
  jgaNbdcPolicy: "submit.jga.nbdcPolicy",

  spatialDraRaw: "submit.spatial.dra.raw",
} as const

export const ALL_ENGINE_MESSAGE_KEYS: readonly string[] = Object.values(ENGINE_MESSAGE_KEYS)
