---
title: GEA
description: GEA is the DDBJ Center public archive for functional genomics data, accepting microarray and sequencing experiments in MAGE-TAB format with E-GEAD-n accessions.
---

## What is GEA

GEA (Genomic Expression Archive) is the DDBJ Center public archive for functional genomics data. It accepts experimental data derived from microarray and sequencing platforms, covering gene expression, epigenetics, and SNP array genotyping.

GEA follows the [MIAME](http://fged.org/projects/miame/) (microarray) and [MINSEQE](http://fged.org/projects/minseqe/) (sequencing) guidelines, and metadata are described in the [MAGE-TAB](https://www.ebi.ac.uk/arrayexpress/help/magetab_spec.html) format. GEA plays the same role at DDBJ that NCBI GEO and EBI ArrayExpress (now part of BioStudies) play at their organisations, but data are not mirrored between them and each archive uses its own accession namespace.

> [!NOTE]
> If you are unsure which DDBJ service to submit your data to, the [Submit Navigator](/submit) walks you through the decision interactively.

## Accepted data

GEA covers the following functional genomics experiments.

| Experiment type | Examples | Route |
| --- | --- | --- |
| Microarray | Gene expression array, methylation array, SNP genotyping array | Microarray |
| High-throughput sequencing | RNA-seq, ChIP-seq, ATAC-seq and other expression / epigenetics assays | Sequencing |
| Single-cell | scRNA-seq and other single-cell assays | Sequencing |
| Spatial transcriptome (sequence-based) | 10x Genomics Visium | Sequencing |
| Spatial transcriptome (image-based) | 10x Genomics Xenium, MERFISH | Microarray |
| Analysis using a transcriptome reference | Reference-based expression quantification | Sequencing |

The required files differ depending on the route.

- **Microarray**: Upload both raw data and processed data to GEA.
- **Sequencing**: Processed (analyzed) data are required at GEA. Raw reads are submitted to [DRA](/dra), and the GEA submission references the DRA submission.

> [!WARNING]
> BAM / SAM / BED files alone cannot be registered as processed data. Quantitative data such as an expression matrix are required. If you only have those files, please contact GEA in advance.

> [!IMPORTANT]
> A single submission cannot mix microarray and sequencing data. If you need to register both, split them into separate submissions. The maximum number of SDRF assays per submission is 1,000.

## Microarray and Sequencing

GEA has two submission routes, which differ in the prerequisites and in where raw data are stored.

| Aspect | Microarray | Sequencing |
| --- | --- | --- |
| Raw data location | GEA | [DRA](/dra) |
| Processed data | Required at GEA | Required at GEA |
| Prerequisite submissions to reference | [BioProject](/bioproject) + [BioSample](/biosample) | [DRA](/dra) submission + [BioProject](/bioproject) (BioSample is referenced via DRA) |
| SDRF template source | BioSample | DRA submission |
| Array Design | `A-XXXX-n` (existing) or upload an ADF to issue a new one | Not required |
| Spatial transcriptome | Xenium, MERFISH, etc. | Visium, etc. |

## Accession numbers

GEA issues three types of accessions, all assigned upon completion of curation. The accession cited in publications is the Experiment accession (E-GEAD-n).

| Type | Prefix | Example | Meaning |
| --- | --- | --- | --- |
| Experiment | `E-GEAD-` | `E-GEAD-100` | The whole submission. Recorded in IDF `Comment[GEAAccession]` |
| Array design | `A-GEAD-` | `A-GEAD-10` | New array designs issued by GEA. Existing ArrayExpress accessions such as `A-AFFY-2` can also be referenced from IDF / SDRF |
| Protocol | `P-GEAD-` | `P-GEAD-100` | Each protocol defined in the IDF. Before assignment a temporary ID such as `ESUB000500_Protocol_1` is used, and it is replaced once the accession is issued |

A reviewer token can optionally be issued so peer reviewers can access the submission before publication.

## Submission flow

1. **Sign in with your D-way account** and create a new submission from the GEA submission page. An FTP upload directory is allocated for you.
2. **Reference the prerequisite submissions**. For microarray, select a BioProject and a BioSample; for sequencing, select one DRA submission and a BioProject.
3. **Fill in the IDF tab** with experiment-wide metadata (title / description / experiment type / design / protocol / publication / array design ref, etc.).
4. **Fill in the SDRF tab** by completing the template auto-generated from the BioSample (or DRA submission) and array design, adding Material Type / Label / Factor Value / Array Data File entries with md5 values.
5. **Upload data files via FTP** (raw / processed).
6. **Undergo curation** and respond to any revision requests. Once complete, E-GEAD-n / A-GEAD-n / P-GEAD-n are issued.

> [!TIP]
> Step-by-step wizard instructions are provided by the step cards in the [Submit Navigator](/submit). This page only describes the high-level routes.

## Prerequisites (MAGE-TAB)

GEA metadata are centered on the MAGE-TAB format. At minimum prepare an IDF and an SDRF, and add an ADF when registering a new array.

| File | Role | Notes |
| --- | --- | --- |
| IDF (Investigation Description Format) | Describes the experiment as a whole (title, description, design, protocol, publication, etc.) | One file |
| SDRF (Sample and Data Relationship Format) | Maps samples to data files | Factor Value columns must be placed rightmost |
| ADF (Array Design Format) | Defines a new array design | Not needed when reusing an existing array |

In addition, prepare the following beforehand.

- **D-way account**: required to sign in to the GEA submission UI
- **[BioProject](/bioproject)**: one BioProject is referenced by both the microarray and the sequencing route
- **[BioSample](/biosample)**: selected directly in the microarray route as the source for SDRF auto-generation (in the sequencing route it is referenced via the DRA submission)
- **[DRA](/dra) submission**: pre-register raw reads in the sequencing route
- **Array Design**: in the microarray route, reference an existing `A-XXXX-n`, or upload an ADF for a new design
- **Data files**: raw / processed files for each assay, with md5 values

> [!IMPORTANT]
> Spreadsheet-shaped files (IDF / SDRF / expression matrices, etc.) must be saved as tab-delimited `.txt`. `.xls` / `.xlsx` are not accepted. File names may only contain alphanumerics, `_`, `-`, and `.`; spaces and parentheses are not allowed.

> [!NOTE]
> For two-color arrays, two samples must be linked to a single raw data file. Use the Label column in SDRF to distinguish Cy3 / Cy5.

## Spatial transcriptome

The submission route for spatial transcriptome data depends on the platform.

| Platform | Submission Type | Array Design | Notes |
| --- | --- | --- | --- |
| 10x Genomics Visium | Sequencing | Not required | Raw read fastq/bam goes to DRA. Images (`tissue_hires_image.png` etc.), scale factors (`scalefactors_json.json`), spot positions (`tissue_positions_list.csv`), and the expression matrix are bundled as a tar archive and submitted as GEA processed data |
| 10x Genomics Xenium | Microarray | [`A-GEAD-246`](https://ddbj.nig.ac.jp/public/ddbj_database/gea/array/A-GEAD-000/A-GEAD-246/) | Raw files such as `morphology.ome.tif` and processed files such as `cell_feature_matrix.h5` are bundled as tar archives |
| MERFISH / MERSCOPE | Microarray | [`A-GEAD-247`](https://ddbj.nig.ac.jp/public/ddbj_database/gea/array/A-GEAD-000/A-GEAD-247/) | A dummy raw data file is submitted alongside processed data listing the identified transcripts |

> [!WARNING]
> Raw MERFISH images and `.vzg` files are not accepted by GEA. Deposit them in a generalist archive (Figshare, Zenodo, etc.). Only quantified expression data are stored in GEA.

## Two-step submission with DRA

The sequencing route does not complete within GEA alone; it is a two-step submission with [DRA](/dra).

```text
[raw read fastq/BAM]
      |
      v
   DRA submission        <-- registered first
      |
      v
   GEA submission        <-- references the DRA submission
      |
      v
[processed data: expression matrix, etc.]
```

When creating a GEA submission, select one DRA submission registered under your own account. The SDRF template is auto-generated from the experiment / run information of that DRA submission. Submitting sample-level processed data to GEA is strongly recommended.

> [!IMPORTANT]
> GEA itself is not an INSDC member archive, but the sequencing route sits on top of the INSDC layer (DRA / BioProject / BioSample). Sequencing experiments that include raw reads always require prior submission to DRA.

## Related resources

- GEA top: <https://www.ddbj.nig.ac.jp/gea/index-e.html>
- Submission overview: <https://www.ddbj.nig.ac.jp/gea/overview-e.html>
- Metadata specification: <https://www.ddbj.nig.ac.jp/gea/metadata-e.html>
- MAGE-TAB example: <https://www.ddbj.nig.ac.jp/gea/example-e.html>
- Microarray submission: <https://www.ddbj.nig.ac.jp/gea/submit-array.html>
- Sequencing submission: <https://www.ddbj.nig.ac.jp/gea/submit-sequence-e.html>
- Data file specifications: <https://www.ddbj.nig.ac.jp/gea/datafile.html>
- Spatial gene expression: <https://www.ddbj.nig.ac.jp/gea/spatial-gene-expression.html>
- NAR 2019 paper "DDBJ update: the Genomic Expression Archive (GEA) for functional genomics data": <https://academic.oup.com/nar/article/47/D1/D69/5144146>
- Related services: [DRA](/dra) / [BioProject](/bioproject) / [BioSample](/biosample)
