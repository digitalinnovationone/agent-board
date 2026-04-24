import type { Glyph } from '@agent-board/types';

interface Props {
  glyph: Glyph;
  size?: number;
}

export function AgentGlyph({ glyph, size = 14 }: Props) {
  const strokeProps = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (glyph) {
    case 'triangle':
      return (
        <svg width={size} height={size} viewBox="0 0 14 14" {...strokeProps}>
          <polygon points="7,2 13,12 1,12" {...strokeProps} />
        </svg>
      );
    case 'square':
      return (
        <svg width={size} height={size} viewBox="0 0 14 14" {...strokeProps}>
          <rect x="2" y="2" width="10" height="10" rx="1.5" {...strokeProps} />
        </svg>
      );
    case 'diamond':
      return (
        <svg width={size} height={size} viewBox="0 0 14 14" {...strokeProps}>
          <polygon points="7,1 13,7 7,13 1,7" {...strokeProps} />
        </svg>
      );
    case 'circle':
      return (
        <svg width={size} height={size} viewBox="0 0 14 14" {...strokeProps}>
          <circle cx="7" cy="7" r="5.5" {...strokeProps} />
        </svg>
      );
    case 'hex':
      return (
        <svg width={size} height={size} viewBox="0 0 14 14" {...strokeProps}>
          <polygon points="7,1.5 12.2,4.25 12.2,9.75 7,12.5 1.8,9.75 1.8,4.25" {...strokeProps} />
        </svg>
      );
    case 'chevron':
      return (
        <svg width={size} height={size} viewBox="0 0 14 14" {...strokeProps}>
          <polyline points="2,3 8,7 2,11" {...strokeProps} />
          <polyline points="7,3 13,7 7,11" {...strokeProps} />
        </svg>
      );
  }
}
