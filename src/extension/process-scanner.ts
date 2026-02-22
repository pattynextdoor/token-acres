import { EventEmitter } from 'events';
import { execFile } from 'child_process';

/**
 * Metadata for a tracked external agent process.
 */
interface TrackedProcess {
  pid: number;
  processName: string;
  firstSeen: number;
}

/**
 * Configuration options for ProcessScanner.
 */
interface ProcessScannerOptions {
  /** Polling interval in milliseconds (default: 3000) */
  intervalMs?: number;
  /** RegExp patterns to match against process command lines */
  patterns?: RegExp[];
}

/** Default agent process patterns (mirrors AgentTracker defaults). */
const DEFAULT_PATTERNS: RegExp[] = [
  /claude/i,
  /aider/i,
  /cursor-agent/i,
  /copilot/i,
  /openai/i,
  /cline/i,
  /continue/i,
  /codex/i,
];

/**
 * ProcessScanner polls system processes (`ps`) to detect AI agent processes
 * running outside VS Code integrated terminals. It emits the same
 * `agent-started` / `agent-completed` events as AgentTracker so the two
 * can be composed seamlessly.
 *
 * Events:
 *  - `agent-started`   — a new matching PID appeared
 *  - `agent-completed` — a previously tracked PID disappeared
 */
export class ProcessScanner extends EventEmitter {
  private readonly intervalMs: number;
  private readonly patterns: RegExp[];
  private tracked: Map<number, TrackedProcess> = new Map();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(options: ProcessScannerOptions = {}) {
    super();
    this.intervalMs = options.intervalMs ?? 3000;
    this.patterns = options.patterns ?? DEFAULT_PATTERNS;
  }

  // ── public API ──────────────────────────────────────────────

  /** Begin periodic polling. Safe to call multiple times. */
  start(): void {
    if (this.timer) {
      return; // already running
    }
    this.timer = setInterval(() => this.poll(), this.intervalMs);
    // Run an initial poll immediately so callers don't have to wait.
    this.poll();
  }

  /** Stop polling but keep tracked state (can be resumed with `start()`). */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Stop polling and clear all tracked state. */
  dispose(): void {
    this.stop();
    this.tracked.clear();
    this.removeAllListeners();
  }

  /** Return a snapshot of currently tracked processes. */
  getTrackedProcesses(): ReadonlyMap<number, Readonly<TrackedProcess>> {
    return this.tracked;
  }

  // ── internals ───────────────────────────────────────────────

  private poll(): void {
    execFile('ps', ['ax', '-o', 'pid=,command='], (error, stdout) => {
      if (error) {
        // ps failure is non-fatal; we'll retry on the next tick.
        return;
      }
      this.reconcile(stdout);
    });
  }

  /**
   * Compare the current `ps` output with tracked state:
   *  - New matching PIDs  -> emit `agent-started`
   *  - Gone tracked PIDs  -> emit `agent-completed`
   */
  private reconcile(psOutput: string): void {
    const currentPids = this.parsePsOutput(psOutput);

    // Detect new processes
    for (const [pid, processName] of currentPids) {
      if (!this.tracked.has(pid)) {
        const now = Date.now();
        const entry: TrackedProcess = { pid, processName, firstSeen: now };
        this.tracked.set(pid, entry);

        this.emit('agent-started', {
          id: `proc-${pid}`,
          processName,
          startTime: now,
          pid,
        });
      }
    }

    // Detect disappeared processes
    for (const [pid, entry] of this.tracked) {
      if (!currentPids.has(pid)) {
        this.tracked.delete(pid);

        const duration = Date.now() - entry.firstSeen;
        const outputLength = Math.round((duration / 1000) * 100);

        this.emit('agent-completed', {
          id: `proc-${pid}`,
          processName: entry.processName,
          duration,
          exitCode: 0,
          outputLength,
          success: true,
        });
      }
    }
  }

  /**
   * Parse `ps ax -o pid=,command=` output and return a Map of PIDs whose
   * command line matches at least one configured pattern.
   *
   * Filters out:
   *  - The current Node process (`process.pid`)
   *  - VS Code / Electron helper processes (`extensionHost`, `electron`)
   */
  private parsePsOutput(output: string): Map<number, string> {
    const results = new Map<number, string>();
    const ownPid = process.pid;
    const lines = output.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      // Format: "  1234 /usr/bin/node ..."
      const spaceIdx = trimmed.indexOf(' ');
      if (spaceIdx === -1) {
        continue;
      }

      const pidStr = trimmed.slice(0, spaceIdx);
      const command = trimmed.slice(spaceIdx + 1);

      const pid = parseInt(pidStr, 10);
      if (isNaN(pid)) {
        continue;
      }

      // Skip own process
      if (pid === ownPid) {
        continue;
      }

      // Skip VS Code / Electron helper processes
      if (/extensionHost|electron/i.test(command)) {
        continue;
      }

      // Check if command matches any agent pattern
      for (const pattern of this.patterns) {
        if (pattern.test(command)) {
          const processName = this.extractProcessName(pattern);
          results.set(pid, processName);
          break; // first match wins
        }
      }
    }

    return results;
  }

  /**
   * Derive a human-readable process name from a RegExp's source,
   * stripping common regex metacharacters.
   */
  private extractProcessName(pattern: RegExp): string {
    return pattern.source.replace(/[\\^$.*+?()[\]{}|]/g, '');
  }
}
