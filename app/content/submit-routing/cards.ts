import type { Service } from "~/schemas/submit"

// 登録フロー詳細カードの service 別文言 (外部ウィザードの予告)。
// DDBJ 公式の登録手順 (ddbj/www の submission*.md / web-submission*.md) を根拠とする。
// 文言の更新は本モジュールと i18n の汎用ラベルだけで完結する (docs/submit.md「SSOT とデータ管理」)。
// Record<Service, CardCopy> が全 service の網羅を型で固定する。
export type CardCopy = {
  wizardSteps: { ja: readonly string[]; en: readonly string[] }
  prepare: { ja: readonly string[]; en: readonly string[] }
  gotcha?: { ja: string; en: string }
  issuedNote?: { ja: string; en: string }
}

export const SUBMIT_CARDS: Readonly<Record<Service, CardCopy>> = {
  "umbrella-bioproject": {
    wizardSteps: {
      ja: [
        "D-way にログインして BioProject メニューを選択",
        "「New submission」で Umbrella BioProject を新規作成（Project type: Umbrella を選択）",
        "配下にリンクする BioProject（Principal/Alternate haplotype 用）のアクセッション番号と区別を記入",
      ],
      en: [
        "Log in to D-way and navigate to the BioProject menu",
        "Click [New submission] and create an umbrella BioProject (select Project type: Umbrella)",
        "Enter the accession numbers and labels of the child BioProjects (for Principal/Alternate haplotypes) to link under the umbrella",
      ],
    },
    prepare: {
      ja: [
        "配下にリンクする各ハプロタイプ用 BioProject のアクセッション番号（PRJDB######）",
        "各ハプロタイプの区別ラベル（Principal/Alternate、Haplotype 1/2、Maternal/Paternal のいずれか）",
      ],
      en: [
        "Accession numbers (PRJDB######) of the child BioProjects for each haplotype",
        "Label for each haplotype (Principal/Alternate, Haplotype 1/2, or Maternal/Paternal)",
      ],
    },
    issuedNote: { ja: "Umbrella BioProject ID (PRJDB######) が発行され、各ハプロタイプの BioProject を束ねます。", en: "An umbrella BioProject ID (PRJDB######) is issued and groups the child BioProjects for each haplotype." },
  },
  "humandbs": {
    wizardSteps: {
      ja: [
        "DDBJ アカウント作成（未取得の場合）",
        "申請システム (humandbs.ddbj.nig.ac.jp) に DDBJ アカウントでログインし、データ提供申請グループを選択または作成",
        "NBDC 標準ポリシーまたは独自ポリシー（JGAP申請）を選択・申請",
        "DBCLS による審査・承認を待機（数日～数週間）",
        "承認後、JGA Submission ID (JSUB######) と登録用ディレクトリが作成され、メタデータ・データファイルのアップロードへ進む",
      ],
      en: [
        "Create or verify your DDBJ account",
        "Log in to the application system (humandbs.ddbj.nig.ac.jp) with your DDBJ account and select or create a data submitter group",
        "Choose between NBDC standard Policy or apply for custom Policy (JGAP)",
        "Wait for DBCLS review and approval (typically several days to weeks)",
        "After approval, a JGA Submission ID (JSUB######) and an upload directory are created; proceed to uploading metadata and data files",
      ],
    },
    prepare: {
      ja: [
        "DDBJ アカウント（メールアドレス確認可能な状態）",
        "データの研究目的・利用制限対象者の説明（日本語）",
        "NBDC 標準ポリシーで対応可か、独自ポリシー（JGAP）申請が必要かの判断",
      ],
      en: [
        "DDBJ account (verified email address required)",
        "Description of research purpose and restriction scope for data use",
        "Assessment: does NBDC standard Policy apply, or do you need custom Policy (JGAP)?",
      ],
    },
    gotcha: { ja: "ポリシー承認には数日〜数週間かかることがあり、承認されるまで JGA への登録は始められません。", en: "Policy approval can take several days to weeks, and JGA submission cannot begin until it is granted." },
    issuedNote: { ja: "独自のデータ利用ポリシーを使う場合のみ、DBCLS で Policy ID (JGAP######) が発行され、JGA Dataset から参照します (NBDC 標準ポリシーで足りる場合は Policy 作成不要)。論文引用 ID ではありません。", en: "Only when a custom (non-NBDC) data-use policy is required, DBCLS issues a Policy ID (JGAP######) referenced by your JGA Dataset (no policy is created when the NBDC standard policy suffices). It is not a citation ID." },
  },
  "bioproject": {
    wizardSteps: {
      ja: [
        "DDBJ アカウント作成（未取得の場合）",
        "D-way にログインして BioProject メニューを選択し、「New submission」で新規登録を作成",
        "左タブから順にプロジェクト情報を入力：タイトル・説明・登録者・研究費情報等（全て英語）",
        "「OVERVIEW」タブで内容を確認後、「Submit」で登録実行",
        "PRJDB で始まるアクセッション番号を自動取得し、以降の DRA・BioSample 等の登録で引用",
      ],
      en: [
        "Create a DDBJ account if you do not have one already",
        "Log in to D-way, navigate to BioProject, and click [New submission] to create a new registration",
        "Enter project metadata in sequence through the left-side tabs: title, description, submitter information, and funding details (all in English)",
        "Review your entries in the [OVERVIEW] tab and click [Submit] to register the project",
        "Receive a PRJDB accession number automatically, which you will cite in subsequent DRA, BioSample, and other data submissions",
      ],
    },
    prepare: {
      ja: [
        "プロジェクトの英語タイトル（内容を表す短いタイトル。公開プロジェクトのタイトルとして使われる）",
        "プロジェクト説明文（100文字以上の英文。研究対象・目的・期待される成果を第三者が理解できる量）",
        "登録者情報：姓 (Last name)・メールアドレス・所属機関名（任意で名・機関URL）",
      ],
      en: [
        "Project title in English: a very short, descriptive name of the project (used as the public project title)",
        "Project description in English: a paragraph of at least 100 characters explaining the research objectives, target organisms or samples, and expected outcomes in terms understandable to a third party",
        "Submitter information: last name, email address, and institutional affiliation (first name and institution URL optional)",
      ],
    },
    gotcha: { ja: "公開設定は「登録後すぐに公開 (即日公開)」か「Hold (引用するデータが公開されるまで非公開に保つ)」の 2 択で、公開予定日 (hold/embargo 日) は指定できません。", en: "Release is either immediate or held private until the linked data are released (Hold); a hold (embargo) date cannot be set for BioProject." },
    issuedNote: { ja: "登録すると BioProject ID (PRJDB######) が発行されます。論文引用に使います。", en: "Registration issues a BioProject ID (PRJDB######), used for publication citation." },
  },
  "biosample": {
    wizardSteps: {
      ja: [
        "D-wayにログインし、BioSampleメニューから[New submission]を選択してサンプルパッケージ（Microbe/Model organism/Plantなど）を決定",
        "パッケージ別テンプレートをダウンロードし、表計算ソフトで各サンプルの属性値（生物種・採取場所・採取日時など）を記入",
        "属性ファイルをアップロードしバリデーション実施。Error は解消必須 (解消するまで投稿不可)、Warning は必要に応じて修正し再アップロード",
        "[OVERVIEW]タブで内容を確認後、投稿（Submit）実行",
      ],
      en: [
        "Log in to D-way, navigate to BioSample menu, click [New submission], and select a sample package (Microbe, Model organism, Plant, etc.)",
        "Download the package template and fill sample attributes (organism, collection date, location, phenotype, etc.) in a spreadsheet",
        "Upload the attribute file and run validation; all errors must be resolved before submitting (warnings as needed), then resubmit",
        "Review content in the [OVERVIEW] tab and click Submit to finalize",
      ],
    },
    prepare: {
      ja: [
        "DDBJアカウント（未作成なら https://accounts.ddbj.nig.ac.jp で先に作成）",
        "サンプルの基本情報：生物種の学名（NCBI Taxonomyに準拠）、採取場所と採取日時、サンプルの説明",
      ],
      en: [
        "DDBJ account (create at https://accounts.ddbj.nig.ac.jp if needed)",
        "Sample details: scientific name (per NCBI Taxonomy), collection location and date, sample description",
      ],
    },
    gotcha: { ja: "1 回の登録で扱えるサンプルは最大 1,000 件で、すべて同じパッケージに統一する必要があります。", en: "A single submission allows up to 1,000 samples, all of which must use the same package." },
    issuedNote: { ja: "投稿すると BioSample ID (SAMD########) が発行されます。論文引用に使います (作成中の仮 ID SSUB###### は引用しない)。", en: "Submission issues a BioSample ID (SAMD########), used for publication citation (do not cite the temporary SSUB###### ID)." },
  },
  "dra": {
    wizardSteps: {
      ja: [
        "DDBJ アカウント作成・公開鍵登録",
        "D-way で新規登録 (New submission) を作成し、生成された受付ディレクトリにシーケンスファイルをアップロード",
        "BioProject・BioSample を選択または新規登録してメタデータを入力 (Submission・Experiment・Run)",
        "メタデータとファイルを検証・DDBJ スタッフの査定を待機",
        "アクセッション番号 (DRR/DRX/DRZ) が発行されて登録完了",
      ],
      en: [
        "Create a DDBJ account and register your public key",
        "Create a new submission in D-way, then upload sequence files to the generated submission directory",
        "Select or create a new BioProject and BioSample, then enter metadata (Submission, Experiment, Run)",
        "Validate metadata and data files, then await DDBJ staff review",
        "Receive accession numbers (DRR/DRX/DRZ) upon completion",
      ],
    },
    prepare: {
      ja: [
        "シーケンスデータファイル (FASTQ または BAM 形式)、サンプルの生物学的情報 (生物種・採取源・表現型など)",
        "実験メタデータ (シーケンシング機器・ライブラリー種別・insert size など)、MD5 チェックサム値 (アップロード前に計算)",
      ],
      en: [
        "Sequence data files (FASTQ or BAM format), biological sample information (organism, source, phenotype, etc.)",
        "Experiment metadata (sequencing instrument, library type, insert size, etc.), MD5 checksum values (calculated before upload)",
      ],
    },
    gotcha: { ja: "DRA は制限公開に対応しません。ヒトの制限公開データは JGA へ、非ヒトは公開予定日 (embargo) で非公開期間を設定します。", en: "DRA does not support restricted access: send restricted human data to JGA, or set an embargo date for non-human data." },
    issuedNote: { ja: "登録すると DRA アクセッション番号 (DRR = Run、DRX = Experiment、DRZ = Analysis) が発行されます。論文引用に使います。", en: "Registration issues DRA accession numbers (DRR = Run, DRX = Experiment, DRZ = Analysis), used for publication citation." },
  },
  "jga": {
    wizardSteps: {
      ja: [
        "DDBJ アカウント作成 (未取得時)、公開鍵・秘密鍵ペアの生成と登録",
        "DBCLS にデータ提供を申請 (申請システムで提供申請グループを作成し DDBJ アカウントで申請)。承認されると JGA Submission ID とアップロード用ディレクトリが作成される (独自ポリシーが要る場合は別途 DBCLS に登録)",
        "DBCLS 承認後、SFTP で登録用ディレクトリにメタデータ Excel・データファイルをアップロード",
        "DDBJ キュレータがメタデータ・データを査定し、完成 Excel から XML を生成して JGA に登録。検証通過後にアクセッション番号 (JGAS/JGAN/JGAX 等) 発行",
      ],
      en: [
        "Create DDBJ account (if needed), generate and register public/private key pair for data transfer",
        "Apply to DBCLS for data provision (create a data-submitter group and apply with your DDBJ account); approval creates a JGA Submission ID and upload directory (register a custom policy with DBCLS if the NBDC standard policy does not apply)",
        "After DBCLS approval, upload metadata Excel and data files to submission directory via SFTP (port 443)",
        "DDBJ curators review the metadata and data, generate XML from the completed Excel, register it to JGA, and issue accession numbers (JGAS/JGAN/JGAX, etc.) after validation",
      ],
    },
    prepare: {
      ja: [
        "DBCLS での Policy 承認: NBDC 標準ポリシーで対応できるか、独自ポリシー登録が必要か判定。承認待ちは数日〜数週間を要する",
        "メタデータの基本項目: 論文タイトル・著者・要旨 (Study)、サンプル情報と表現型データ (Sample)、実験プロトコール・シークエンサ機器 (Experiment)、ファイルと実験の対応 (Data/Analysis)、Policy 単位でのデータセット管理 (Dataset)",
        "データファイル形式: BAM (unaligned を含む推奨)、fastq (gzip/bzip2 圧縮)、VCF (バリアント)、マイクロアレイデータ、メタボローミクス、プロテオミクス。ファイル名に空白を含めない",
        "メタデータ記入用 Excel テンプレート (ダウンロード): https://github.com/ddbj/submission-excel2xml/raw/main/JGA_metadata.xlsx 、記入例: https://docs.google.com/spreadsheets/d/1HHlxItj89fQv2oWUNBIHZ4VVGwbcC09WGD5tEiXAQZ4/edit",
      ],
      en: [
        "DBCLS Policy approval: Determine whether standard NBDC policy applies or custom policy registration is required. Approval process takes days to weeks",
        "Metadata essentials: paper title, authors, abstract (Study); sample information and phenotypes (Sample); experimental protocol and sequencing platform (Experiment); file-to-experiment relationships (Data/Analysis); policy-based dataset organization (Dataset)",
        "Data file formats: BAM (unaligned reads preferred), fastq (gzip/bzip2 compressed), VCF (variants), microarray data, metabolomics, proteomics. File names must not contain spaces",
        "Metadata Excel template (download): https://github.com/ddbj/submission-excel2xml/raw/main/JGA_metadata.xlsx ; filled example: https://docs.google.com/spreadsheets/d/1HHlxItj89fQv2oWUNBIHZ4VVGwbcC09WGD5tEiXAQZ4/edit",
      ],
    },
    gotcha: { ja: "データのアップロードは Policy 承認後にのみ可能で、承認には数日〜数週間かかることがあります。", en: "You can upload data only after Policy approval, which can take several days to weeks." },
    issuedNote: { ja: "登録すると Study (JGAS######)・Dataset (JGAD######) ほか各種アクセッションが発行されます。引用番号の指定がなければ Study (JGAS) 番号の引用が推奨されます。", en: "Registration issues accessions such as Study (JGAS######) and Dataset (JGAD######); when no specific accession is required, citing the Study (JGAS) number is recommended." },
  },
  "ddbj": {
    wizardSteps: {
      ja: [
        "DDBJ アカウント作成 & 登録ファイル準備：配列 FASTA ファイルとアノテーション TSV ファイルを作成し、UME/Parser/transChecker でチェック実行",
        "BioProject/BioSample ID 取得 & MSS フォーム記入：D-way で事前に BioProject/BioSample ID を取得してから MSS フォームにログインし、メタデータを記入してファイルをアップロード",
        "DDBJ キュレータによる査定・修正対応：キュレータがファイルを査定し、メールで修正依頼や質問が来た場合は対応",
        "アクセッション番号取得 & データ公開：修正完了後、キュレータメールでアクセッション番号を通知。即公開または指定日に自動公開",
      ],
      en: [
        "Create DDBJ account and prepare submission files: Create FASTA sequence and TSV annotation files, then validate with UME, Parser, or transChecker tools",
        "Obtain BioProject/BioSample IDs and apply via MSS form: Register BioProject and BioSample IDs at D-way, then log in to MSS, fill metadata, and upload files",
        "DDBJ curator review and revisions: Curators assess your files and send revision requests or inquiries via email; address feedback as needed",
        "Receive accession numbers and release data: After revisions, curators notify you of accession numbers by email. Data releases immediately or on your specified date",
      ],
    },
    prepare: {
      ja: [
        "配列 FASTA ファイル (エントリ名 32 文字以内、マルチエントリ対応)",
        "アノテーション TSV ファイル (登録者・Reference・Biological feature/Qualifier 記載、DDBJ 指定形式)",
        "BioProject ID と BioSample ID (事前取得必須；アノテーション有の場合は locus_tag prefix も予約必須)",
        "チェックツール実行済み (UME で配列・アノテーション形式確認、CDS あれば transChecker で翻訳確認)",
      ],
      en: [
        "FASTA sequence file (entry names ≤32 characters, multiple entries supported)",
        "TSV annotation file (includes submitter info, reference, biological features/qualifiers in DDBJ format)",
        "BioProject ID and BioSample ID (must obtain in advance; reserve locus_tag prefix if annotated)",
        "File validation completed (UME checks syntax and format; transChecker validates CDS amino acid translation if present)",
      ],
    },
    gotcha: { ja: "登録ファイル (配列・アノテーション) を自分で作成する必要があり、査定で修正のメール往復が複数回に及ぶことがあります。", en: "You build the submission files (sequence and annotation) yourself, and curator review often involves several rounds of email corrections." },
    issuedNote: { ja: "登録すると 配列アクセッション番号 (種別により AP######・BAAA01000000 等と書式が異なる) が発行されます。論文引用に使います (申込時の受付番号とは別物です)。", en: "Registration issues sequence accession numbers whose format varies by data type (e.g., AP######, BAAA01000000), used for publication citation (distinct from the application receipt ID)." },
  },
  "nsss": {
    wizardSteps: {
      ja: [
        "コンタクト情報と公開予定日を入力",
        "登録者情報・論文情報・生物学名を入力",
        "配列ファイルとアノテーションをアップロード・記入",
        "メタデータを確認し、DDBJ の査定を受け、アクセッション番号を取得",
      ],
      en: [
        "Enter contact information and publication hold date",
        "Enter submitter details, reference information, and organism name",
        "Upload sequence file and enter annotation details",
        "Confirm metadata; DDBJ curators review and assign accession numbers",
      ],
    },
    prepare: {
      ja: [
        "塩基配列ファイル (FASTA形式、目安は 1 配列あたり 500 kb 未満)",
        "アノテーション情報 (機能領域・遺伝子情報)",
        "論文情報 (著者・タイトル)",
        "生物学名・サンプル説明",
      ],
      en: [
        "Nucleotide sequence file in FASTA format (guideline: under ~500 kb per sequence)",
        "Annotation details (gene features and functions)",
        "Reference information (authors and title)",
        "Organism name and sample description",
      ],
    },
    gotcha: { ja: "小規模・非完成の配列が対象です。EST/TSA/WGS、ゲノム・染色体・プラスミド等のレプリコン規模配列 (完成・ドラフト問わず)、配列数 100 超などは MSS に回されます。", en: "Intended for small, non-complete sequences; EST/TSA/WGS, replicon-scale sequences such as genomes, chromosomes, or plasmids (whether finished or draft), or more than 100 sequences are routed to MSS instead." },
    issuedNote: { ja: "登録すると 配列アクセッション番号 (AB 型) が発行されます。論文引用に使います。", en: "Registration issues sequence accession numbers (AB-style), used for publication citation." },
  },
  "gea": {
    wizardSteps: {
      ja: [
        "D-way にログイン、GEA 登録ウィザードを開始",
        "データ種別 (Microarray/Sequencing) を選択、IDF/SDRF メタデータを入力",
        "生データ・解析済みデータを ftp-private.ddbj.nig.ac.jp にアップロード",
        "メタデータ検証・キュレータ査定を経てアクセッション番号発行",
      ],
      en: [
        "Log in to D-way and start GEA submission wizard",
        "Select data type (Microarray or Sequencing) and enter IDF/SDRF metadata",
        "Upload raw and processed data files to ftp-private.ddbj.nig.ac.jp",
        "Metadata validation and curator review; accession numbers issued upon completion",
      ],
    },
    prepare: {
      ja: [
        "DDBJ アカウント (D-way ログイン用)",
        "BioProject・BioSample: あらかじめ登録済み (同じウィザード内では作成不可、別途申請が必要)",
        "IDF/SDRF テンプレート: 実験記述書・サンプル-データ関連表を Excel/Google Sheets で記入",
        "データファイル: 生データ (CEL/GPR など Microarray, または fastq/bam を DRA に事前登録), 解析済みデータファイル",
      ],
      en: [
        "DDBJ account for D-way login",
        "BioProject and BioSample: must be pre-registered (separate submission, not created within GEA wizard)",
        "IDF/SDRF templates: Investigation Description Format and Sample and Data Relationship Format completed in Excel or Google Sheets",
        "Data files: raw data files (CEL, GPR, etc. for microarray; fastq/bam pre-registered in DRA for sequencing) and processed data files",
      ],
    },
    gotcha: { ja: "Microarray と Sequencing は別々の submission に分けます。NGS 由来は生リードを先に DRA へ登録します。", en: "Keep Microarray and Sequencing in separate submissions; for NGS data, register the raw reads in DRA first." },
    issuedNote: { ja: "登録すると 発現実験 ID (E-GEAD-n) が発行されます (マイクロアレイではアレイデザイン ID A-GEAD-n も発行)。論文引用に使います。", en: "Registration issues an experiment ID (E-GEAD-n); microarray submissions also receive an array design ID (A-GEAD-n). Used for publication citation." },
  },
  "metabobank": {
    wizardSteps: {
      ja: [
        "DDBJ アカウント取得と公開鍵登録",
        "MetaboBank 登録申し込みフォーム提出（Google フォーム または メール）",
        "BioProject に研究プロジェクト登録、BioSample にサンプル情報登録（各アクセッション PRJDB・SAMD を取得）",
        "実験種別別メタデータエクセル（MAGE-TAB：IDF・SDRF）をダウンロードして記入",
        "生データ・解析済みデータ・代謝物アサインメント（MAF）を準備し sftp でアップロード",
      ],
      en: [
        "Create DDBJ account and register public key",
        "Submit MetaboBank application form (Google Form or email)",
        "Register the research project in BioProject and the sample information in BioSample to obtain accession numbers (PRJDB, SAMD)",
        "Download and fill MAGE-TAB formatted metadata Excel (IDF and SDRF) by experiment type",
        "Prepare raw data, processed data, and Metabolite Assignment File (MAF), then upload via sftp",
      ],
    },
    prepare: {
      ja: [
        "DDBJ アカウントと公開鍵・秘密鍵ペア (ssh-keygen で生成、取得に数営業日)",
        "研究プロジェクトの概要・論文情報 (BioProject 登録用)",
        "サンプル詳細：生物種・サンプル名・採取条件など (BioSample Omics パッケージ)",
        "MAGE-TAB メタデータ (IDF: 実験デザイン・プロトコール・測定パラメータ / SDRF: サンプル・測定機器・ファイルの対応表)",
        "生データ (mzML 等の標準形式または vendor raw、NMR は nmrML) と解析済みデータ",
        "代謝物アサインメント (MAF)：ChEBI ID・化合物名・m/z・信頼度など",
      ],
      en: [
        "DDBJ account and an ssh-keygen public/private key pair (approval takes several business days)",
        "Project overview and publication information (for BioProject)",
        "Sample details: organism name, sample names, collection conditions (for BioSample Omics package)",
        "MAGE-TAB metadata (IDF: experimental design, protocols, measurement parameters; SDRF: sample-to-instrument-to-datafile mapping)",
        "Raw data (standard formats such as mzML or vendor raw; nmrML for NMR) and processed data",
        "Metabolite Assignment File (MAF): ChEBI IDs, metabolite names, m/z, reliability",
      ],
    },
    gotcha: { ja: "登録は申し込みフォームを送ったあと、DDBJ 担当者からのメール返信を待って進みます。", en: "Submission proceeds after you send the application form and receive a reply from DDBJ staff." },
    issuedNote: { ja: "登録すると 研究 ID (MTBKS####) が発行されます。論文引用に使います。", en: "Registration issues a study ID (MTBKS####), used for publication citation." },
  },
  "jpost": {
    wizardSteps: {
      ja: [
        "jPOSTrepo (repository.jpostdb.org) で新規アカウントを作成、または既存アカウントでログイン",
        "新規登録を開始し、プロジェクト情報（タイトル・説明・著者）を入力",
        "測定パラメータ・実験デザイン・プロトコール情報を記入",
        "生データ・解析済みデータファイルを jPOST サーバにアップロード",
        "メタデータ検証実施、jPOST チーム査定後にアクセッション番号発行",
      ],
      en: [
        "Create an account at jPOSTrepo (repository.jpostdb.org) or log in with an existing account",
        "Start a new submission and enter project information (title, description, authors)",
        "Fill in measurement parameters, experimental design, and protocol details",
        "Upload raw and processed data files to the jPOST server",
        "Metadata validation performed; jPOST team review followed by accession issuance",
      ],
    },
    prepare: {
      ja: [
        "jPOSTrepo アカウント (repository.jpostdb.org で登録。ORCID 欄あり)",
        "質量分析装置で取得したプロテオミクス生データ (mzML/mzXML など標準フォーマット)",
        "解析済みデータ・ピークリスト・定量結果テーブル",
        "実験メタデータ: サンプル抽出法・分析方法・機器情報・解析パイプライン",
      ],
      en: [
        "jPOSTrepo account (register at repository.jpostdb.org; an ORCID field is available)",
        "Raw proteomics data from mass spectrometry instruments (standard formats: mzML/mzXML)",
        "Processed data, peak lists, quantification results tables",
        "Experimental metadata: sample preparation, analysis methods, instrument details, analysis pipeline",
      ],
    },
    gotcha: { ja: "jPOST は DDBJ 外のサービスで、登録操作はすべて jPOSTrepo (repository.jpostdb.org) 上で行います。", en: "jPOST is a service outside DDBJ; all submission steps are completed on jPOSTrepo (repository.jpostdb.org)." },
    issuedNote: { ja: "登録を確定すると jPOST 識別子 (JPST######) と ProteomeXchange 番号 (PXD######) が発行されます。論文引用には PXD を使います。", en: "Locking the submission issues a jPOST identifier (JPST######) and a ProteomeXchange accession (PXD######); cite PXD in publications." },
  },
  "eva": {
    wizardSteps: {
      ja: [
        "EMBL-EBI の Webin アカウントを作成",
        "バリアントデータを valid な VCF で準備 (サンプルジェノタイプまたは頻度情報を含む)",
        "INSDC 登録済みリファレンス assembly を確認し、EVA メタデータ Excel テンプレート (project・analyses・samples) を記入",
        "eva-sub-cli で VCF とメタデータを検証・アップロード。EVA が ENA・BioSamples へ代理登録し、検証後にアクセッション番号を通知",
      ],
      en: [
        "Create a Webin account (EMBL-EBI/ENA)",
        "Prepare variant data as a valid VCF (including sample genotypes or allele frequencies)",
        "Confirm an INSDC-registered reference assembly and complete the EVA metadata Excel template (project, analyses, samples)",
        "Validate and upload the VCF and metadata with eva-sub-cli; EVA brokers the data to ENA and BioSamples and emails accession numbers after validation",
      ],
    },
    prepare: {
      ja: [
        "Webin アカウント (EMBL-EBI/ENA。DDBJ アカウントではありません)",
        "INSDC 登録済みのリファレンス assembly (提出時点で登録予定でも可)",
        "バリアント VCF ファイル (v4.1–4.3。サンプルジェノタイプまたは頻度情報を含む)",
        "EVA メタデータ Excel テンプレート (project・analyses・samples を記述)",
      ],
      en: [
        "Webin account (EMBL-EBI/ENA; not a DDBJ account)",
        "An INSDC-registered reference assembly (may be registered by the point of submission)",
        "Variant VCF file (v4.1–4.3; with sample genotypes or allele frequencies)",
        "The EVA metadata Excel template (describing project, analyses, and samples)",
      ],
    },
    gotcha: { ja: "EVA は EBI が運用する DDBJ 外のサービスで、登録手続きは EVA 側で完結させます。", en: "EVA is operated by EBI outside DDBJ; complete the submission process on the EVA site." },
    issuedNote: { ja: "登録すると プロジェクト accession (PRJEB######) と analysis accession (ERZ######) が EBI EVA から発行されます。論文引用には PRJEB を使います。", en: "EBI EVA issues a project accession (PRJEB######) and analysis accessions (ERZ######); cite PRJEB in publications." },
  },
}
