---
title: DRA
description: DDBJ's public archive for next-generation sequencer raw reads and alignments. As the Japanese node of INSDC SRA, it mirrors with NCBI SRA and EBI ENA.
---

## What is DRA

DRA (DDBJ Sequence Read Archive) is the archive operated by DDBJ for preserving and publishing raw reads and alignment information produced by next-generation sequencers.
Its purpose is to ensure research reproducibility and to enable new discoveries through data reanalysis.

DRA is the Japanese member of INSDC SRA and is mirrored with NCBI Sequence Read Archive (SRA) and EBI European Nucleotide Archive (ENA).
Registering at any one of the three INSDC nodes is sufficient to make the data globally discoverable.

> [!NOTE]
> If you are unsure where to register, or if the boundary between DRA, JGA, and GEA is unclear, the [Submit Navigator](/submit) asks about the nature of your data and assembles the appropriate destination together with required prerequisites such as [BioProject](/bioproject) and [BioSample](/biosample).

> [!WARNING]
> DRA is an open archive and does not support access control (restricted release).
> Human data that require access restrictions must be registered to [JGA](/jga) after approval by the NBDC Human Data Review Committee.

## Accepted data

DRA accepts raw reads and their alignment results from the major NGS platforms.
The acceptable file formats differ per platform.

| Platform | Accepted formats | Notes |
| --- | --- | --- |
| Illumina | FASTQ / BAM | Paired-end reads are split into forward / reverse files |
| 454 | FASTQ / BAM | Conversion from SFF is required |
| Ion Torrent | FASTQ | Convert from BAM using samtools |
| PacBio | BAM / FASTQ | One file per Run for `*.subreads.bam` etc. HDF5 (`bas.h5` / `bax.h5`) is no longer loadable |
| Oxford Nanopore | FASTQ / BAM | — |

### FASTQ requirements

- Submit gzip-compressed files (`.fastq.gz`).
- Phred quality ASCII offset defaults to 33 (`!`). When using offset 64 (`@`), declare it via the `ascii_offset` attribute in the Run XML.
- The first line of each read must start with `@`, and the base-call line and quality line must be separated by a line starting with `+`.
- For paired-end data, split forward and reverse into separate files and associate them within a single Run.

### BAM requirements

- Submit BAM **uncompressed** (BAM already applies gzip-equivalent internal compression; do not double-compress).
- The BAM must be readable by SAMtools and Picard.
- For paired-end data, include both reads in a single BAM with correct FLAG values.
- For aligned BAM, additionally provide a mapping table linking the header `SN` values to INSDC / RefSeq accessions (or to multi-FASTA sequence names).

### File naming and Analysis

- Only `A-Z`, `a-z`, `0-9`, `_`, `-`, and `.` are allowed. Whitespace, brackets and other symbols are disallowed, and archives containing a directory structure are not accepted.
- Derived data with no other obvious home (de novo assembly, sequence annotation, abundance measurements, etc.) can be registered as optional **Analysis** objects. Note that Analysis is not exchanged with NCBI / EBI.

## Accession numbers

A DRA submission consists of several objects, each receiving its own accession number.

| Object | Prefix | Role |
| --- | --- | --- |
| Submission | `DRA` | Administrative unit grouping the entire submission |
| Experiment | `DRX` | Library + instrument metadata. References one BioProject and one BioSample |
| Run | `DRR` | The actual data files attached to an Experiment. Read IDs are rewritten to `DRR<accession>.<serial>` |
| Analysis | `DRZ` | Optional. Derived or processed data |
| BioProject (referenced) | `PRJDB######` | Obtained beforehand from [BioProject](/bioproject) |
| BioSample (referenced) | `SAMD########` | Obtained beforehand from [BioSample](/biosample) |

Accession numbers are issued after metadata and file validation pass and DRA staff complete their review.

## Submission flow

1. **Get a D-way account** — Create a DDBJ account through the D-way portal.
2. **Register a public key** — Attach your SSH public key for authentication. Without it, SFTP uploads fail.
3. **Register BioProject / BioSample first** — DRA Experiments reference these, so secure your `PRJDB######` and `SAMD########` in advance.
4. **Create a submission in D-way** — A per-submission directory (e.g. `~/test07-0040/`) is created on `ftp-private.ddbj.nig.ac.jp`.
5. **Upload data via SFTP** — Place files **directly under** the submission directory using SFTP on port 22. Subdirectories are not allowed.
6. **Enter metadata** — Use the web tool (`Enter/Update metadata`) or fill the Excel template and convert it to XML.
7. **Validate** — Run `Validate uploaded data files` to check MD5, format, and integrity. Reaching `Submission Validated` means it is ready for review.
8. **Review by DRA staff** — Once approved, accession numbers (`DRX` / `DRR` / `DRZ`) are issued.
9. **Release** — On the configured release date, the data are placed on the DDBJ public FTP, indexed by DDBJ Search, and propagated to INSDC partners.

