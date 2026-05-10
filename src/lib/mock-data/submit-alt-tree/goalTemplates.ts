import type {
  GoalTemplateAlt,
  GoalTemplateIdAlt,
} from "@/types/submit-alt"

// goal 別の登録ステップ key パターン。i18n は routes.submitAlt.detail.steps.<pattern>.<step>.{title,description}
export const STEP_PATTERNS_ALT = {
  jga: [
    "routes.submitAlt.detail.steps.jga.dbcls",
    "routes.submitAlt.detail.steps.jga.guidance",
    "routes.submitAlt.detail.steps.jga.upload",
  ],
  "jga-analysis": [
    "routes.submitAlt.detail.steps.jga-analysis.guidance",
    "routes.submitAlt.detail.steps.jga-analysis.upload",
  ],
  "external-jpost": [
    "routes.submitAlt.detail.steps.external-jpost.submit",
  ],
  "external-eva": [
    "routes.submitAlt.detail.steps.external-eva.submit",
  ],
  "external-dgva": [
    "routes.submitAlt.detail.steps.external-dgva.submit",
  ],
  "external-humandbs": [
    "routes.submitAlt.detail.steps.external-humandbs.submit",
  ],
  jvar: [
    "routes.submitAlt.detail.steps.jvar.submit",
  ],
  "sra-analysis": [
    "routes.submitAlt.detail.steps.sra-analysis.bioproject",
    "routes.submitAlt.detail.steps.sra-analysis.biosample",
    "routes.submitAlt.detail.steps.sra-analysis.draAnalysis",
  ],
  metabobank: [
    "routes.submitAlt.detail.steps.metabobank.bioproject",
    "routes.submitAlt.detail.steps.metabobank.biosample",
    "routes.submitAlt.detail.steps.metabobank.metabobank",
  ],
  gea: [
    "routes.submitAlt.detail.steps.gea.bioproject",
    "routes.submitAlt.detail.steps.gea.biosample",
    "routes.submitAlt.detail.steps.gea.dra",
    "routes.submitAlt.detail.steps.gea.gea",
  ],
  "gea-xenium": [
    "routes.submitAlt.detail.steps.gea-xenium.bioproject",
    "routes.submitAlt.detail.steps.gea-xenium.biosample",
    "routes.submitAlt.detail.steps.gea-xenium.gea",
  ],
  nsss: [
    "routes.submitAlt.detail.steps.nsss.login",
    "routes.submitAlt.detail.steps.nsss.form",
    "routes.submitAlt.detail.steps.nsss.review",
  ],
  genome: [
    "routes.submitAlt.detail.steps.genome.bioproject",
    "routes.submitAlt.detail.steps.genome.biosample",
    "routes.submitAlt.detail.steps.genome.dra",
    "routes.submitAlt.detail.steps.genome.mss",
  ],
} as const satisfies Record<GoalTemplateIdAlt, readonly string[]>

export const GOAL_TEMPLATES_ALT: Readonly<
  Record<GoalTemplateIdAlt, GoalTemplateAlt>
