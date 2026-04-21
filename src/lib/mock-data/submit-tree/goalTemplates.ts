import type { GoalTemplate, GoalTemplateId } from "@/types/submit"

// goal パターン 6 種の共通データ。登録の流れ（steps）は leaf ごとに leafDetails.ts で定義。
// docs/submit-details.md の「goal テンプレート」表と整合。
export const GOAL_TEMPLATES: Readonly<Record<GoalTemplateId, GoalTemplate>> = {
  genome: {
    id: "genome",
    commonRequirementsKey: "routes.submit.detail.goalTemplates.genome.commonRequirements",
    primaryLinks: [
      {
        labelKey: "routes.submit.detail.goalTemplates.genome.links.dway",
        url: "https://ddbj.nig.ac.jp/D-way/",
        external: true,
      },
      {
        labelKey: "routes.submit.detail.goalTemplates.genome.links.mss",
        url: "https://www.ddbj.nig.ac.jp/ddbj/mss-e.html",
        external: true,
      },
    ],
  },
  gea: {
    id: "gea",
    commonRequirementsKey: "routes.submit.detail.goalTemplates.gea.commonRequirements",
    primaryLinks: [
      {
        labelKey: "routes.submit.detail.goalTemplates.gea.links.dway",
        url: "https://ddbj.nig.ac.jp/D-way/",
        external: true,
      },
      {
        labelKey: "routes.submit.detail.goalTemplates.gea.links.gea",
        url: "https://www.ddbj.nig.ac.jp/gea/",
        external: true,
      },
    ],
  },
  nsss: {
    id: "nsss",
    commonRequirementsKey: "routes.submit.detail.goalTemplates.nsss.commonRequirements",
    primaryLinks: [
      {
        labelKey: "routes.submit.detail.goalTemplates.nsss.links.nsss",
        url: "https://www.ddbj.nig.ac.jp/ddbj/web-submission.html",
        external: true,
      },
    ],
  },
  metabobank: {
    id: "metabobank",
    commonRequirementsKey: "routes.submit.detail.goalTemplates.metabobank.commonRequirements",
    primaryLinks: [
      {
        labelKey: "routes.submit.detail.goalTemplates.metabobank.links.metabobank",
        url: "https://mb2.ddbj.nig.ac.jp/",
        external: true,
      },
    ],
  },
  jga: {
    id: "jga",
    commonRequirementsKey: "routes.submit.detail.goalTemplates.jga.commonRequirements",
    primaryLinks: [
      {
        labelKey: "routes.submit.detail.goalTemplates.jga.links.nbdc",
        url: "https://humandbs.dbcls.jp/",
        external: true,
      },
      {
        labelKey: "routes.submit.detail.goalTemplates.jga.links.jga",
        url: "https://www.ddbj.nig.ac.jp/jga/",
        external: true,
      },
    ],
  },
  external: {
    id: "external",
    commonRequirementsKey: "routes.submit.detail.goalTemplates.external.commonRequirements",
    primaryLinks: [],
  },
}
