import type { ReactElement } from "react"

import type { FileTypeKind } from "~/schemas/submit"

type FileTypeIconProps = {
  fileTypeKind: FileTypeKind
  size?: number
}

type IconBody = (color: string) => ReactElement

const sequenceReadIcon: IconBody = (color) => (
  <g stroke={color} strokeWidth="1.8" strokeLinecap="round">
    <line x1="3" y1="5" x2="12" y2="5" />
    <line x1="6" y1="8" x2="15" y2="8" />
    <line x1="4" y1="11" x2="13" y2="11" />
    <line x1="7" y1="14" x2="17" y2="14" />
  </g>
)

const sequenceIcon: IconBody = (color) => (
  <g stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round">
    <path d="M10,2 C5,4 5,8 10,10 C15,12 15,16 10,18" />
    <path d="M10,2 C15,4 15,8 10,10 C5,12 5,16 10,18" />
    <line x1="6" y1="6" x2="14" y2="6" />
    <line x1="6" y1="14" x2="14" y2="14" />
  </g>
)

const variantIcon: IconBody = (color) => (
  <g stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none">
    <line x1="3" y1="7" x2="8" y2="7" />
    <line x1="12" y1="7" x2="17" y2="7" />
    <line x1="3" y1="13" x2="8" y2="13" />
    <line x1="12" y1="13" x2="17" y2="13" />
    <line x1="8" y1="7" x2="12" y2="7" />
    <line x1="8" y1="13" x2="10" y2="10" />
    <line x1="10" y1="10" x2="12" y2="13" />
    <circle cx="10" cy="10" r="1.5" fill={color} stroke="none" />
  </g>
)

const matrixIcon: IconBody = (color) => (
  <g fill={color}>
    <rect x="3" y="3" width="4" height="4" rx="0.5" opacity="0.9" />
    <rect x="8" y="3" width="4" height="4" rx="0.5" opacity="0.3" />
    <rect x="13" y="3" width="4" height="4" rx="0.5" opacity="0.5" />
    <rect x="3" y="8" width="4" height="4" rx="0.5" opacity="0.35" />
    <rect x="8" y="8" width="4" height="4" rx="0.5" opacity="0.85" />
    <rect x="13" y="8" width="4" height="4" rx="0.5" opacity="0.2" />
    <rect x="3" y="13" width="4" height="4" rx="0.5" opacity="0.6" />
    <rect x="8" y="13" width="4" height="4" rx="0.5" opacity="0.4" />
    <rect x="13" y="13" width="4" height="4" rx="0.5" opacity="0.95" />
  </g>
)

const microarrayIcon: IconBody = (color) => (
  <g>
    <rect
      x="2" y="2" width="16" height="16" rx="1.5"
      stroke={color} strokeWidth="1.2" fill="none"
    />
    <circle cx="6" cy="6" r="1.3" fill={color} opacity="0.8" />
    <circle cx="10" cy="6" r="1.3" fill={color} opacity="0.4" />
    <circle cx="14" cy="6" r="1.3" fill={color} opacity="0.9" />
    <circle cx="6" cy="10" r="1.3" fill={color} opacity="0.5" />
    <circle cx="10" cy="10" r="1.3" fill={color} opacity="0.7" />
    <circle cx="14" cy="10" r="1.3" fill={color} opacity="0.3" />
    <circle cx="6" cy="14" r="1.3" fill={color} opacity="0.6" />
    <circle cx="10" cy="14" r="1.3" fill={color} opacity="0.85" />
    <circle cx="14" cy="14" r="1.3" fill={color} opacity="0.45" />
  </g>
)

const spatialIcon: IconBody = (color) => (
  <g>
    <circle
      cx="10" cy="10" r="7.5"
      stroke={color} strokeWidth="1.2" fill="none"
    />
    <circle cx="7" cy="7" r="1.2" fill={color} opacity="0.9" />
    <circle cx="12" cy="6" r="1.0" fill={color} opacity="0.5" />
    <circle cx="5" cy="11" r="0.9" fill={color} opacity="0.7" />
    <circle cx="10" cy="10" r="1.3" fill={color} opacity="0.85" />
    <circle cx="14" cy="9" r="0.8" fill={color} opacity="0.4" />
    <circle cx="8" cy="14" r="1.1" fill={color} opacity="0.6" />
    <circle cx="13" cy="13" r="1.0" fill={color} opacity="0.75" />
  </g>
)

const metabolomicsIcon: IconBody = (color) => (
  <g stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3,17 L5,17 L6,12 L7,17 L9,17 L10,5 L11,17 L13,10 L14,17 L15,7 L16,17 L17,17" />
    <line x1="3" y1="17" x2="17" y2="17" />
  </g>
)

const proteomeIcon: IconBody = (color) => (
  <g>
    <path
      d="M6,3 Q9,5 6,7 Q3,9 6,11 Q9,13 6,15 Q3,17 6,18"
      stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"
    />
    <polygon
      points="13,3 16,3 16,12 18,12 14.5,17 11,12 13,12"
      fill={color} stroke="none" opacity="0.7"
    />
  </g>
)

const ICONS: Readonly<Record<FileTypeKind, IconBody>> = {
  "sequence-read": sequenceReadIcon,
  "sequence": sequenceIcon,
  "variant": variantIcon,
  "expression-matrix": matrixIcon,
  "microarray-expression": microarrayIcon,
  "spatial-transcriptomics": spatialIcon,
  "metabolomics": metabolomicsIcon,
  "proteome": proteomeIcon,
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
