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
    <rect x="3" y="3" width="4" height="4" rx="0.5" opacity="0.9" />
    <rect x="8" y="3" width="4" height="4" rx="0.5" opacity="0.35" />
    <rect x="13" y="3" width="4" height="4" rx="0.5" opacity="0.6" />
    <rect x="3" y="8" width="4" height="4" rx="0.5" opacity="0.4" />
    <rect x="8" y="8" width="4" height="4" rx="0.5" opacity="0.8" />
    <rect x="13" y="8" width="4" height="4" rx="0.5" opacity="0.3" />
    <rect x="3" y="13" width="4" height="4" rx="0.5" opacity="0.55" />
    <rect x="8" y="13" width="4" height="4" rx="0.5" opacity="0.85" />
    <rect x="13" y="13" width="4" height="4" rx="0.5" opacity="0.45" />
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
  <g stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="16" x2="17" y2="16" />
    <line x1="5" y1="16" x2="5" y2="11" />
    <line x1="8" y1="16" x2="8" y2="4" />
    <line x1="11" y1="16" x2="11" y2="9" />
    <line x1="14" y1="16" x2="14" y2="6" />
  </g>
)

const ICONS: Readonly<Record<FileTypeKind, IconBody>> = {
  "sequence-read": sequenceReadIcon,
  "sequence": nucleotideIcon,
  "variant": variantIcon,
  "expression-matrix": matrixIcon,
  "microarray-expression": microarrayIcon,
  "spatial-transcriptomics": spatialIcon,
  "spatial-image": imageIcon,
  "metabolomics": massSpecIcon,
  "proteome": massSpecIcon,
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
