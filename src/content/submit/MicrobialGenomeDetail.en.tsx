import { ExternalLink } from "lucide-react"

import { Badge, Heading } from "@/components/ui"

// Corresponds to leaf: prokaryote-raw-assembly (leaf-18)
const MicrobialGenomeDetail = () => (
  <div className="space-y-8">
    <section className="space-y-3">
      <Heading level={3}>About this leaf</Heading>
      <p className="text-sm leading-relaxed text-gray-700">
        Prokaryote genome submission (bacteria / archaea) where you hold <strong>both raw reads and an assembly</strong>.
        Raw reads go to DRA; the assembly goes through MSS to DDBJ Traditional Annotation.
        Combined with metadata (BioProject + BioSample), the submission is managed across three layers.
        Annotation can be produced with <strong>DFAST</strong> (automatic prokaryotic genome annotation).
      </p>
      <div className="flex flex-wrap gap-2">
        <Badge variant="primary">BP+BS+DRA+MSS</Badge>
        <Badge variant="gray">BioSample: Microbe</Badge>
        <Badge variant="gray">MSS data type: GNM / WGS</Badge>
      </div>
    </section>

    <section className="space-y-3">
      <Heading level={3}>Submission flow</Heading>
      <ol className="space-y-2 pl-0">
        {[
          {
            step: 1,
            title: "Register BioProject",
            desc: "Submit project-level metadata via D-way and obtain a PRJDBxxxxx accession.",
          },
          {
            step: 2,
            title: "Register BioSample",
            desc: "Via D-way, choose the Microbe package and fill in required fields (strain, isolate, etc.). Obtain a SAMDxxxxxxx accession.",
          },
          {
            step: 3,
            title: "Submit raw reads to DRA",
            desc: "Upload FASTQ (or BAM) with MD5 via the DRA section of D-way. Link to the BioProject / BioSample accessions.",
          },
          {
            step: 4,
            title: "Submit the assembly via MSS",
            desc: "Apply through the MSS form with FASTA + tab-separated annotation. Pick the data type (GNM for Finished, WGS for Draft).",
          },
        ].map((s) => (
          <li
            key={s.step}
            className="flex gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
          >
            <span className="bg-primary-100 text-primary-700 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {s.step}
            </span>
            <div>
              <div className="text-sm font-semibold text-gray-900">{s.title}</div>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>

    <section className="space-y-3">
      <Heading level={3}>What to prepare</Heading>
      <ul className="ml-4 list-inside list-disc space-y-1 text-sm leading-relaxed text-gray-700">
        <li>DDBJ Account and SSH public key</li>
        <li>Raw reads (FASTQ or BAM) with MD5</li>
        <li>Assembly sequences (FASTA)</li>
        <li>Annotation file (MSS tab-separated format)</li>
        <li>locus_tag prefix (decided before submission)</li>
      </ul>
    </section>

    <section className="space-y-3">
      <Heading level={3}>Assembly completeness and MSS data type</Heading>
      <p className="text-sm leading-relaxed text-gray-700">
        Pick the MSS data type based on completeness.
      </p>
      <ul className="ml-4 list-inside list-disc space-y-1 text-sm leading-relaxed text-gray-700">
        <li><strong>GNM (Finished)</strong> — chromosome-level continuous sequences</li>
        <li><strong>WGS (Draft)</strong> — contigs or scaffolds</li>
      </ul>
    </section>

    <section className="space-y-3">
      <Heading level={3}>Annotation (DFAST)</Heading>
      <p className="text-sm leading-relaxed text-gray-700">
        DFAST is a prokaryote-specific automatic annotation pipeline. Run it via the web UI or API
        to produce annotated GenBank / FASTA. Verify the result before submitting to MSS.
      </p>
    </section>

    <section className="space-y-3">
      <Heading level={3}>Further reading</Heading>
      <ul className="space-y-1.5 text-sm">
        {[
          { label: "D-way (BioProject / BioSample / DRA)", url: "https://ddbj.nig.ac.jp/D-way" },
          { label: "MSS submission form", url: "https://mss.ddbj.nig.ac.jp/" },
          { label: "DFAST — automatic prokaryote genome annotation", url: "https://dfast.ddbj.nig.ac.jp/" },
          { label: "Genome Project data submission", url: "https://www.ddbj.nig.ac.jp/ddbj/genome-e.html" },
          { label: "MSS submission guide", url: "https://www.ddbj.nig.ac.jp/ddbj/mss-e.html" },
          { label: "DRA submission guide", url: "https://www.ddbj.nig.ac.jp/dra/submission-e.html" },
          { label: "MSS check tools (UME / Parser / transChecker)", url: "https://www.ddbj.nig.ac.jp/ddbj/mss-tool-e.html" },
        ].map((link) => (
          <li key={link.url}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 decoration-primary-300 hover:text-primary-800 hover:decoration-primary-600 inline-flex items-center gap-1.5 font-medium underline underline-offset-2"
            >
              {link.label}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  </div>
)

export default MicrobialGenomeDetail
