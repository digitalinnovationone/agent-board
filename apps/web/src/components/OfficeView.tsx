import { useEffect, useRef, useState } from 'react';
import type { Agent } from '@agent-board/types';
import { AgentChip } from './AgentChip';

// x% for each of the 6 desk slots
const DESK_X = [9, 23, 37, 51, 65, 79];
const DESK_ROBOT_Y = 20; // % — robot y when working (above desk)
const DESK_SVG_Y = 29;   // % — desk SVG top when working

// Coffee machine — left of break room, level with sofa
const COFFEE_X = 7;
const COFFEE_Y = 65;

// Idle robot positions — to the right of the board, after ~36%
const IDLE_SLOTS = [
  { x: 41, y: 63 }, { x: 49, y: 67 }, { x: 57, y: 62 },
  { x: 65, y: 66 }, { x: 73, y: 63 }, { x: 79, y: 65 },
];

const CODE_SYMBOLS = ['{ }', '</>', 'git', 'npm', '⚡', '✓', 'fn()', '→'];

// Uptime sparkline — 3 frames that transition between each other
const SPARKLINE_PTS = [
  [[0,22],[18,19],[36,24],[54,18],[72,22],[90,19],[108,21]],
  [[0,20],[18,24],[36,19],[54,23],[72,18],[90,22],[108,20]],
  [[0,23],[18,18],[36,22],[54,20],[72,24],[90,19],[108,22]],
] as const;

// Lead time chart data — 3 phases that animate between each other
const LT_TARGETS = [
  [30, 22, 36, 18, 28],
  [24, 27, 27, 25, 24],
  [20, 30, 40, 14, 32],
];

interface Props {
  agents: Record<string, Agent>;
}