```text
Create D-way submission
        │
        ▼
   SFTP upload (ftp-private.ddbj.nig.ac.jp)
        │
        ▼
   Enter metadata (web tool or Excel -> XML)
        │
        ▼
   Validate uploaded data files
        │
        ▼
   Review by DRA staff -> accession assignment
        │
        ▼
   Release on scheduled date -> mirror to NCBI SRA / EBI ENA
```

> [!IMPORTANT]
> Per-submission limits are 1,000 BioSamples and 2,000 DRA Runs.
> If you exceed them, split the submission while keeping a shared BioProject.

## Prerequisites

Have all of the following ready before starting registration.

- A DDBJ account on D-way.
- An SSH public key registered on that account.
- A [BioProject](/bioproject) (`PRJDB######`) already obtained.
- At least one [BioSample](/biosample) (`SAMD########`).
- Prepared read files (gzip-compressed FASTQ or uncompressed BAM; no directory structure; names following the rules).
- An MD5 checksum for each file (entered in the Run metadata).
- A contact email address for release and inquiry notifications.

> [!CAUTION]
> Remove information that can directly identify research subjects from the metadata before submission.
> Even for non-human samples, take care that identifiers are not inadvertently included.

## Release and embargo

A release policy is set per submission at registration time.

- **Immediate Release** — Release promptly once review completes.
- **Hold Until (release date)** — Withhold release until the specified date. The maximum is 4 years from registration, and extensions are possible.

> [!IMPORTANT]
> All data within a single submission are released **at the same time**. Per-Run staggered release is not supported.
> In addition, [BioProject](/bioproject) / [BioSample](/biosample) / DRA / [GEA](/gea) records are released together ("linked release") aligned to the latest Hold Until among the referenced objects.

A submission whose inquiries go unanswered for more than three months during the embargo period is treated as cancelled.

## Sharing with INSDC

Released DRA records propagate worldwide through the following routes.

- They are placed on DDBJ's public FTP and ingested by DDBJ Search (within a few days).
- They are automatically mirrored to NCBI SRA and EBI ENA, where the `DRX` / `DRR` accessions remain searchable as-is.
- For the submitter, the release-ready `.sra` / `.fastq.bz2` files are copied to the upload server (`ftp-private.ddbj.nig.ac.jp`) under `/report/dra/<DRA submission accession>/sra/` and `/report/dra/<DRA submission accession>/fastq/`. These copies are removed after about one month.

> [!NOTE]
> INSDC covers open archives only and has no framework for restricted release.
> Data requiring access control must instead be registered to [JGA](/jga) (which requires the [humandbs](/humandbs) review process).

## Choosing between services

| Data characteristics | Destination |
| --- | --- |
| Raw NGS reads from non-human samples, or human-derived raw reads that can be released openly | **DRA** |
| Human-derived NGS reads requiring access control | [JGA](/jga) (after NBDC approval via the [humandbs](/humandbs) flow) |
| Processed expression data such as RNA-seq count matrices | [GEA](/gea) (raw reads must be pre-registered to DRA) |
| Assembled or annotated sequences | [DDBJ](/ddbj) (MSS / WGS / TLS / TSA) |
| Metabolome data | [MetaboBank](/metabobank) |

## Related resources

- [DRA official page (Japanese)](https://www.ddbj.nig.ac.jp/dra/index.html)
- [DRA official page (English)](https://www.ddbj.nig.ac.jp/dra/index-e.html)
- [DRA submission guide (English)](https://www.ddbj.nig.ac.jp/dra/submission-e.html)
- [DRA metadata reference](https://www.ddbj.nig.ac.jp/dra/metadata-e.html)
- [DRA data file specification (English)](https://www.ddbj.nig.ac.jp/dra/datafile-e.html)
- [DDBJ upload guide](https://www.ddbj.nig.ac.jp/upload-e.html)
- [FAQ on DRA file processing](https://www.ddbj.nig.ac.jp/faq/en/data-files-sra-e.html)
- [INSDC data release policy](https://www.ddbj.nig.ac.jp/insdc/data-release-policy.html)
- [D-way portal](https://ddbj.nig.ac.jp/D-way/)
- [NBDC Human Database (JGA gateway)](https://humandbs.dbcls.jp/data-submission)
