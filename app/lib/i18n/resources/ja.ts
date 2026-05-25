export type Resources = {
  common: {
    siteName: string
    loading: string
    error: string
    close: string
    detail: string
    countSuffix: string
  }
  errors: {
    notFound: {
      title: string
      description: string
      backToTop: string
    }
    generic: {
      title: string
      description: string
      backToTop: string
    }
  }
  nav: {
    search: string
    submit: string
    about: string
  }
  breadcrumb: {
    home: string
    databases: string
  }
  top: {
    hero: {
      placeholder: string
      submit: string
      examplesLabel: string
      examples: readonly string[]
      advancedLink: string
      a11y: {
        input: string
      }
    }
    serviceGrid: {
      heading: string
    }
    popularResources: {
      heading: string
      groupDdbj: string
      groupDbcls: string
    }
  }
  databases: {
    overviewHeading: string
    relatedHeading: string
    externalLinksHeading: string
    lastUpdatedLabel: string
    notFoundTitle: string
    notFoundDescription: string
    backToTop: string
  }
  db: {
    bioproject: { title: string }
    biosample: { title: string }
  }
  auth: {
    login: string
    logout: string
    loggingIn: string
    callback: {
      title: string
      description: string
      backHome: string
    }
    logoutCallback: {
      title: string
      description: string
      backHome: string
    }
  }
  news: {
    pageTitle: string
    pageDescription: string
    toolbar: {
      count: string
      sort: string
      sortNewest: string
      sortOldest: string
    }
    list: {
      empty: string
      error: string
    }
    facet: {
      heading: string
      category: string
      year: string
      service: string
    }
    category: {
      announcement: string
      release: string
      maintenance: string
      event: string
      news: string
    }
  }
  switchLang: {
    toEn: string
    toJa: string
  }
  notificationBar: {
    close: string
    important: string
  }
  newsAside: {
    heading: string
    viewAll: string
    empty: string
  }
  translationUnavailable: {
    title: string
    description: string
    switchToJa: string
  }
  footer: {
    orgFullName: string
    orgSubtitle: string
    operatedBy: string
    termsOfUse: string
    privacy: string
    accessibility: string
  }
  a11y: {
    skipToContent: string
    breadcrumbNav: string
    mainNav: string
    languageSwitcher: string
    notificationBar: string
    paginationNav: string
    paginationPrev: string
    paginationNext: string
    paginationJumpToLast: string
  }
  submit: {
    pageTitle: string
    pageSubtitle: string
    sections: {
      table: string
      flow: string
    }
    table: {
      caption: string
      headingDescription: string
      columnButtonType: string
      columnFilename: string
      columnOrganism: string
      columnAccess: string
      columnDetail: string
      columnDelete: string
      filenamePlaceholder: string
      detailUnset: string
      empty: string
    }
    buttons: {
      "sequence-read": { label: string; ext: string; hint: string }
      "assembled": { label: string; ext: string; hint: string }
      "gene-annotation": { label: string; ext: string; hint: string }
      "variation": { label: string; ext: string; hint: string }
      "phenotype": { label: string; ext: string; hint: string }
      "microarray-expression": { label: string; ext: string; hint: string }
      "rna-seq-matrix": { label: string; ext: string; hint: string }
      "mass-spec": { label: string; ext: string; hint: string }
      "spatial-tx": { label: string; ext: string; hint: string }
    }
    organism: {
      empty: string
      "human": string
      "human-microbiome": string
      "eukaryote": string
      "prokaryote": string
      "virus": string
      "metagenome": string
      "organelle-plasmid": string
    }
    access: {
      "open": string
      "restricted": string
    }
    progress: {
      heading: string
      remaining: string
      complete: string
    }
    flow: {
      empty: string
      accessionLabel: string
      filenameMissing: string
      noteWarning: string
      noteError: string
      "bioproject": { title: string; description: string; cta: string }
      "umbrella-bioproject": { title: string; description: string; cta: string }
      "biosample": { title: string; description: string; cta: string }
      "dra": { title: string; description: string; cta: string }
      "jga": { title: string; description: string; cta: string }
      "annotation": { title: string; description: string; cta: string }
      "ddbj-mass": { title: string; description: string; cta: string }
      "gea": { title: string; description: string; cta: string }
      "metabobank": { title: string; description: string; cta: string }
      "humandbs": { title: string; description: string; cta: string }
      "dbcls": { title: string; description: string; cta: string }
      "jpost": { title: string; description: string; cta: string }
      "eva": { title: string; description: string; cta: string }
      "dgva": { title: string; description: string; cta: string }
    }
    preview: {
      label: string
      footnote: string
      serviceCode: {
        "bioproject": string
        "umbrella-bioproject": string
        "biosample": string
        "dra": string
        "jga": string
        "annotation": string
        "ddbj-mass": string
        "gea": string
        "metabobank": string
        "humandbs": string
        "dbcls": string
        "jpost": string
        "eva": string
        "dgva": string
      }
      title: {
        "bioproject": string
        "umbrella-bioproject": string
        "biosample": string
        "dra": string
        "jga": string
        "annotation": string
        "ddbj-mass": string
        "gea": string
        "metabobank": string
        "humandbs": string
        "dbcls": string
        "jpost": string
        "eva": string
        "dgva": string
      }
      body: {
        "bioproject": string
        "umbrella-bioproject": string
        "biosample": string
        "dra": string
        "jga": string
        "annotation": string
        "ddbj-mass": string
        "gea": string
        "metabobank": string
        "humandbs": string
        "dbcls": string
        "jpost": string
        "eva": string
        "dgva": string
      }
    }
    modal: {
      title: string
      description: string
      save: string
      cancel: string
      statusReady: string
      previewLabel: string
      previewFootnote: string
      formGroupLabels: {
        structure: string
        multiplex: string
        analysisOutput: string
        form: string
        annotationPair: string
        provenance: string
        target: string
        reference: string
        phenotypeType: string
        dataForm: string
        platform: string
        domain: string
        method: string
        stage: string
      }
      options: {
        sequenceRead: {
          singleEnd: { label: string; sub: string }
          pairEnd: { label: string; sub: string }
          tenx: { label: string; sub: string }
          pacbio: { label: string; sub: string }
          perSample: { label: string; sub: string }
          multiplex: { label: string; sub: string }
          geaPair: { label: string; sub: string }
        }
        assembled: {
          assembled: { label: string; sub: string }
          hybrid: { label: string; sub: string }
          magSag: { label: string; sub: string }
          annotationPair: { label: string; sub: string }
          firstParty: { label: string; sub: string }
          thirdParty: { label: string; sub: string }
        }
        geneAnnotation: {
          assemblyPair: { label: string; sub: string }
          standalone: { label: string; sub: string }
          firstParty: { label: string; sub: string }
          thirdParty: { label: string; sub: string }
        }
        variation: {
          perSample: { label: string; sub: string }
          aggregate: { label: string; sub: string }
          withRef: { label: string; sub: string }
          withoutRef: { label: string; sub: string }
        }
        phenotype: {
          clinical: { label: string; sub: string }
          modelOrganism: { label: string; sub: string }
          raw: { label: string; sub: string }
          summary: { label: string; sub: string }
        }
        microarray: {
          singleColor: { label: string; sub: string }
          twoColor: { label: string; sub: string }
        }
        rnaSeq: {
          rawCounts: { label: string; sub: string }
          normalized: { label: string; sub: string }
        }
        massSpec: {
          proteomics: { label: string; sub: string }
          metabolomics: { label: string; sub: string }
          shotgun: { label: string; sub: string }
          imaging: { label: string; sub: string }
        }
        spatial: {
          visium: { label: string; sub: string }
          stereoSeq: { label: string; sub: string }
          raw: { label: string; sub: string }
          analysis: { label: string; sub: string }
        }
      }
      confirmDelete: {
        title: string
        description: string
        confirm: string
        cancel: string
      }
    }
    biosample: { intro: string }
    bioproject: { intro: string }
    umbrella: { intro: string; publicOnly: string }
    dra: { intro: string }
    jga: { intro: string; dbclsApplicationRequired: string }
    annotation: { intro: string }
    variation: {
      internal: { intro: string; togovarLink: string }
      external: { restrictedHuman: string }
    }
    gea: { intro: string; mageTabRequired: string }
    metabobank: { intro: string; jpostRedirect: string }
    thirdParty: { intro: string; originDoiRequired: string }
    multiModal: { warning: string }
    validations: {
      heading: string
      rowReference: string
      "missing-filename": string
      "missing-organism": string
      "inconsistent-group-type": string
      "dangling-group-id": string
    }
    a11y: {
      filenameCell: string
      organismCell: string
      accessCell: string
      editDetail: string
      deleteRow: string
      modalClose: string
    }
  }
  search: {
    pageTitle: string
    pageSubtitle: string
    searchBoxPlaceholder: string
    syntax: {
      spaceAnd: string
      phrase: string
      advancedHint: string
    }
    examples: {
      label: string
      items: readonly string[]
    }
    builder: {
      heading: string
      countSuffix: string
      empty: {
        label: string
        description: string
      }
      addCondition: string
      addGroup: string
      where: string
      combinator: {
        and: string
        or: string
        not: string
      }
      group: string
      removeCondition: string
      removeGroup: string
      field: {
        organism: string
        identifier: string
        title: string
        description: string
        datePublished: string
        dateModified: string
        dateCreated: string
      }
      op: {
        eq: string
        contains: string
        wildcard: string
        between: string
      }
      rangeFromLabel: string
      rangeToLabel: string
      rangeFromPlaceholder: string
      rangeToPlaceholder: string
      valuePlaceholder: string
    }
    preview: {
      label: string
      copy: string
      copied: string
      edit: string
      clear: string
    }
    actions: {
      submit: string
      clear: string
    }
    results: {
      cross: {
        heading: string
        viewAll: string
        topHits: string
        noTopHits: string
        retry: string
        error: string
        countAria: string
      }
      perDb: {
        hardLimit: string
        totalCount: string
        rangeSummary: string
        empty: string
        error: string
      }
      sort: {
        label: string
        relevance: string
        dateDesc: string
        dateAsc: string
      }
      perPage: {
        label: string
      }
    }
    facets: {
      heading: string
      appliedClearAll: string
      appliedPrefix: string
      organism: string
      submitter: string
      studyType: string
      sampleCount: string
      datePublished: string
      dateRange: {
        all: string
        oneYear: string
        fiveYears: string
        tenYears: string
        fromLabel: string
        toLabel: string
      }
      showMore: string
      clearGroup: string
      empty: string
    }
    sync: {
      syncing: string
      synced: string
      failed: string
      retry: string
    }
    assistant: {
      heading: string
      description: string
      placeholder: string
      examplesLabel: string
      examples: readonly string[]
      generate: string
      generating: string
      proposalLabel: string
      proposalDescription: string
      apply: string
      reset: string
    }
    scope: {
      all: string
      trad: string
      sra: string
      bioproject: string
      biosample: string
      jga: string
      gea: string
      metabobank: string
      taxonomy: string
    }
    descriptions: {
      trad: string
      sra: string
      bioproject: string
      biosample: string
      jga: string
      gea: string
      metabobank: string
      taxonomy: string
    }
    errors: {
      parseFailure: string
      crossSearchFailure: string
      dbSearchFailure: string
      serializeFailure: string
    }
    a11y: {
      input: string
      submit: string
      builderConditions: string
      fieldSelector: string
      opSelector: string
      facetGroup: string
      removeFilter: string
      queryPreview: string
      resultsRegion: string
      assistantInput: string
      assistantStop: string
    }
  }
}