export function OfficeView({ agents }: Props) {
  const agentList = Object.values(agents);
  const [animated, setAnimated] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simStatus, setSimStatus] = useState<Record<string, 'idle' | 'working'>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Delay enabling transitions so initial render snaps into position
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(t);
  }, []);

  const toggleSim = () => {
    if (simulating) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setSimStatus({});
      setSimulating(false);
    } else {
      setSimulating(true);
      const tick = () => {
        const ids = Object.keys(agents);
        const workCount = Math.floor(Math.random() * 2) + 1;
        const shuffled = [...ids].sort(() => Math.random() - 0.5);
        const next: Record<string, 'idle' | 'working'> = {};
        ids.forEach((id, i) => { next[shuffled[i]] = i < workCount ? 'working' : 'idle'; });
        setSimStatus(next);
      };
      tick();
      intervalRef.current = setInterval(tick, 3000);
    }
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  // Merge real status with simulation override
  const resolvedAgents = agentList.map(a => ({
    ...a,
    status: simulating ? (simStatus[a.id] ?? 'idle') : a.status,
  }));

  return (
    <div className="office-view">
      {/* Simulate button */}
      <button
        className={`office-sim-btn${simulating ? ' active' : ''}`}
        onClick={toggleSim}
      >
        <span className={`office-sim-dot${simulating ? ' on' : ''}`} />
        {simulating ? 'Stop simulation' : 'Simulate'}
      </button>

      {/* Zone labels */}
      <span className="office-label" style={{ left: 20, top: 16 }}>Work Area</span>
      <span className="office-label" style={{ left: 20, top: '57%' }}>☕ Break Room</span>

      {/* Divider */}
      <div className="office-divider" />

      {/* Wall decorations — Uptime + Kanban centered between Work Area label and clock */}
      <div className="office-wall-deco" style={{ left: '14%', top: '2%' }}>
        <UptimeDashboard />
      </div>
      <div className="office-wall-deco" style={{ left: '25%', top: '2%' }}>
        <MiniKanban />
      </div>
      <div className="office-wall-deco" style={{ left: '52%', top: '2%', transform: 'translateX(-50%)' }}>
        <WallClock />
      </div>
      <div className="office-wall-deco" style={{ left: '61%', top: '2%' }}>
        <LeadTimeDashboard />
      </div>

      {/* Work area corner plant */}
      <div style={{ position: 'absolute', left: '1.5%', top: '31%' }}>
        <PlantSvg />
      </div>

      {/* Break room — sofa (right of coffee machine) */}
      <div style={{ position: 'absolute', left: '12%', top: '67%', zIndex: 1 }}>
        <SofaSvg />
      </div>

      {/* Break room — Employee of the Month (right of sofa, top aligned near sofa bottom) */}
      <div style={{ position: 'absolute', left: '24%', top: '58%', zIndex: 1 }}>
        <EmployeeOfTheMonth agents={resolvedAgents} />
      </div>

      {/* Desks — one per agent slot */}
      {resolvedAgents.map((agent, i) => (
        <div
          key={`desk-${agent.id}`}
          className="office-desk-anchor"
          style={{ left: `${DESK_X[i % 6]}%`, top: `${DESK_SVG_Y}%` }}
        >
          <DeskSvg isOccupied={agent.status === 'working'} name={agent.name} />
        </div>
      ))}

      {/* Coffee machine */}
      <div className="office-desk-anchor" style={{ left: `${COFFEE_X}%`, top: `${COFFEE_Y}%` }}>
        <CoffeeMachineSvg />
      </div>

      {/* Robots */}
      {resolvedAgents.map((agent, i) => {
        const working = agent.status === 'working';
        const x = working ? DESK_X[i % 6] : IDLE_SLOTS[i % 6].x;
        const y = working ? DESK_ROBOT_Y : IDLE_SLOTS[i % 6].y;

        return (
          <div
            key={agent.id}
            className={`office-robot-anchor${animated ? ' animated' : ''}`}
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            {working && <ThoughtBubble agentIndex={i} />}
            <div className={`office-robot ${working ? 'working' : 'idle'}`}>
              <AgentChip glyph={agent.glyph} hue={agent.hue} avatar={agent.avatar} size={52} />
              <span className="office-robot-name">{agent.name}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ThoughtBubble({ agentIndex }: { agentIndex: number }) {
  const [idx, setIdx] = useState(agentIndex % CODE_SYMBOLS.length);
  useEffect(() => {
    const id = setInterval(
      () => setIdx(i => (i + 1) % CODE_SYMBOLS.length),
      1600 + agentIndex * 180,
    );
    return () => clearInterval(id);
  }, [agentIndex]);
  return (
    <div className="office-bubble">
      <code key={idx} className="office-bubble-symbol">{CODE_SYMBOLS[idx]}</code>
    </div>
  );
}

function WallClock() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const now = new Date();
  const sDeg = now.getSeconds() * 6;
  const mDeg = (now.getMinutes() + now.getSeconds() / 60) * 6;
  const hDeg = ((now.getHours() % 12) + now.getMinutes() / 60) * 30;
  const hand = (deg: number, len: number) => {
    const r = deg * (Math.PI / 180);
    return { x2: 23 + len * Math.sin(r), y2: 23 - len * Math.cos(r) };
  };
  return (
    <svg width="46" height="46" viewBox="0 0 46 46">
      <circle cx="23" cy="23" r="21" fill="white" stroke="#e5e7eb" strokeWidth="1.5" />
      {Array.from({ length: 12 }, (_, i) => {
        const r = i * 30 * Math.PI / 180;
        return (
          <line key={i}
            x1={23 + 17 * Math.sin(r)} y1={23 - 17 * Math.cos(r)}
            x2={23 + 20 * Math.sin(r)} y2={23 - 20 * Math.cos(r)}
            stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round"
          />
        );
      })}
      <line x1="23" y1="23" {...hand(hDeg, 9)} stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="23" y1="23" {...hand(mDeg, 13)} stroke="#374151" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="23" y1="23" {...hand(sDeg, 15)} stroke="#ef4444" strokeWidth="1" strokeLinecap="round" />
      <circle cx="23" cy="23" r="1.8" fill="#374151" />
    </svg>
  );
}

function UptimeDashboard() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 1) % SPARKLINE_PTS.length), 1800);
    return () => clearInterval(id);
  }, []);

  const W = 120, H = 70;
  const pts = SPARKLINE_PTS[phase];
  const chartX = 8, chartY = 45, chartW = W - 16, chartH = 17;
  const toXY = ([x, y]: readonly [number, number]) =>
    `${chartX + (x / 108) * chartW},${chartY + (y / 26) * chartH}`;
  const d = `M ${pts.map(toXY).join(' L ')}`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <rect x="0" y="0" width={W} height={H} rx="5" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
      <text x={W / 2} y="11" textAnchor="middle" fontSize="6.5" fontWeight="600" fill="#64748b" fontFamily="inherit">Uptime</text>
      <circle cx={W - 10} cy="8" r="3.5" fill="#10b981" className="office-uptime-dot" />
      <text x={W / 2} y="32" textAnchor="middle" fontSize="17" fontWeight="700" fill="#10b981" fontFamily="inherit">99.9%</text>
      <text x={W / 2} y="40" textAnchor="middle" fontSize="5" fill="#94a3b8" fontFamily="inherit">last 30 days</text>
      <rect x={chartX} y={chartY} width={chartW} height={chartH} rx="2" fill="#ecfdf5" />
      <path
        d={d}
        fill="none"
        stroke="#10b981"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: 'd 0.7s ease' }}
      />
    </svg>
  );
}

