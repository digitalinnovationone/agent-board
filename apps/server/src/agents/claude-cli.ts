import { spawn } from 'child_process';

const TOOL_MAP: Record<string, string[]> = {
  read:  ['Read'],
  write: ['Write', 'Edit'],
  bash:  ['Bash'],
  web:   ['WebFetch', 'WebSearch'],
};

export function buildAllowedTools(boardTools: string[]): string[] {
  return boardTools.flatMap(t => TOOL_MAP[t] ?? []);
}

export interface ClaudeCliOptions {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  allowedTools?: string[];
  cwd?: string;
}

export async function runClaudeCli(opts: ClaudeCliOptions): Promise<string> {
  const {
    systemPrompt,
    userPrompt,
    model = 'claude-sonnet-4-6',
    allowedTools = [],
    cwd = process.cwd(),
  } = opts;

  const claudeBin = process.env.CLAUDE_CODE_BIN ?? 'claude';

  const args: string[] = [
    '--print',
    '--output-format', 'text',
    '--model', model,
    '--dangerously-skip-permissions',
  ];

  if (systemPrompt) {
    args.push('--system-prompt', systemPrompt);
  }

  if (allowedTools.length > 0) {
    args.push('--allowedTools', allowedTools.join(','));
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(claudeBin, args, { cwd, env: process.env });

    proc.stdin.write(userPrompt);
    proc.stdin.end();

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`claude exited with code ${code}: ${stderr.slice(0, 500)}`));
      } else {
        resolve(stdout);
      }
    });

    proc.on('error', (err) => reject(err));
  });
}
