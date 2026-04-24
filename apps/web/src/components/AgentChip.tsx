import type { Glyph } from '@agent-board/types';
import { AgentGlyph } from './AgentGlyph';

interface Props {
  glyph: Glyph;
  hue: number;
  size?: number;
}

export function AgentChip({ glyph, hue, size = 28 }: Props) {
  return (
    <span
      className="agent-chip"
      style={{
        width: size,
        height: size,
        background: `oklch(0.97 0.02 ${hue})`,
        color: `oklch(0.48 0.16 ${hue})`,
        borderRadius: 'var(--g-radius-md)',
      }}
    >
      <AgentGlyph glyph={glyph} size={Math.round(size * 0.5)} />
    </span>
  );
}