const KANBAN_COLS_DEF = [
  { label: 'Backlog', header: '#e0e7ff', text: '#4338ca', cards: ['#c7d2fe', '#ddd6fe'] as const },
  { label: 'Dev',     header: '#d1fae5', text: '#065f46', cards: ['#a7f3d0', '#bbf7d0'] as const },
  { label: 'Done',    header: '#fef9c3', text: '#92400e', cards: ['#fde68a', '#fef08a'] as const },
];

function MiniKanban() {
  const [activeCol, setActiveCol] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActiveCol(c => (c + 1) % 3), 2500);
    return () => clearInterval(id);
  }, []);

  const colW = 44, gap = 4, pad = 6;
  const W = 3 * colW + 2 * gap + 2 * pad;
  const H = 72;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <rect x="0" y="0" width={W} height={H} rx="5" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
      <text x={W / 2} y="11" textAnchor="middle" fontSize="6.5" fontWeight="600" fill="#64748b" fontFamily="inherit">Kanban</text>
      {KANBAN_COLS_DEF.map((col, ci) => {
        const cx = pad + ci * (colW + gap);
        return (
          <g key={col.label}>
            <rect x={cx} y="14" width={colW} height="10" rx="2" fill={col.header} />
            <text x={cx + colW / 2} y="21.5" textAnchor="middle" fontSize="5.5" fontWeight="600" fill={col.text} fontFamily="inherit">
              {col.label}
            </text>
            {col.cards.map((cardFill, ri) => (
              <rect
                key={ri}
                x={cx + 2} y={28 + ri * 14}
                width={colW - 4} height={10}
                rx="2"
                style={{
                  fill: ci === activeCol && ri === 0 ? '#6366f1' : cardFill,
                  transition: 'fill 0.4s ease',
                }}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

const LT_LABELS = ['W1', 'W2', 'W3', 'W4', 'W5'];

function LeadTimeDashboard() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 1) % LT_TARGETS.length), 2200);
    return () => clearInterval(id);
  }, []);

  const heights = LT_TARGETS[phase];
  const W = 148, H = 70;
  const barW = 20, barGap = 5, chartLeft = 14, chartBottom = 60, maxH = 38;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <rect x="0" y="0" width={W} height={H} rx="5" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
      <text x={W / 2} y="11" textAnchor="middle" fontSize="6.5" fontWeight="600" fill="#64748b" fontFamily="inherit">Lead Time</text>
      <line x1={chartLeft - 2} y1={chartBottom - maxH - 2} x2={chartLeft - 2} y2={chartBottom} stroke="#e2e8f0" strokeWidth="0.75" />
      <line x1={chartLeft - 2} y1={chartBottom} x2={W - 4} y2={chartBottom} stroke="#e2e8f0" strokeWidth="0.75" />
      {LT_LABELS.map((label, i) => {
        const h = heights[i];
        const x = chartLeft + i * (barW + barGap);
        return (
          <g key={label}>
            <rect
              x={x} y={chartBottom - maxH}
              width={barW} height={maxH}
              rx="2"
              style={{
                transformOrigin: '50% 100%',
                transform: `scaleY(${h / maxH})`,
                transition: 'transform 0.7s cubic-bezier(0.4,0,0.2,1)',
                fill: i === phase ? '#6366f1' : '#c7d2fe',
              }}
            />
            <text x={x + barW / 2} y={chartBottom + 7} textAnchor="middle" fontSize="5.5" fill="#94a3b8" fontFamily="inherit">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function PlantSvg() {
  return (
    <svg width="38" height="66" viewBox="0 0 38 66" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="7" y="49" width="24" height="16" rx="2" fill="#c9a96e" />
      <rect x="5" y="49" width="28" height="5" rx="2" fill="#b8935a" />
      <ellipse cx="19" cy="49" rx="12" ry="3.5" fill="#6b3a1f" opacity="0.65" />
      <path d="M19 49 Q19 35 19 12" stroke="#16a34a" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M19 38 Q7 28 5 16 Q15 22 19 34" fill="#22c55e" />
      <path d="M19 30 Q31 20 33 8 Q23 14 19 26" fill="#16a34a" />
      <path d="M19 15 Q15 8 19 4 Q23 8 19 15" fill="#4ade80" />
    </svg>
  );
}

function EmployeeOfTheMonth({ agents }: { agents: Agent[] }) {
  if (agents.length === 0) return null;
  const agent = agents[0];
  return (
    <div className="office-eom">
      <span className="office-eom-badge">⭐ Agente do Mês</span>
      <div className="office-eom-avatar" key={agent.id}>
        <AgentChip glyph={agent.glyph} hue={agent.hue} avatar={agent.avatar} size={42} />
      </div>
      <span className="office-eom-name">{agent.name}</span>
    </div>
  );
}

function SofaSvg() {
  return (
    <svg width="118" height="58" viewBox="0 0 118 58" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Back rest */}
      <rect x="10" y="0" width="98" height="30" rx="7" fill="#6b8ea0" />
      {/* Cushion dividers on back */}
      <line x1="49" y1="2" x2="49" y2="28" stroke="#597d8f" strokeWidth="1.5" opacity="0.6" />
      <line x1="69" y1="2" x2="69" y2="28" stroke="#597d8f" strokeWidth="1.5" opacity="0.6" />
      {/* Seat */}
      <rect x="0" y="24" width="118" height="24" rx="4" fill="#7ca5b8" />
      {/* Left arm */}
      <rect x="0" y="10" width="14" height="38" rx="5" fill="#547f91" />
      {/* Right arm */}
      <rect x="104" y="10" width="14" height="38" rx="5" fill="#547f91" />
      {/* Seat cushion dividers */}
      <line x1="46" y1="26" x2="46" y2="48" stroke="#597d8f" strokeWidth="1.5" opacity="0.5" />
      <line x1="72" y1="26" x2="72" y2="48" stroke="#597d8f" strokeWidth="1.5" opacity="0.5" />
      {/* Legs */}
      <rect x="10" y="48" width="9" height="10" rx="2" fill="#3d5f6e" />
      <rect x="99" y="48" width="9" height="10" rx="2" fill="#3d5f6e" />
    </svg>
  );
}

function BreakRoomPlantSvg() {
  return (
    <svg width="36" height="54" viewBox="0 0 36 54" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pot */}
      <rect x="9" y="40" width="18" height="13" rx="2" fill="#c9a96e" />
      <rect x="7" y="40" width="22" height="4" rx="1" fill="#b8935a" />
      <ellipse cx="18" cy="40" rx="10" ry="3" fill="#6b3a1f" opacity="0.6" />
      {/* Bushy foliage */}
      <circle cx="18" cy="28" r="12" fill="#22c55e" />
      <circle cx="10" cy="32" r="9" fill="#16a34a" />
      <circle cx="26" cy="30" r="10" fill="#4ade80" opacity="0.9" />
      <circle cx="18" cy="20" r="8" fill="#22c55e" />
      <circle cx="12" cy="22" r="6" fill="#4ade80" opacity="0.8" />
    </svg>
  );
}

function DeskSvg({ isOccupied, name }: { isOccupied: boolean; name: string }) {
  return (
    <svg width="100" height="76" viewBox="0 0 100 76" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Agent name tag above desk */}
      <text x="50" y="-4" textAnchor="middle" fontSize="9" fill="#a1a1aa" fontFamily="inherit">{name}</text>
      {/* Monitor */}
      <rect x="15" y="0" width="70" height="44" rx="4" fill="#1f2937" />
      <rect x="19" y="4" width="62" height="36" rx="2" fill={isOccupied ? '#064e3b' : '#111827'} />
      {isOccupied && (
        <>
          <rect x="23" y="8"  width="28" height="2" rx="1" fill="#10b981" opacity="0.9" />
          <rect x="23" y="13" width="44" height="2" rx="1" fill="#10b981" opacity="0.6" />
          <rect x="23" y="18" width="36" height="2" rx="1" fill="#10b981" opacity="0.5" />
          <rect x="23" y="23" width="40" height="2" rx="1" fill="#10b981" opacity="0.4" />
          <rect x="23" y="28" width="18" height="2" rx="1" fill="#10b981" opacity="0.3" />
        </>
      )}
      {/* Monitor stand */}
      <rect x="44" y="44" width="12" height="8" fill="#4b5563" />
      <rect x="33" y="52" width="34" height="5" rx="2" fill="#6b7280" />
      {/* Desk surface */}
      <rect x="0" y="57" width="100" height="13" rx="3" fill="#c9a96e" />
      <rect x="0" y="66" width="100" height="4" rx="1" fill="#b8935a" />
      {/* Keyboard hint */}
      {isOccupied && (
        <rect x="28" y="59" width="44" height="6" rx="2" fill="#b8935a" opacity="0.5" />
      )}
    </svg>
  );
}

function CoffeeMachineSvg() {
  return (
    <svg width="64" height="88" viewBox="0 0 64 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Steam */}
      <path d="M22 10 Q24 4 22 0" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M32 8 Q34 2 32 0" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M42 10 Q44 4 42 0" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" />
      {/* Body */}
      <rect x="4" y="12" width="56" height="70" rx="8" fill="#374151" />
      <rect x="4" y="12" width="56" height="70" rx="8" stroke="#4b5563" strokeWidth="1" />
      {/* Display */}
      <rect x="10" y="18" width="44" height="24" rx="4" fill="#065f46" />
      <rect x="14" y="22" width="16" height="2" rx="1" fill="#10b981" opacity="0.9" />
      <rect x="14" y="27" width="28" height="2" rx="1" fill="#10b981" opacity="0.6" />
      <rect x="14" y="32" width="20" height="2" rx="1" fill="#10b981" opacity="0.4" />
      {/* Power button */}
      <circle cx="50" cy="24" r="5" fill="#1f2937" />
      <circle cx="50" cy="24" r="3" fill="#10b981" />
      {/* Spout */}
      <rect x="24" y="46" width="16" height="5" rx="2.5" fill="#9ca3af" />
      {/* Drip tray */}
      <rect x="8" y="55" width="48" height="22" rx="4" fill="#4b5563" />
      {/* Cup */}
      <rect x="19" y="58" width="26" height="15" rx="2" fill="#ffffff" />
      <rect x="19" y="58" width="26" height="5" rx="2" fill="#7c3aed" opacity="0.25" />
      <path d="M45 63 Q50 65 45 70" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
