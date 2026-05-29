import type { ReactElement } from "react"

import type { FileTypeKind } from "~/schemas/submit"

type FileTypeIconProps = {
  fileTypeKind: FileTypeKind
  size?: number
}

type IconBody = (color: string) => ReactElement

const sequenceReadIcon: IconBody = (color) => (
  <g stroke={color} strokeWidth="1.5" strokeLinecap="round">
    <line x1="3" y1="6" x2="17" y2="6" strokeDasharray="2 2" />
    <line x1="3" y1="10" x2="17" y2="10" strokeDasharray="2 2" />
    <line x1="3" y1="14" x2="17" y2="14" strokeDasharray="2 2" />
  </g>
)

const nucleotideIcon: IconBody = (color) => (
  <g stroke={color} strokeWidth="1.5" fill="none">
    <polygon points="10,2 17,7 10,12 3,7" />
    <polygon points="10,8 17,13 10,18 3,13" />
  </g>
)

const annotationIcon: IconBody = (color) => (
  <g stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round">
    <line x1="3" y1="10" x2="14" y2="10" />
    <polyline points="11,7 14,10 11,13" />
    <circle cx="16.5" cy="10" r="0.8" fill={color} />
  </g>
)

const variantIcon: IconBody = (color) => (
  <g stroke={color} strokeWidth="1.5" strokeLinecap="round">
    <line x1="5" y1="3" x2="5" y2="17" />
    <line x1="10" y1="3" x2="10" y2="17" />
    <line x1="15" y1="3" x2="15" y2="17" />
    <circle cx="5" cy="8" r="1.2" fill={color} stroke="none" />
    <circle cx="10" cy="13" r="1.2" fill={color} stroke="none" />
    <circle cx="15" cy="6" r="1.2" fill={color} stroke="none" />
  </g>
)

const matrixIcon: IconBody = (color) => (
  <g fill={color}>
    <rect x="3" y="10" width="3" height="7" />
    <rect x="8.5" y="6" width="3" height="11" />
    <rect x="14" y="3" width="3" height="14" />
  </g>
)

const microarrayIcon: IconBody = (color) => (
  <g fill={color}>
    <circle cx="5" cy="5" r="1.4" />
    <circle cx="10" cy="5" r="1.4" />
    <circle cx="15" cy="5" r="1.4" />
    <circle cx="5" cy="10" r="1.4" />
    <circle cx="10" cy="10" r="1.4" />
    <circle cx="15" cy="10" r="1.4" />
    <circle cx="5" cy="15" r="1.4" />
    <circle cx="10" cy="15" r="1.4" />
    <circle cx="15" cy="15" r="1.4" />
  </g>
)

const spatialIcon: IconBody = (color) => (
  <g stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round">
    <polygon points="10,2 16,5.5 16,12.5 10,16 4,12.5 4,5.5" />
    <line x1="10" y1="2" x2="10" y2="16" />
    <line x1="4" y1="5.5" x2="16" y2="12.5" />
    <line x1="16" y1="5.5" x2="4" y2="12.5" />
  </g>
)

const imageIcon: IconBody = (color) => (
  <g stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round">
    <rect x="3" y="3" width="14" height="14" rx="1.5" />
    <circle cx="7" cy="7.5" r="1.3" />
    <polyline points="3,15 8,10 11,13 14,9.5 17,13" />
  </g>
)

const massSpecIcon: IconBody = (color) => (
  <g stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round">
    <path d="M 8 3 L 8 9 L 4 15 Q 4 17 6 17 L 14 17 Q 16 17 16 15 L 12 9 L 12 3 Z" />
    <line x1="7" y1="3" x2="13" y2="3" />
  </g>
)

const nmrIcon: IconBody = (color) => (
  <g stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round">
    <path d="M 2 10 Q 5 3 8 10 T 14 10 T 18 10" />
  </g>
)

const assignmentIcon: IconBody = (color) => (
  <g stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round">
    <circle cx="6" cy="6" r="2" />
    <circle cx="14" cy="9" r="2" />
    <circle cx="8" cy="15" r="2" />
    <line x1="7.6" y1="7.4" x2="12.4" y2="8" />
    <line x1="7" y1="8" x2="7.6" y2="13" />
  </g>
)

const ICONS: Readonly<Record<FileTypeKind, IconBody>> = {
  "sequence-read": sequenceReadIcon,
  "sequence-nucleotide": nucleotideIcon,
  "sequence-annotation": annotationIcon,
  "variant": variantIcon,
  "expression-matrix": matrixIcon,
  "microarray-expression": microarrayIcon,
  "spatial-transcriptomics": spatialIcon,
  "spatial-image": imageIcon,
  "mass-spectrometry": massSpecIcon,
  "nmr": nmrIcon,
  "metabolite-assignment": assignmentIcon,
}

export const FileTypeIcon = ({ fileTypeKind, size = 18 }: FileTypeIconProps) => {
  const body = ICONS[fileTypeKind]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
    >
      {body("currentColor")}
    </svg>
  )
}