export const ja: Resources = {
  common: {
    siteName: "DDBJ 刷新 (仮)",
    loading: "読み込み中",
    error: "エラー",
    close: "閉じる",
    detail: "詳細",
    countSuffix: "件",
  },
  errors: {
    notFound: {
      title: "ページが見つかりません",
      description: "お探しのページは見つかりませんでした。URL に誤りがないかご確認ください。",
      backToTop: "トップへ戻る",
    },
    generic: {
      title: "エラーが発生しました",
      description: "しばらく時間をおいてから再度お試しください。",
      backToTop: "トップへ戻る",
    },
  },
  nav: {
    search: "検索",
    submit: "登録",
    about: "About us",
  },
  breadcrumb: {
    home: "ホーム",
    databases: "データベース",
  },
  top: {
    hero: {
      placeholder: "キーワード、accession、学名で検索",
      submit: "検索",
      examplesLabel: "例",
      examples: ["cancer", "Homo sapiens", "PRJDB*"],
      advancedLink: "クエリビルダーで詳細条件を組む",
      a11y: { input: "検索キーワード" },
    },
    serviceGrid: { heading: "サービス" },
    popularResources: {
      heading: "Popular Resources",
      groupDdbj: "DDBJ",
      groupDbcls: "DBCLS",
    },
  },
  databases: {
    overviewHeading: "概要",
    relatedHeading: "関連データベース",
    externalLinksHeading: "外部リンク",
    lastUpdatedLabel: "最終更新",
    notFoundTitle: "データベースが見つかりません",
    notFoundDescription: "指定された slug に対応するコンテンツがありません。",
    backToTop: "トップへ戻る",
  },
  db: {
    bioproject: { title: "BioProject" },
    biosample: { title: "BioSample" },
  },
  auth: {
    login: "ログイン",
    logout: "ログアウト",
    loggingIn: "認証中…",
    callback: {
      title: "サインイン処理中",
      description: "認証が完了するまでしばらくお待ちください。",
      backHome: "トップへ戻る",
    },
    logoutCallback: {
      title: "サインアウトしました",
      description: "ご利用ありがとうございました。",
      backHome: "トップへ戻る",
    },
  },
  news: {
    pageTitle: "お知らせ・ニュース",
    pageDescription: "DDBJ センターからのお知らせ、リリースノート、メンテナンス情報をまとめて確認できます。",
    toolbar: {
      count: "全 {{count}} 件",
      sort: "並び順",
      sortNewest: "新しい順",
      sortOldest: "古い順",
    },
    list: {
      empty: "条件に一致するお知らせはありません",
      error: "お知らせの取得に失敗しました",
    },
    facet: {
      heading: "絞り込み",
      category: "種別",
      year: "年",
      service: "サービス",
    },
    category: {
      announcement: "重要なお知らせ",
      release: "リリース",
      maintenance: "メンテナンス",
      event: "イベント",
      news: "ニュース",
    },
  },
  switchLang: {
    toEn: "English",
    toJa: "日本語",
  },
  notificationBar: {
    close: "通知を閉じる",
    important: "重要",
  },
  newsAside: {
    heading: "お知らせ",
    viewAll: "すべて見る",
    empty: "新着のお知らせはありません",
  },
  translationUnavailable: {
    title: "このページの英語訳は未提供です",
    description: "日本語版を表示しています。翻訳の追加を予定しています。",
    switchToJa: "日本語版を表示",
  },
  footer: {
    orgFullName: "DDBJ — Bioinformation and DDBJ Center",
    orgSubtitle: "National Institute of Genetics · ROIS / BSI",
    operatedBy: "運営組織",
    termsOfUse: "利用規約",
    privacy: "プライバシー",
    accessibility: "アクセシビリティ",
  },
  a11y: {
    skipToContent: "メインコンテンツへスキップ",
    breadcrumbNav: "パンくずリスト",
    mainNav: "メインナビゲーション",
    languageSwitcher: "言語切替",
    notificationBar: "重要なお知らせ",
    paginationNav: "ページネーション",
    paginationPrev: "前のページ",
    paginationNext: "次のページ",
    paginationJumpToLast: "{{n}} ページ目へ",
  },
  submit: {
    pageTitle: "登録ナビゲーション",
    pageSubtitle: "ファイルの種類・生物・公開区分を入力すると、必要な登録経路を自動で組み立てます。",
    sections: {
      table: "ファイルテーブル",
      flow: "登録フロー",
    },
    table: {
      caption: "登録ファイル一覧",
      headingDescription: "登録したいファイルを種別ボタンから追加し、生物・公開区分・データ詳細を埋めてください。",
      columnButtonType: "種別",
      columnFilename: "ファイル名",
      columnOrganism: "生物",
      columnAccess: "公開区分",
      columnDetail: "データ詳細",
      columnDelete: "削除",
      filenamePlaceholder: "例: read-001_R1.fastq.gz",
      detailUnset: "+ 設定",
      empty: "NO FILES",
    },
    buttons: {
      "sequence-read": { label: "配列リード", ext: "fastq", hint: "FASTQ / BAM 形式のシーケンス読み出し" },
      "assembled": { label: "組み立て済み配列", ext: "fasta", hint: "アセンブリ済みの FASTA / GFA" },
      "gene-annotation": { label: "遺伝子アノテーション", ext: "gff", hint: "GFF / GTF / EMBL 形式のアノテーション" },
      "variation": { label: "変異情報", ext: "vcf", hint: "VCF / 解析結果の変異データ" },
      "phenotype": { label: "表現型データ", ext: "tsv", hint: "TSV 形式の表現型・臨床情報" },
      "microarray-expression": { label: "マイクロアレイ発現", ext: "cel", hint: "CEL / MAGE-TAB 形式の発現データ" },
      "rna-seq-matrix": { label: "RNA-seq マトリクス", ext: "tsv", hint: "RNA-seq 発現量マトリクス" },
      "mass-spec": { label: "質量分析", ext: "mzML", hint: "mzML / mzXML 形式の質量スペクトル" },
      "spatial-tx": { label: "空間トランスクリプトーム", ext: "tsv", hint: "Visium / Stereo-seq 等の空間データ" },
    },
    organism: {
      empty: "—",
      "human": "ヒト (Homo sapiens)",
      "human-microbiome": "ヒト関連マイクロバイオーム",
      "eukaryote": "真核生物 (ヒト以外)",
      "prokaryote": "原核生物",
      "virus": "ウイルス",
      "metagenome": "メタゲノム",
      "organelle-plasmid": "オルガネラ / プラスミド",
    },
    access: {
      "open": "公開 (open)",
      "restricted": "制限公開 (restricted)",
    },
    progress: {
      heading: "データ詳細 設定済み",
      remaining: "残り {{count}} 件のデータ詳細を設定すると、フローカードの詳細が確定します。",
      complete: "すべての行のデータ詳細が設定されています。",
    },
    flow: {
      empty: "ファイルを追加すると、必要な登録手順 (BioProject + BioSample + DRA / MSS / GEA / JGA など) が自動で組み立てられます。",
      accessionLabel: "発行 accession (例)",
      filenameMissing: "<ファイル名未設定>",
      noteWarning: "要注意",
      noteError: "エラー",
      "bioproject": {
        title: "BioProject 登録",
        description: "研究プロジェクトの輪郭を表すメタデータ。生物 / アクセス区分の組み合わせごとに分裂する場合があります。",
        cta: "BioProject 登録 (D-way) を開く",
      },
      "umbrella-bioproject": {
        title: "Umbrella BioProject 登録",
        description: "複数 BioProject の親プロジェクトとして公開する場合に必要です。",
        cta: "Umbrella BioProject の案内を開く",
      },
      "biosample": {
        title: "BioSample 登録",
        description: "試料 (個体・組織・培養株・環境メタゲノム等) ごとのメタデータ。",
        cta: "BioSample 登録 (D-way) を開く",
      },
      "dra": {
        title: "DRA (Run / Experiment / Analysis)",
        description: "公開シーケンスリードを Sequence Read Archive に登録します。",
        cta: "DRA 登録の案内を開く",
      },
      "jga": {
        title: "JGA 制限公開リード登録",
        description: "ヒト由来制限公開リードを JGA に登録します。DBCLS への申請が必要です。",
        cta: "JGA 登録の案内を開く",
      },
      "annotation": {
        title: "Annotation (MSS) 登録",
        description: "GFF / GTF / EMBL 形式のアノテーションをアセンブリと併せて登録します。",
        cta: "アノテーション登録の案内を開く",
      },
      "ddbj-mass": {
        title: "DDBJ Mass 登録",
        description: "アセンブリ・解析結果・third-party など、DDBJ Mass で受け入れる多目的ストアです。",
        cta: "DDBJ Mass の案内を開く",
      },
      "gea": {
        title: "GEA (Gene Expression Archive) 登録",
        description: "マイクロアレイ / RNA-seq の発現量マトリクスを MAGE-TAB と共に登録します。",
        cta: "GEA 登録の案内を開く",
      },
      "metabobank": {
        title: "MetaboBank 登録",
        description: "メタボロームデータを MetaboBank に登録します (proteomics は jpost 案内)。",
        cta: "MetaboBank の登録ページを開く",
      },
      "humandbs": {
        title: "humandbs への誘導",
        description: "DBCLS が運用する humandbs への登録について案内します。",
        cta: "humandbs を開く",
      },
      "dbcls": {
        title: "DBCLS への申請",
        description: "JGA / humandbs 等の DBCLS 経由申請について案内します。",
        cta: "DBCLS を開く",
      },
      "jpost": {
        title: "jPOST への誘導",
        description: "プロテオーム質量分析は DDBJ MetaboBank ではなく jPOST へ誘導します。",
        cta: "jPOST を開く",
      },
      "eva": {
        title: "European Variation Archive への誘導",
        description: "ヒト由来制限公開の変異データは EVA への登録を検討してください。",
        cta: "EVA を開く",
      },
      "dgva": {
        title: "DGVa への誘導",
        description: "大規模構造変異は DGVa (Database of Genomic Variants archive) を検討してください。",
        cta: "DGVa を開く",
      },
    },
    preview: {
      label: "この設定で組まれる登録",
      footnote: "この内容で保存すると、テーブルおよびフローカードに反映されます。",
      serviceCode: {
        "bioproject": "BioProject",
        "umbrella-bioproject": "Umbrella BP",
        "biosample": "BioSample",
        "dra": "DRA",
        "jga": "JGA",
        "annotation": "Annotation",
        "ddbj-mass": "DDBJ Mass",
        "gea": "GEA",
        "metabobank": "MetaboBank",
        "humandbs": "humandbs",
        "dbcls": "DBCLS",
        "jpost": "jPOST",
        "eva": "EVA",
        "dgva": "DGVa",
      },
      title: {
        "bioproject": "1 BioProject",
        "umbrella-bioproject": "1 Umbrella BP",
        "biosample": "1 BioSample",
        "dra": "Experiment + Run",
        "jga": "Submission + Dataset",
        "annotation": "Annotation Entry",
        "ddbj-mass": "Mass Entry",
        "gea": "Data Object (発現量行列)",
        "metabobank": "Metabolome Entry",
        "humandbs": "humandbs Application",
        "dbcls": "DBCLS Application",
        "jpost": "jPOST Submission",
        "eva": "EVA Submission",
        "dgva": "DGVa Submission",
      },
      body: {
        "bioproject": "研究プロジェクトのメタデータが BioProject に登録されます。",
        "umbrella-bioproject": "複数の BioProject を束ねる Umbrella を新規発行します。",
        "biosample": "試料の属性を BioSample に登録します。",
        "dra": "シーケンスリードを公開アーカイブに登録します。",
        "jga": "制限公開ヒトリードを JGA に登録します。",
        "annotation": "GFF / GTF を MSS で登録します。",
        "ddbj-mass": "アセンブリや解析結果を DDBJ Mass に登録します。",
        "gea": "発現量マトリクスを GEA に登録します。",
        "metabobank": "メタボローム質量分析を MetaboBank に登録します。",
        "humandbs": "humandbs への申請を案内します。",
        "dbcls": "DBCLS への事前申請を案内します。",
        "jpost": "プロテオーム質量分析は jPOST へ。",
        "eva": "ヒト変異は EVA への登録を検討します。",
        "dgva": "構造変異は DGVa への登録を検討します。",
      },
    },
    modal: {
      title: "データ詳細を入力",
      description: "ファイルの構成と内容を選ぶと、組まれる登録 (BioSample / DRA / GEA 等) が右側プレビューに反映されます。",
      save: "この内容で保存",
      cancel: "キャンセル",
      statusReady: "必須項目はすべて入力済み · 保存後はいつでも編集できます",
      previewLabel: "この設定で組まれる登録",
      previewFootnote: "この内容で保存すると、テーブルおよびフローカードに反映されます。",
      formGroupLabels: {
        structure: "リードの構成は?",
        multiplex: "サンプルの混合状況は?",
        analysisOutput: "発現量等の解析済みデータも登録しますか?",
        form: "形式は?",
        annotationPair: "アノテーションも同時に登録しますか?",
        provenance: "データの由来は?",
        target: "アノテーション対象は?",
        reference: "リファレンス FASTA も同時に登録しますか?",
        phenotypeType: "表現型データの種類は?",
        dataForm: "データの形は?",
        platform: "プラットフォームは?",
        domain: "質量分析の領域は?",
        method: "取得方法は?",
        stage: "解析段階は?",
      },
      options: {
        sequenceRead: {
          singleEnd: { label: "single-end FASTQ", sub: "1 ファイル" },
          pairEnd: { label: "pair-end FASTQ", sub: "R1 + R2 の 2 ファイル" },
          tenx: { label: "10x Genomics FASTQ", sub: "I1 + R1 + R2 の 3 ファイル" },
          pacbio: { label: "PacBio HDF5", sub: "bas.h5 + bax.h5 × 3" },
          perSample: { label: "1 サンプル分の FASTQ", sub: "サンプル単位のリード" },
          multiplex: { label: "事前 demultiplex 済み per-sample FASTQ", sub: "1 group に複数 sample 由来のリードが混在" },
          geaPair: { label: "解析済みデータも GEA に登録する", sub: "発現量行列 / peak / scRNA counts 等" },
        },
        assembled: {
          assembled: { label: "アセンブリ済み (single)", sub: "1 ファイル / 1 アセンブリ" },
          hybrid: { label: "Hybrid assembly (long + short)", sub: "Hybrid scope note を付与" },
          magSag: { label: "MAG / SAG chain", sub: "raw → primary → binned → mag/sag" },
          annotationPair: { label: "アノテーションと同時登録", sub: "GFF / GTF を同時に取り扱う" },
          firstParty: { label: "自分たちの解析データ", sub: "通常の DDBJ 経路" },
          thirdParty: { label: "third-party (公開済データの再解析)", sub: "元データの DOI 必須" },
        },
        geneAnnotation: {
          assemblyPair: { label: "アセンブリと同時登録", sub: "DDBJ Mass + Annotation 連動" },
          standalone: { label: "アノテーションのみ", sub: "Annotation のみ" },
          firstParty: { label: "自分たちのアノテーション", sub: "通常の DDBJ 経路" },
          thirdParty: { label: "third-party", sub: "元データの DOI 必須" },
        },
        variation: {
          perSample: { label: "サンプルごとの VCF", sub: "サンプル単位の variants" },
          aggregate: { label: "集約済み VCF", sub: "集約された aggregate VCF" },
          withRef: { label: "リファレンス FASTA も登録する", sub: "VCF + reference FASTA pair" },
          withoutRef: { label: "VCF のみ", sub: "リファレンスは登録済みのものを参照" },
        },
        phenotype: {
          clinical: { label: "臨床表現型", sub: "ヒト臨床表現型 (host-pathogen chip)" },
          modelOrganism: { label: "モデル生物 / 実験表現型", sub: "実験動物・植物などの表現型" },
          raw: { label: "raw 計測", sub: "実測値そのまま" },
          summary: { label: "サマリ統計", sub: "サマリ統計に集約" },
        },
        microarray: {
          singleColor: { label: "single-color アレイ", sub: "MAGE-TAB IDF + SDRF 一式" },
          twoColor: { label: "two-color アレイ", sub: "Cy3 / Cy5 の two-color アレイ" },
        },
        rnaSeq: {
          rawCounts: { label: "raw counts マトリクス", sub: "Sample × Gene の count matrix" },
          normalized: { label: "正規化済みマトリクス", sub: "TPM / FPKM / 正規化済み" },
        },
        massSpec: {
          proteomics: { label: "プロテオーム", sub: "jPOST への誘導が追加されます" },
          metabolomics: { label: "メタボローム", sub: "MetaboBank に登録" },
          shotgun: { label: "通常 (shotgun / targeted)", sub: "通常のショットガン / ターゲット型" },
          imaging: { label: "イメージング質量分析", sub: "imaging-ms (空間質量分析)" },
        },
        spatial: {
          visium: { label: "10x Visium", sub: "10x Visium / Visium HD" },
          stereoSeq: { label: "Stereo-seq", sub: "BGI Stereo-seq" },
          raw: { label: "raw 計測", sub: "FASTQ + Image / SubBC マトリクス" },
          analysis: { label: "解析済み出力", sub: "解析後の出力 (clusters / DEGs)" },
        },
      },
      confirmDelete: {
        title: "この行を削除しますか?",
        description: "削除すると、この行に関連する Step とプレビューが変更されます。",
        confirm: "削除する",
        cancel: "キャンセル",
      },
    },
    biosample: {
      intro: "試料単位のメタデータ。organism / package を選んで登録します。",
    },
    bioproject: {
      intro: "研究プロジェクトの輪郭を BioProject として登録します。",
    },
    umbrella: {
      intro: "複数の BioProject を束ねる Umbrella を発行します。",
      publicOnly: "Umbrella は公開のみ受け付けます。",
    },
    dra: {
      intro: "公開のシーケンスリードを DRA に登録します。",
    },
    jga: {
      intro: "制限公開ヒトリードは JGA に登録します。",
      dbclsApplicationRequired: "JGA 登録には事前に DBCLS への利用申請が必要です。",
    },
    annotation: {
      intro: "GFF / GTF / EMBL のアノテーションを登録します。",
    },
    variation: {
      internal: {
        intro: "open / 制限ヒト以外の変異データは DDBJ Mass (TogoVar 連携) に登録します。",
        togovarLink: "TogoVar Annotator 経由でアノテーション付与を依頼できます。",
      },
      external: {
        restrictedHuman: "ヒト由来制限公開の変異は EVA への登録を検討してください。",
      },
    },
    gea: {
      intro: "発現量マトリクスを GEA に登録します。",
      mageTabRequired: "MAGE-TAB IDF + SDRF が必要です。",
    },
    metabobank: {
      intro: "質量分析メタデータを MetaboBank に登録します。",
      jpostRedirect: "プロテオームは jPOST への登録を案内します。",
    },
    thirdParty: {
      intro: "third-party 由来のデータは DDBJ Mass の TPA scope に振り分けられます。",
      originDoiRequired: "元データの DOI を必ず付与してください。",
    },
    multiModal: {
      warning: "同一グループに異種ファイルが混在しています。multi-modal scope として扱います。",
    },
    validations: {
      heading: "{{count}} 件のデータ設定が flow-rules と整合していません。",
      rowReference: "→ 行 #{{index}} を編集",
      "missing-filename": "ファイル名が未入力です。",
      "missing-organism": "生物が未選択です。",
      "inconsistent-group-type": "GroupType がボタン種別と整合していません。",
      "dangling-group-id": "グループ参照が壊れています。",
    },
    a11y: {
      filenameCell: "ファイル名",
      organismCell: "生物の選択",
      accessCell: "公開区分の選択",
      editDetail: "データ詳細を編集",
      deleteRow: "この行を削除",
      modalClose: "モーダルを閉じる",
    },
  },
  search: {
    pageTitle: "データベース横断検索",
    pageSubtitle: "8 つの DDBJ データベースを横断して検索します。",
    searchBoxPlaceholder: "キーワード、accession、学名で検索",
    syntax: {
      spaceAnd: "スペース = AND 検索",
      phrase: "\"…\" = フレーズ検索",
      advancedHint: "フィールド指定や AND / OR / NOT はクエリビルダーで組み立てます。",
    },
    examples: {
      label: "例",
      items: [
        "cancer",
        "Homo sapiens",
        "organism:\"Mus musculus\"",
        "title:\"single cell\"",
        "date_published:[2022-01-01 TO 2024-12-31]",
        "PRJDB*",
      ],
    },
    builder: {
      heading: "クエリビルダー",
      countSuffix: "件",
      empty: {
        label: "NO CONDITIONS",
        description: "検索条件を追加するとクエリが組み立てられます。",
      },
      addCondition: "+ 条件を追加",
      addGroup: "+ グループを追加",
      where: "WHERE",
      combinator: {
        and: "AND",
        or: "OR",
        not: "NOT",
      },
      group: "グループ",
      removeCondition: "条件を削除",
      removeGroup: "グループを削除",
      field: {
        organism: "生物種 (organism)",
        identifier: "識別子 (identifier)",
        title: "タイトル (title)",
        description: "説明 (description)",
        datePublished: "公開日 (date_published)",
        dateModified: "更新日 (date_modified)",
        dateCreated: "作成日 (date_created)",
      },
      op: {
        eq: "= (完全一致)",
        contains: "を含む",
        wildcard: "ワイルドカード",
        between: "範囲",
      },
      rangeFromLabel: "FROM",
      rangeToLabel: "TO",
      rangeFromPlaceholder: "YYYY-MM-DD",
      rangeToPlaceholder: "YYYY-MM-DD",
      valuePlaceholder: "値を入力",
    },
    preview: {
      label: "クエリプレビュー",
      copy: "コピー",
      copied: "コピーしました",
      edit: "クエリビルダーで編集",
      clear: "クリア",
    },
    actions: {
      submit: "この条件で検索",
      clear: "クリア",
    },
    results: {
      cross: {
        heading: "横断検索結果",
        viewAll: "結果一覧",
        topHits: "上位ヒット",
        noTopHits: "上位ヒットはありません",
        retry: "再試行",
        error: "このデータベースの集計に失敗しました",
        countAria: "ヒット件数",
      },
      perDb: {
        hardLimit: "上位 10,000 件まで表示しています",
        totalCount: "{{total}} 件",
        rangeSummary: "{{total}} 件中 {{start}}-{{end}}",
        empty: "条件に一致する結果がありません",
        error: "検索に失敗しました",
      },
      sort: {
        label: "並び替え",
        relevance: "関連度順",
        dateDesc: "新しい順",
        dateAsc: "古い順",
      },
      perPage: {
        label: "1 ページあたり",
      },
    },
    facets: {
      heading: "絞り込み",
      appliedClearAll: "すべて解除",
      appliedPrefix: "適用中",
      organism: "生物種",
      submitter: "登録機関",
      studyType: "研究タイプ",
      sampleCount: "サンプル数",
      datePublished: "公開日",
      dateRange: {
        all: "すべて",
        oneYear: "1 年",
        fiveYears: "5 年",
        tenYears: "10 年",
        fromLabel: "FROM",
        toLabel: "TO",
      },
      showMore: "+ さらに表示",
      clearGroup: "解除",
      empty: "facet はありません",
    },
    sync: {
      syncing: "URL 同期中",
      synced: "URL 同期済み",
      failed: "URL 同期失敗",
      retry: "再試行",
    },
    assistant: {
      heading: "AI 検索アシスタント",
      description: "自然な日本語で条件を書くと、クエリビルダーへの追加候補を提案します。",
      placeholder: "例: ヒトの 2022 年以降に公開されたがん関連の BioProject",
      examplesLabel: "例",
      examples: [
        "シングルセル RNA-seq のヒト試料",
        "2022 年以降に公開された大腸がん研究",
        "病原性細菌のゲノム配列で公開済みのもの",
      ],
      generate: "提案を生成",
      generating: "生成中…",
      proposalLabel: "提案",
      proposalDescription: "内容を確認してください",
      apply: "クエリビルダーに追加",
      reset: "やり直す",
    },
    scope: {
      all: "全データベース",
      trad: "DDBJ (Trad)",
      sra: "SRA",
      bioproject: "BioProject",
      biosample: "BioSample",
      jga: "JGA",
      gea: "GEA",
      metabobank: "MetaboBank",
      taxonomy: "Taxonomy",
    },
    descriptions: {
      trad: "DDBJ / ENA / GenBank の核酸配列レコード",
      sra: "短鎖シーケンスリードのアーカイブ",
      bioproject: "研究プロジェクトのメタデータ",
      biosample: "生物サンプル単位の属性",
      jga: "ヒト由来制限公開データ",
      gea: "遺伝子発現アーカイブ",
      metabobank: "メタボロームデータの登録",
      taxonomy: "NCBI Taxonomy ベースの分類体系",
    },
    errors: {
      parseFailure: "URL のクエリを解析できませんでした",
      crossSearchFailure: "横断検索に失敗しました",
      dbSearchFailure: "検索に失敗しました",
      serializeFailure: "URL の同期に失敗しました",
    },
    a11y: {
      input: "検索キーワード",
      submit: "検索を実行",
      builderConditions: "クエリビルダーの条件一覧",
      fieldSelector: "検索フィールド",
      opSelector: "演算子",
      facetGroup: "ファセット",
      removeFilter: "フィルタを解除",
      queryPreview: "クエリプレビュー",
      resultsRegion: "検索結果",
      assistantInput: "AI 検索アシスタントへの入力",
      assistantStop: "提案の生成を停止",
    },
  },
}