> = {
  "jga": {
    id: "jga",
    venue: "internal",
    commonRequirementsKey: "routes.submitAlt.detail.goalTemplates.jga.common",
    primaryLinks: [
      {
        labelKey: "routes.submitAlt.detail.goalTemplates.jga.links.nbdc",
        url: "https://humandbs.dbcls.jp/",
        external: true,
      },
      {
        labelKey: "routes.submitAlt.detail.goalTemplates.jga.links.jga",
        url: "https://www.ddbj.nig.ac.jp/jga/",
        external: true,
      },
    ],
  },
  "jga-analysis": {
    id: "jga-analysis",
    venue: "internal",
    commonRequirementsKey: "routes.submitAlt.detail.goalTemplates.jga-analysis.common",
    primaryLinks: [
      {
        labelKey: "routes.submitAlt.detail.goalTemplates.jga-analysis.links.jga",
        url: "https://www.ddbj.nig.ac.jp/jga/",
        external: true,
      },
    ],
  },
  "external-jpost": {
    id: "external-jpost",
    venue: "external",
    commonRequirementsKey: "routes.submitAlt.detail.goalTemplates.external-jpost.common",
    primaryLinks: [
      {
        labelKey: "routes.submitAlt.detail.goalTemplates.external-jpost.links.jpost",
        url: "https://jpostdb.org/",
        external: true,
      },
    ],
  },
  "external-eva": {
    id: "external-eva",
    venue: "external",
    commonRequirementsKey: "routes.submitAlt.detail.goalTemplates.external-eva.common",
    primaryLinks: [
      {
        labelKey: "routes.submitAlt.detail.goalTemplates.external-eva.links.eva",
        url: "https://www.ebi.ac.uk/eva/",
        external: true,
      },
    ],
  },
  "external-dgva": {
    id: "external-dgva",
    venue: "external",
    commonRequirementsKey: "routes.submitAlt.detail.goalTemplates.external-dgva.common",
    primaryLinks: [
      {
        labelKey: "routes.submitAlt.detail.goalTemplates.external-dgva.links.dgva",
        url: "https://www.ebi.ac.uk/dgva/",
        external: true,
      },
    ],
  },
  "external-humandbs": {
    id: "external-humandbs",
    venue: "external",
    commonRequirementsKey: "routes.submitAlt.detail.goalTemplates.external-humandbs.common",
    primaryLinks: [
      {
        labelKey: "routes.submitAlt.detail.goalTemplates.external-humandbs.links.humandbs",
        url: "https://humandbs.dbcls.jp/",
        external: true,
      },
    ],
  },
  "jvar": {
    id: "jvar",
    venue: "internal",
    commonRequirementsKey: "routes.submitAlt.detail.goalTemplates.jvar.common",
    primaryLinks: [
      {
        labelKey: "routes.submitAlt.detail.goalTemplates.jvar.links.jvar",
        url: "https://www.ddbj.nig.ac.jp/jvar/",
        external: true,
      },
    ],
  },
  "sra-analysis": {
    id: "sra-analysis",
    venue: "internal",
    commonRequirementsKey: "routes.submitAlt.detail.goalTemplates.sra-analysis.common",
    primaryLinks: [
      {
        labelKey: "routes.submitAlt.detail.goalTemplates.sra-analysis.links.dway",
        url: "https://ddbj.nig.ac.jp/D-way/",
        external: true,
      },
    ],
  },
  "metabobank": {
    id: "metabobank",
    venue: "internal",
    commonRequirementsKey: "routes.submitAlt.detail.goalTemplates.metabobank.common",
    primaryLinks: [
      {
        labelKey: "routes.submitAlt.detail.goalTemplates.metabobank.links.metabobank",
        url: "https://mb2.ddbj.nig.ac.jp/",
        external: true,
      },
    ],
  },
  "gea": {
    id: "gea",
    venue: "internal",
    commonRequirementsKey: "routes.submitAlt.detail.goalTemplates.gea.common",
    primaryLinks: [
      {
        labelKey: "routes.submitAlt.detail.goalTemplates.gea.links.dway",
        url: "https://ddbj.nig.ac.jp/D-way/",
        external: true,
      },
      {
        labelKey: "routes.submitAlt.detail.goalTemplates.gea.links.gea",
        url: "https://www.ddbj.nig.ac.jp/gea/",
        external: true,
      },
    ],
  },
  "gea-xenium": {
    id: "gea-xenium",
    venue: "internal",
    commonRequirementsKey: "routes.submitAlt.detail.goalTemplates.gea-xenium.common",
    primaryLinks: [
      {
        labelKey: "routes.submitAlt.detail.goalTemplates.gea-xenium.links.dway",
        url: "https://ddbj.nig.ac.jp/D-way/",
        external: true,
      },
      {
        labelKey: "routes.submitAlt.detail.goalTemplates.gea-xenium.links.gea",
        url: "https://www.ddbj.nig.ac.jp/gea/",
        external: true,
      },
    ],
  },
  "nsss": {
    id: "nsss",
    venue: "internal",
    commonRequirementsKey: "routes.submitAlt.detail.goalTemplates.nsss.common",
    primaryLinks: [
      {
        labelKey: "routes.submitAlt.detail.goalTemplates.nsss.links.nsss",
        url: "https://www.ddbj.nig.ac.jp/ddbj/web-submission.html",
        external: true,
      },
    ],
  },
  "genome": {
    id: "genome",
    venue: "internal",
    commonRequirementsKey: "routes.submitAlt.detail.goalTemplates.genome.common",
    primaryLinks: [
      {
        labelKey: "routes.submitAlt.detail.goalTemplates.genome.links.dway",
        url: "https://ddbj.nig.ac.jp/D-way/",
        external: true,
      },
      {
        labelKey: "routes.submitAlt.detail.goalTemplates.genome.links.mss",
        url: "https://www.ddbj.nig.ac.jp/ddbj/mss-e.html",
        external: true,
      },
    ],
  },
}
