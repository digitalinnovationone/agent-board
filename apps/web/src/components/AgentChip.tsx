import type { Glyph } from '@agent-board/types';
import { AgentGlyph } from './AgentGlyph';

const DICEBEAR_BASE = 'https://api.dicebear.com/9.x/bottts/svg?seed=';

interface Props {
  glyph: Glyph;
  hue: number;
  avatar?: string | null;
  size?: number;
}

export function AgentChip({ glyph, hue, avatar, size = 28 }: Props) {
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
      {avatar ? (
        <img
          src={`${DICEBEAR_BASE}${encodeURIComponent(avatar)}`}
          alt=""
          style={{ width: size, height: size, display: 'block' }}
        />
      ) : (
        <AgentGlyph glyph={glyph} size={Math.round(size * 0.5)} />
      )}
    </span>
  );
}
