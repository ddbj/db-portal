import type { Service } from "~/schemas/submit"

export type ExternalLink = {
  url: string
  labelKey: string
}

export const EXTERNAL_LINKS: Readonly<Record<Service, ExternalLink>> = {
  "bioproject": {
    url: "https://ddbj.nig.ac.jp/resource/sra-study",
    labelKey: "submit.flow.bioproject.cta",
  },
  "umbrella-bioproject": {
    url: "https://www.ddbj.nig.ac.jp/bioproject/umbrella.html",
    labelKey: "submit.flow.umbrella-bioproject.cta",
  },
  "biosample": {
    url: "https://www.ddbj.nig.ac.jp/biosample/submission.html",
    labelKey: "submit.flow.biosample.cta",
  },
  "dra": {
    url: "https://www.ddbj.nig.ac.jp/dra/submission.html",
    labelKey: "submit.flow.dra.cta",
  },
  "jga": {
    url: "https://www.ddbj.nig.ac.jp/jga/submission.html",
    labelKey: "submit.flow.jga.cta",
  },
  "annotation": {
    url: "https://www.ddbj.nig.ac.jp/ddbj/file-format.html",
    labelKey: "submit.flow.annotation.cta",
  },
  "ddbj-mass": {
    url: "https://www.ddbj.nig.ac.jp/ddbj/mss.html",
    labelKey: "submit.flow.ddbj-mass.cta",
  },
  "gea": {
    url: "https://www.ddbj.nig.ac.jp/gea/submission.html",
    labelKey: "submit.flow.gea.cta",
  },
  "metabobank": {
    url: "https://mb2.ddbj.nig.ac.jp/submission/",
    labelKey: "submit.flow.metabobank.cta",
  },
  "humandbs": {
    url: "https://humandbs.dbcls.jp/",
    labelKey: "submit.flow.humandbs.cta",
  },
  "dbcls": {
    url: "https://dbcls.rois.ac.jp/",
    labelKey: "submit.flow.dbcls.cta",
  },
  "jpost": {
    url: "https://jpostdb.org/",
    labelKey: "submit.flow.jpost.cta",
  },
  "eva": {
    url: "https://www.ebi.ac.uk/eva/",
    labelKey: "submit.flow.eva.cta",
  },
  "dgva": {
    url: "https://www.ebi.ac.uk/dgva/",
    labelKey: "submit.flow.dgva.cta",
  },
}

export const ACCESSION_PLACEHOLDERS: Readonly<Record<Service, readonly string[]>> = {
  "bioproject": ["PRJDB######"],
  "umbrella-bioproject": ["PRJDB###### (umbrella)"],
  "biosample": ["SAMD######"],
  "dra": ["DRR######", "DRX######"],
  "jga": ["JGAS######", "JGAD######"],
  "annotation": ["AB######"],
  "ddbj-mass": ["E-GEAD-######"],
  "gea": ["E-GEAD-######"],
  "metabobank": ["MTBKS####"],
  "humandbs": ["hum#####"],
  "dbcls": [],
  "jpost": ["JPST######"],
  "eva": ["EVA######"],
  "dgva": ["estd###"],
}

export const SOURCE_OF_SERVICE: Readonly<Record<Service, "DDBJ" | "DBCLS" | null>> = {
  "bioproject": "DDBJ",
  "umbrella-bioproject": "DDBJ",
  "biosample": "DDBJ",
  "dra": "DDBJ",
  "jga": "DDBJ",
  "annotation": "DDBJ",
  "ddbj-mass": "DDBJ",
  "gea": "DDBJ",
  "metabobank": "DDBJ",
  "humandbs": "DBCLS",
  "dbcls": "DBCLS",
  "jpost": null,
  "eva": null,
  "dgva": null,
}
