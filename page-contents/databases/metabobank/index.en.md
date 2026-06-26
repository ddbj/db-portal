---
title: MetaboBank
description: DDBJ's public metabolomics repository, accepting metabolome data from MS, NMR, and mass spectrometry imaging with metabolite assignments in MAGE-TAB format.
---

## About MetaboBank

MetaboBank is a public metabolomics data repository operated by DDBJ. It accepts metabolome data acquired by mass spectrometry (MS), NMR, and mass spectrometry imaging (MSI), together with metabolite assignments.

Metadata uses the MAGE-TAB format, the same family as [GEA](/databases/gea), and is compatible with the ISA-TAB format used by MetaboLights at EBI. MetaboBank and MetaboLights cooperate in data standardization.

> [!NOTE]
> For an overview of service selection and submission steps, see the [Submit Navigator](/submit). MetaboBank submissions proceed as individually-handled cases coordinated through an application form.

## Accepted data

The supported measurement modalities and file types are as follows.

| Category | Contents |
| --- | --- |
| MS | LC-MS / LC-DAD-MS / GC-MS / GCxGC-MS / GC-FID-MS / CE-MS / DI-MS / FIA-MS / MALDI-MS |
| MSI | Mass spectrometry imaging (image data and instrument information) |
| NMR | NMR measurement data (bundling the instrument configuration file is recommended) |

Files fall into one of three types.

| Type | Contents |
| --- | --- |
| Raw data | Native output from the instrument. For MS, open formats such as mzML are accepted as raw; for NMR, formats such as nmrML are accepted as raw |
| Processed data | Analysed data and summaries, referenced from columns in the SDRF |
| MAF (Metabolite Assignment File) | Standard TSV table of identified or putative compounds. Separate templates are provided for MS and NMR. Strongly recommended |

File names may use only alphanumerics, `_`, `-`, and `.`, and must be unique within a Study. Files can be bundled per Study and uploaded as tar or zip archives. On release, raw data are also provided in Reifycs' mzB format and can be browsed with the dedicated viewer DataChaker.

> [!WARNING]
> Before uploading, remove any information embedded in raw data files that could lead back to individuals, such as local file paths. For human-derived samples, direct identifiers must also be removed from the metadata.

## Accession numbers

The following accession numbers are issued for a MetaboBank Study and its associated [BioProject](/databases/bioproject) / [BioSample](/databases/biosample) records.

| Target | Format | Example |
| --- | --- | --- |
| MetaboBank Study | `MTBKS####` | MTBKS1234 |
| BioProject | `PRJDB######` | PRJDB123456 |
| BioSample (Omics package) | `SAMD########` | SAMD00012345 |

Data are typically cited as a set of `MTBKS####` + `PRJDB######` + `SAMD########`.

## Submission flow

1. Obtain a DDBJ account and register your public key (for scp / sftp).
2. Apply for submission via the **MetaboBank registration application form**.
3. Register a [BioProject](/databases/bioproject) to obtain a `PRJDB######`.
4. Register each sample via the [BioSample](/databases/biosample) Omics package to obtain `SAMD#####` accessions.
5. Fill in **IDF + SDRF** in the MAGE-TAB Excel template that matches your measurement type, and prepare a **MAF** if applicable.
6. Compute MD5 checksums and prepare a file list for the raw data, processed data, and MAF.
7. Upload files to the file server via scp / sftp (tar / zip archives per Study are recommended).
8. The MetaboBank team reviews the contents and issues an `MTBKS#`.
9. Decide the release setting (immediate release, or hold until publication).

> [!IMPORTANT]
> Unlike the self-service web forms used by DRA or GEA, MetaboBank uses an individually-handled workflow that starts from an application form and is coordinated with the MetaboBank team.

## Prerequisites (MAGE-TAB and MAF)

Prepare the following before applying:

- A DDBJ account, with a public key registered for scp / sftp.
- A [BioProject](/databases/bioproject) (PRJDB) and [BioSample](/databases/biosample) Omics package (SAMD) records.
- The **MAGE-TAB Excel template** (IDF + SDRF) for your measurement type.
- A **MAF template** (MS or NMR) if applicable.
- File list and MD5 checksums.

### MAGE-TAB (IDF + SDRF)

- **IDF (Investigation Description Format)**: Captures the Study overview, experimental design, protocols, and publication information.
- **SDRF (Sample and Data Relationship Format)**: Describes the relationships between samples, assays, and data files as a natural workflow.

Dedicated templates are provided per measurement type (LC-MS / LC-DAD-MS / GC-MS / GCxGC-MS / GC-FID-MS / CE-MS / DI-MS / FIA-MS / MALDI-MS / MSI / NMR).

### MAF (Metabolite Assignment File)

A standard TSV table describing identified or putative compounds. Separate Excel templates are provided for MS and NMR. Representative fields include:

| Field | Contents |
| --- | --- |
| ChEBI ID | Compound identifier |
| Formula / SMILES / InChI | Structural information |
| Retention time / chemical shift | MS / NMR measurement parameters |
| MSI confidence score | Assignment confidence for MSI |
| `maf_value_unit` | Unit such as peak area or concentration |

## MSI (mass spectrometry imaging)

A dedicated metadata template is provided for MSI, capturing image data together with instrument information and acquisition conditions. Assignments are described in the MAF using MSI-specific confidence scores.

## Relationship with MetaboLights

MetaboBank's MAGE-TAB format is compatible with the ISA-TAB format used by MetaboLights at EBI. The two repositories cooperate in data standardization, and the metadata format belongs to the same MAGE-TAB family as [GEA](/databases/gea) (ArrayExpress lineage) and SDRF-Proteomics.

> [!NOTE]
> According to the official documentation, public MetaboBank data are not currently exchanged with EBI MetaboLights.

## Release policy

- Immediate release, or hold (embargo) until publication, can be selected.
- The release date can be set up to three years ahead, and may be extended.
- Release follows the [DDBJ data release policy](https://www.ddbj.nig.ac.jp/documents/data-release-policy-e.html), and aligns with the release timing of the linked [BioProject](/databases/bioproject) / [BioSample](/databases/biosample) records.
- Reviewer access for peer review is arranged with the MetaboBank team and provided via a password-protected site.
- Post-submission updates are requested through a dedicated form to the MetaboBank team.

## Search UI

Released Studies can be browsed and searched from the MetaboBank search UI at <https://mb2.ddbj.nig.ac.jp/>. Raw data provided in Reifycs' mzB format are viewed with the dedicated viewer DataChaker.

## Related resources

- MetaboBank top (Japanese): <https://www.ddbj.nig.ac.jp/metabobank/index.html>
- MetaboBank top (English): <https://www.ddbj.nig.ac.jp/metabobank/index-e.html>
- Submission guide: <https://www.ddbj.nig.ac.jp/metabobank/submission.html>
- Data file specification: <https://www.ddbj.nig.ac.jp/metabobank/datafile.html>
- Metadata specification (IDF / SDRF / MAF): <https://www.ddbj.nig.ac.jp/metabobank/metadata.html>
- Search UI: <https://mb2.ddbj.nig.ac.jp/>
- DDBJ FAQ (linked release): <https://www.ddbj.nig.ac.jp/faq/en/bp-bs-seq-release-e.html>
- DDBJ FAQ (reviewer access): <https://www.ddbj.nig.ac.jp/faq/en/reviewer-access-e.html>
- Related services: [BioProject](/databases/bioproject) / [BioSample](/databases/biosample) / [GEA](/databases/gea) / [DRA](/databases/dra)
