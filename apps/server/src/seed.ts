import db from './db.js';

const DEFAULT_AGENTS = [
  { id: 'planner', name: 'Planner', role: 'Product Owner', glyph: 'triangle', hue: 260, ownsColumn: 'Backlog', tools: ['read', 'write'] },
  { id: 'scribe', name: 'Scribe', role: 'Spec Writer', glyph: 'square', hue: 200, ownsColumn: 'Specification', tools: ['read', 'write'] },
  { id: 'forge', name: 'Forge', role: 'Backend Dev', glyph: 'diamond', hue: 30, ownsColumn: 'Development', tools: ['read', 'write', 'bash'] },
  { id: 'loom', name: 'Loom', role: 'Frontend Dev', glyph: 'circle', hue: 160, ownsColumn: 'Development', tools: ['read', 'write', 'bash'] },
  { id: 'sentinel', name: 'Sentinel', role: 'QA / Testing', glyph: 'hex', hue: 340, ownsColumn: 'Testing', tools: ['read', 'bash'] },
  { id: 'pilot', name: 'Pilot', role: 'DevOps', glyph: 'chevron', hue: 100, ownsColumn: 'Deploy', tools: ['read', 'write', 'bash'] },
];

export function seedAgents() {
  const count = (db.prepare('SELECT COUNT(*) as c FROM agents').get() as { c: number }).c;
  if (count > 0) return;

  const stmt = db.prepare(`
    INSERT INTO agents (id, name, role, glyph, hue, system_prompt, tools, owns_column, created_at)
    VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)
  `);

  const now = Date.now();
  for (const a of DEFAULT_AGENTS) {
    stmt.run(a.id, a.name, a.role, a.glyph, a.hue, JSON.stringify(a.tools), a.ownsColumn, now);
  }

  console.log('[seed] Inserted 6 default agents');
}
