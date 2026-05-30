// Tier2 構造エンジン / named recipe が付ける note の messageKey。
// カタログ (content/submit-routing) の messageKey とは別管理で、i18n 整合テストはこの 2 源を合わせて検証する。
export const ENGINE_MESSAGE_KEYS = {
  bioprojectIntro: "submit.bioproject.intro",
  biosampleIntro: "submit.biosample.intro",
  multiModalWarning: "submit.multiModal.warning",

  jgaDatasetIntro: "submit.jga.dataset.intro",
  jgaPolicyApplication: "submit.jga.policyApplication",
  jgaNbdcPolicy: "submit.jga.nbdcPolicy",

  magBioproject: "submit.mag.bioproject.intro",
  magBiosampleMetagenome: "submit.mag.biosample.metagenome",
  magBiosampleBinned: "submit.mag.biosample.binned",
  magBiosampleMag: "submit.mag.biosample.mag",
  magDraRun: "submit.mag.dra.run",
  magDraAnalysis: "submit.mag.dra.analysis",
  magEnvGenome: "submit.mag.ddbjTrad.envGenome",

  sagBioproject: "submit.sag.bioproject.intro",
  sagBiosampleMisag: "submit.sag.biosample.misag",
  sagBiosampleCombined: "submit.sag.biosample.combined",
  sagDraRun: "submit.sag.dra.run",
  sagEntry: "submit.sag.ddbjTrad.entry",

  spatialDraRaw: "submit.spatial.dra.raw",
} as const

export const ALL_ENGINE_MESSAGE_KEYS: readonly string[] = Object.values(ENGINE_MESSAGE_KEYS)
