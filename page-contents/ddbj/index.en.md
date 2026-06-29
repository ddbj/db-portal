---
title: DDBJ
description: DDBJ is the INSDC annotated nucleotide sequence database. Submit via the NSSS web wizard or the MSS bulk file upload; entries are exchanged across INSDC daily.
---

## What is DDBJ

DDBJ is the annotated nucleotide sequence database that forms part of INSDC (DDBJ / NCBI GenBank / EBI ENA). Registered entries are converted to flat-file format and exchanged daily among the three INSDC members.

Two submission windows feed into the same database:

| Window | Purpose |
| --- | --- |
| [NSSS](#nsss) (DDBJ Nucleotide Sequence Submission System) | Web wizard for small / standard entries |
| [MSS](#mss) (Mass Submission System) | File-based upload (FASTA + annotation TSV) for large-scale, full-replicon, or BioProject/BioSample-linked data |

Raw sequencer reads do not belong here; submit them to [DRA](/dra) instead.

> [!NOTE]
> If you are unsure which window to use, the [Submit Navigator](/submit) walks you through your data type and recommends NSSS or MSS.

## Data accepted

Submissions are sorted by INSDC **division** (HUM / PRI / ROD / MAM / VRT / INV / PLN / BCT / VRL / PHG / ENV / SYN) and **data category**. The MSS application form offers the following data types:

| Data type | Description |
| --- | --- |
| WGS | Whole Genome Shotgun (draft genome) |
| GNM | Finished level genome sequence, non-WGS |
| MAG | Metagenome-Assembled Genome |
| SAG | Single Amplified Genome |
| TLS | Targeted Locus Study (16S rRNA and other targeted loci, bulk) |
| HTG | High Throughput Genomic Sequences |
| TSA | Transcriptome Shotgun Assembly |
| HTC | High Throughput cDNA Sequences |
| EST | Expressed Sequence Tags |
| GSS | Genome Survey Sequences |
| TPA | Third Party Data |
| MISC | Anything else (standalone organelle / plasmid / virus / phage genome, etc.) |

NSSS only handles "standard entries" (cDNA, genome fragments, single 16S rRNA, vector sequences, etc.) below replicon scale.

## MSS

Mass Submission System (MSS) accepts comparatively large-scale nucleotide data via file upload. Use MSS whenever NSSS cannot cover the case:

- **Special data categories**: EST / TSA / HTC / GSS / HTG / WGS / TLS / TPA
- **Scale**: any of a single sequence >= 500 kb, >= 30 Features in a single sequence, or more than 100 sequences in total
- **Full-length replicons** (finished or draft): genomes, chromosomes, organelle genomes, virus / phage genomes / segments, plasmids
- **BioProject / BioSample linkage required**: metagenomes (MAG / SAG), environmental profiles, sequences derived from the same strain as a planned or registered full-replicon genome, prokaryotic 16S rRNA reports, etc.

The application form lives at <https://mss.ddbj.nig.ac.jp/>. Upload via the browser, via SFTP, or by specifying a [DFAST](https://dfast.ddbj.nig.ac.jp/) job ID. Use SCP / SFTP when the total upload exceeds 10 GB.

### MSS file formats

- **Sequence file**: FASTA-like text. Header lines start with `>`, followed by the nucleotide sequence; entries are delimited by `//`. Entry names must be unique ASCII alphanumerics within 32 characters, and must not contain space, `"`, `=`, `|`, `>`, `[]`, or `\`. Strip trailing `n` characters. Allowed extensions: `.fasta` / `.seq.fa` / `.fa` / `.fna` / `.seq`.
- **Annotation file**: tab-separated, 5 columns (Entry / Feature / Location / Qualifier / Value). Allowed extensions: `.ann` / `.annt.tsv` / `.ann.txt`. Provide the COMMON section (SUBMITTER / REFERENCE / DATE / DBLINK, etc.) together with each entry's Biological Features (source / CDS / rRNA / tRNA / ncRNA, etc.). Do not prefix qualifiers with `/`.
- **AGP file**: CON entries only. **New CON submissions are no longer accepted.**

> [!WARNING]
> File names must not contain multibyte characters, spaces, backticks, `<>`, or `()`. Email attachments are discouraged; always upload through the MSS form.

## NSSS

NSSS (DDBJ Nucleotide Sequence Submission System) is the browser-based system for annotated nucleotide sequence registration. It is the recommended window for small / standard entries that fall outside MSS, and the recommended starting point for first-time submitters.

- Entry page: <https://www.ddbj.nig.ac.jp/ddbj/web-submission.html>
- Start a new submission: <https://ddbj.nig.ac.jp/submission>
- Help: <https://www.ddbj.nig.ac.jp/ddbj/web-submission-help.html>
- Supported browsers: Google Chrome / Microsoft Edge / Mozilla Firefox

NSSS handles new submissions only; corrections to released accessions go through the [DDBJ update request form](https://forms.gle/mcQaJshvAKRdggz16). TPA-Exp and TPA-Inf have been retired from NSSS since January 2025, and TPA:assembly is handled exclusively by MSS.

Bookmark the page after clicking Next on each step; the bookmark resumes the submission later.

## When to use MSS vs NSSS

NSSS and MSS are two routes into INSDC and produce the same INSDC flat files in the end.

| Axis | Prefer NSSS | Prefer MSS |
| --- | --- | --- |
| Category | Standard entries (cDNA, genome fragments, a single 16S rRNA, vector sequences, etc.) | EST / TSA / HTC / GSS / HTG / WGS / TLS / TPA |
| Scale | < 500 kb per sequence, < 30 Features, < 100 sequences total | A sequence >= 500 kb, >= 30 Features, or more than 100 sequences total |
| Completeness | Single or partial sequences | Replicon-scale (complete genomes, chromosomes, organelles, plasmids, virus / phage genomes or segments) |
| Linkage | BioProject / BioSample linkage optional | BioProject / BioSample linkage required (metagenomes, TPA, same-strain cross-references, prokaryotic 16S rRNA reports, etc.) |

When in doubt, default to NSSS and only switch to MSS when one of the conditions above applies.

## Submission flow

### MSS

1. **Create a DDBJ account / sign in via D-way.**
2. Obtain a **BioProject ID**, **BioSample ID**, and **locus_tag prefix** in advance where applicable.
3. Prepare the **FASTA and annotation TSV** files (for prokaryotic genomes, [DFAST](https://dfast.ddbj.nig.ac.jp/) can generate them automatically).
4. Validate the format and CDS translations locally with **UME / Parser / transChecker**.
5. Sign in to the [MSS form](https://mss.ddbj.nig.ac.jp/) and upload the files; a **Mass-ID** (for example `[DDBJ:NSUB000001]`) is issued and notified by email.
6. A DDBJ curator reviews the submission against INSDC rules and contacts you by email for revisions or confirmation.
7. Once finalised, the **accession numbers** are sent to the contact person by email.
8. The entries are released on the **scheduled release date** (immediately or after a hold) and distributed across INSDC.

### NSSS

1. **Create a DDBJ account / sign in via D-way.**
2. Remove vector / adapter contamination, for example with [VecScreen](http://ddbj.nig.ac.jp/vecscreen/).
3. Start from <https://ddbj.nig.ac.jp/submission> by clicking **Create new submission**.
4. Fill in submitter, REFERENCE, sequence, and Feature / Qualifier details in the web form (the Submission ID lets you pause and resume).
5. A curator reviews the submission, emails the accession numbers, and releases the entries on the scheduled date.

## Prerequisites

- A **DDBJ account** (D-way). SCP / SFTP transfer additionally requires a registered public key.
- **Contact person information** (name, affiliation, address, phone). Multiple contacts (at minimum the operator and a supervisor) are strongly recommended so future correspondence does not stall.
- For genome-scale, metagenome, TPA, and other linkage-required cases, obtain a [BioProject ID](/bioproject) and [BioSample ID](/biosample) beforehand.
- If the annotation uses `locus_tag`, reserve a **locus_tag prefix** when registering the BioSample (prefixes cannot be changed after issuance).
- Decide the **scheduled release date** (immediate release or hold).
- MSS-only local validation tools:
  - **UME** (format + CDS translation; Windows / Linux / macOS)
  - **Parser** (format; Linux)
  - **transChecker** (CDS translation; Linux)

> [!IMPORTANT]
> A single MSS Submission may only bundle data sharing the same contact person, data category, and scheduled release date. Split data that differ on any of these into separate Submissions.

## Accession numbers

| Category | Format | Example |
| --- | --- | --- |
| Single entry (legacy) | 1 letter + 5 digits | `A12345` |
| Single entry (conventional) | 2 letters + 6 digits | `AB123456` |
| Single entry (extended) | 2 letters + 8 digits | `AB12345678` |
| WGS / TSA / TLS | 4 letters + 8-10 digits | `BAAA01000000` (master) / `BAAA01000001`- (contigs) |
| WGS / TSA / TLS (new format) | 6 letters + 9-11 digits | `ABCDEF010123456` |
| MGA | 5 letters + 7+ digits | `ABCDE1234567` |
| protein_id | 3 letters + 5 or 7 digits | `ABC12345` / `ABC1234567` |
| BioProject | `PRJDB` + digits | `PRJDB12345` |
| BioSample | `SAMD` + 8 digits | `SAMD00000001` |

During submission the working identifier is the **Mass-ID** (for example `[DDBJ:NSUB000001]`) for MSS or the **Submission ID** for NSSS. Final accession numbers are emailed to the contact person once curation completes.

## Metagenome (MAG / SAG)

Metagenome-derived data are registered as genome entries in the [ENV division](https://www.ddbj.nig.ac.jp/ddbj/env.html). BioProject and BioSample must be registered in advance, the INSDC-prescribed qualifiers must be present, and the submission window is MSS.

### MAG (Metagenome-Assembled Genome)

- Use the BioSample **MIMAG** package and an organism name (without `uncultured`) representative of the MAG. Record the source metagenome via the `metagenome_source` attribute (for example `soil metagenome`) and the `derived_from` reference to the metagenome sample.
- The source feature must carry `/metagenome_source`, `/environmental_sample`, `/isolation_source`, `/isolate`, `/organism`, and `/mol_type="genomic DNA"`.
- `/strain` must not be used. Host information goes in `/host`.
- Organism names containing `metagenome` or `uncultured` are not allowed in `/organism`.
- The ST_COMMENT block must include **Assembly Method**, **Genome Coverage**, and **Sequencing Technology** (plus **Assembly Name** for eukaryotes).

### SAG (Single Amplified Genome)

- Use the BioSample **MISAG** package.
- The source feature must carry `/note="single amplified genome"` and `/isolation_source`.
- For co-assemblies of multiple cells, state this in `/note` and reference the source samples via the BioSample `derived_from` attribute.

## Haplotype assembly

When submitting a diploid genome as separate Principal and Alternate haplotypes, use the following three-layer structure.

| Layer | Role |
| --- | --- |
| Principal BioProject | Submission unit for the principal haplotype |
| Alternate BioProject | Submission unit for the alternate haplotype |
| Umbrella BioProject | Parent project that ties the two above together |

- Record `Diploid :: Principal haplotype` or `Diploid :: Alternate haplotype` in ST_COMMENT.
- Both haplotypes must reference the same BioSample (use the MIGS package).
- Submitters choose the labelling convention: Principal / Alternate, Haplotype 1 / 2, or Maternal / Paternal.
- An [Umbrella BioProject](/bioproject#umbrella-bioproject) can also bundle the corresponding raw-reads project under [DRA](/dra).

## TPA (Third Party Annotation)

TPA covers data assembled or (re)annotated by a third party from primary entries that someone else has already deposited. The only submission window is MSS; NSSS does not handle TPA.

> [!WARNING]
> Since January 2025, DDBJ only accepts **TPA:assembly**. New submissions for TPA:experimental, TPA:inferential, and TPA:specialist_db are suspended.

Key constraints:

- The primary entry must be deposited in INSDC (it may be unreleased at TPA submission time but must be retrievable when the TPA entry is released).
- Generation of the assembled sequence must be subject to **peer-reviewed journal** peer review.
- TPA and primary sequences may differ by no more than **5 %**.
- Gaps without a citation must be **50 bp or shorter**.
- Full-replicon assemblies (TPA-WGS, etc.) require BioProject and BioSample registration.

## Related resources

### Official documentation

- DDBJ MSS: <https://www.ddbj.nig.ac.jp/ddbj/mss-e.html>
- DDBJ NSSS: <https://www.ddbj.nig.ac.jp/ddbj/web-submission-e.html>
- Sequence submission top: <https://www.ddbj.nig.ac.jp/ddbj/submission-e.html>
- File format (FASTA + annotation TSV): <https://www.ddbj.nig.ac.jp/ddbj/file-format-e.html>
- Data categories: <https://www.ddbj.nig.ac.jp/ddbj/data-categories-e.html>
- INSDC accession numbers: <https://www.ddbj.nig.ac.jp/insdc/accessions-e.html>

### Sub-topic guides

- Metagenome assembly (MAG): <https://www.ddbj.nig.ac.jp/ddbj/metagenome-assembly-e.html>
- Single Amplified Genome (SAG): <https://www.ddbj.nig.ac.jp/ddbj/single-amplified-genome-e.html>
- Haplotype assembly: <https://www.ddbj.nig.ac.jp/ddbj/haplotype-e.html>
- TPA: <https://www.ddbj.nig.ac.jp/ddbj/tpa-e.html>
- Finished level genome: <https://www.ddbj.nig.ac.jp/ddbj/finished_level_genome-e.html>

### Tools

- UME (format + CDS translation checker): <https://www.ddbj.nig.ac.jp/ddbj/ume-e.html>
- Parser (format): <https://www.ddbj.nig.ac.jp/ddbj/parser-e.html>
- transChecker (CDS translation): <https://www.ddbj.nig.ac.jp/ddbj/transchecker-e.html>
- DFAST (automated prokaryotic genome annotation): <https://dfast.ddbj.nig.ac.jp/>

### Related services

- [BioProject](/bioproject) - Project registration ([Umbrella BioProject](/bioproject#umbrella-bioproject))
- [BioSample](/biosample) - Sample metadata registration
- [DRA](/dra) - NGS raw reads submission
