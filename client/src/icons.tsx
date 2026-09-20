import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const base = (
  size: number,
  color: string,
  strokeWidth: number
): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: color,
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

/**
 * Lumen brand mark — a faceted prism/gem.
 * Designed to read well at 16–20px and hold up inside a filled gradient tile.
 */
export const IconPrism = ({
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.6,
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2.5 4.2 9.1a1 1 0 0 0-.34.75V19a1.5 1.5 0 0 0 1.5 1.5h13.28a1.5 1.5 0 0 0 1.5-1.5v-9.15a1 1 0 0 0-.34-.75L12 2.5Z" />
    <path d="M12 2.5v18" />
    <path d="M4.5 9.4 12 12l7.5-2.6" />
    <path d="M4.5 9.4 8 20.5" />
    <path d="M19.5 9.4 16 20.5" />
  </svg>
);

export const IconDocuments = ({
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.8,
}: IconProps) => (
  <svg {...base(size, color, strokeWidth)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

export const IconChat = ({
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.8,
}: IconProps) => (
  <svg {...base(size, color, strokeWidth)}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export const IconBrain = ({
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.8,
}: IconProps) => (
  <svg {...base(size, color, strokeWidth)}>
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44A2.5 2.5 0 0 1 4.5 17c0-1.1.7-2.03 1.68-2.36A2.5 2.5 0 0 1 4.5 12c0-1.1.7-2.03 1.68-2.36A2.5 2.5 0 0 1 4.5 7c0-1.1.7-2.03 1.68-2.36A2.5 2.5 0 0 1 9.5 2z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44A2.5 2.5 0 0 0 19.5 17c0-1.1-.7-2.03-1.68-2.36A2.5 2.5 0 0 0 19.5 12c0-1.1-.7-2.03-1.68-2.36A2.5 2.5 0 0 0 19.5 7c0-1.1-.7-2.03-1.68-2.36A2.5 2.5 0 0 0 14.5 2z" />
  </svg>
);

export const IconUpload = ({
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.8,
}: IconProps) => (
  <svg {...base(size, color, strokeWidth)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M17 8l-5-5-5 5" />
    <path d="M12 3v12" />
  </svg>
);

export const IconZap = ({
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.8,
}: IconProps) => (
  <svg {...base(size, color, strokeWidth)}>
    <path d="M13 2L3 14h8l-1 8 10-12h-8z" />
  </svg>
);

export const IconTrash = ({
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.8,
}: IconProps) => (
  <svg {...base(size, color, strokeWidth)}>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const IconRefresh = ({
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.8,
}: IconProps) => (
  <svg {...base(size, color, strokeWidth)}>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);

export const IconPlay = ({ size = 14, color = 'currentColor' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    stroke="none"
  >
    <polygon points="6,4 20,12 6,20" />
  </svg>
);

export const IconPause = ({ size = 14, color = 'currentColor' }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    stroke="none"
  >
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);

export const IconMic = ({
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.8,
}: IconProps) => (
  <svg {...base(size, color, strokeWidth)}>
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
    <path d="M12 19v3" />
  </svg>
);

export const IconStop = ({
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.8,
}: IconProps) => (
  <svg {...base(size, color, strokeWidth)}>
    <rect
      x="6"
      y="6"
      width="12"
      height="12"
      rx="2"
      fill={color}
      stroke="none"
    />
  </svg>
);

export const IconSend = ({
  size = 16,
  color = 'currentColor',
  strokeWidth = 2,
}: IconProps) => (
  <svg {...base(size, color, strokeWidth)}>
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

export const IconChevronDown = ({
  size = 16,
  color = 'currentColor',
  strokeWidth = 2,
}: IconProps) => (
  <svg {...base(size, color, strokeWidth)}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const IconChevronUp = ({
  size = 16,
  color = 'currentColor',
  strokeWidth = 2,
}: IconProps) => (
  <svg {...base(size, color, strokeWidth)}>
    <path d="M18 15l-6-6-6 6" />
  </svg>
);

export const IconSun = ({
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.8,
}: IconProps) => (
  <svg {...base(size, color, strokeWidth)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const IconMoon = ({
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.8,
}: IconProps) => (
  <svg {...base(size, color, strokeWidth)}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

export const IconLogout = ({
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.8,
}: IconProps) => (
  <svg {...base(size, color, strokeWidth)}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

export const IconScan = ({
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.8,
}: IconProps) => (
  <svg {...base(size, color, strokeWidth)}>
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <path d="M7 12h10" />
  </svg>
);
