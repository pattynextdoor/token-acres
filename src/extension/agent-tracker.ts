import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { AgentSession } from './types';
import { ProcessScanner } from './process-scanner';

// Known agent process signatures
const DEFAULT_AGENT_PATTERNS: RegExp[] = [
  /claude/i,
  /aider/i,
  /cursor-agent/i,
  /copilot/i,
  /openai/i,
  /cline/i,
  /continue/i,
  /codex/i,
];

export class AgentTracker extends EventEmitter {
  private activeSessions: Map<string, AgentSession> = new Map();
  private outputTracker: Map<string, number> = new Map();
  private agentPatterns: RegExp[];
  private processScanner: ProcessScanner;

  constructor() {
    super();
    this.loadAgentPatterns();
    this.watchTerminals();
    this.watchProcesses();

    // System process scanning for agents running outside VS Code terminals
    this.processScanner = new ProcessScanner({
      patterns: this.agentPatterns,
      intervalMs: 3000,
    });
    this.processScanner.on('agent-started', (agent) => {
      // Dedup: skip if we already track a terminal session with same process name
      const isDuplicate = Array.from(this.activeSessions.values())
        .some(s => s.processName.toLowerCase() === agent.processName.toLowerCase());
      if (!isDuplicate) {
        this.activeSessions.set(agent.id, {
          id: agent.id,
          processName: agent.processName,
          startTime: agent.startTime,
          outputLength: 0,
        });
        this.emit('agent-started', agent);
      }
    });
    this.processScanner.on('agent-completed', (result) => {
      if (this.activeSessions.has(result.id)) {
        this.activeSessions.delete(result.id);
        this.emit('agent-completed', result);
      }
    });
    this.processScanner.start();
  }

  private loadAgentPatterns() {
    const config = vscode.workspace.getConfiguration('tokenacres');
    const patterns = config.get<string[]>('agentPatterns') || ['claude', 'aider', 'cursor-agent', 'copilot'];
    this.agentPatterns = patterns.map(p => new RegExp(p, 'i'));
  }

  private watchTerminals() {
    // Track terminal creation
    vscode.window.onDidOpenTerminal((terminal) => {
      this.evaluateTerminal(terminal);
    });

    // Track terminal closure
    vscode.window.onDidCloseTerminal((terminal) => {
      const sessionId = this.getSessionIdForTerminal(terminal);
      if (sessionId) {
        this.completeSession(sessionId, 'terminal-closed');
      }
    });

    // Track active terminal changes
    vscode.window.onDidChangeActiveTerminal((terminal) => {
      if (terminal) {
        this.evaluateTerminal(terminal);
      }
    });

    // Evaluate existing terminals
    vscode.window.terminals.forEach(terminal => {
      this.evaluateTerminal(terminal);
    });
  }

  private watchProcesses() {
    // Use shell integration if available (VS Code 1.93+)
    vscode.window.onDidChangeTerminalShellIntegration?.((e) => {
      e.shellIntegration.onDidStartCommand?.((cmd) => {
        if (this.isAgentCommand(cmd.command)) {
          this.startSession(e.terminal, cmd.command);
        }
      });

      e.shellIntegration.onDidEndCommand?.((cmd) => {
        const sessionId = this.getSessionIdForTerminal(e.terminal);
        if (sessionId) {
          this.completeSession(sessionId, 'command-ended', cmd.exitCode);
        }
      });
    });
  }

  private isAgentCommand(command: string): boolean {
    return this.agentPatterns.some(pattern => pattern.test(command));
  }

  private evaluateTerminal(terminal: vscode.Terminal) {
    const name = terminal.name.toLowerCase();
    if (this.agentPatterns.some(pattern => pattern.test(name))) {
      if (!this.getSessionIdForTerminal(terminal)) {
        this.startSession(terminal, name);
      }
    }
  }

  private startSession(terminal: vscode.Terminal, processName: string) {
    const id = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const session: AgentSession = {
      id,
      processName,
      startTime: Date.now(),
      outputLength: 0,
    };

    this.activeSessions.set(id, session);
    this.emit('agent-started', {
      id,
      processName,
      startTime: session.startTime,
      terminal
    });
  }

  private completeSession(sessionId: string, reason: string, exitCode?: number) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const duration = Date.now() - session.startTime;
    this.activeSessions.delete(sessionId);

    // Estimate output length (in absence of direct terminal output capture)
    // Use a heuristic based on duration and success
    const outputLength = this.estimateOutputLength(duration, exitCode);

    this.emit('agent-completed', {
      id: sessionId,
      processName: session.processName,
      duration,
      exitCode,
      outputLength,
      success: exitCode === undefined || exitCode === 0,
    });
  }

  private estimateOutputLength(duration: number, exitCode?: number): number {
    // Heuristic for output estimation when we can't directly capture terminal output
    // Base on duration and success/failure
    const baseDuration = Math.max(duration / 1000, 1); // seconds
    const successMultiplier = (exitCode === undefined || exitCode === 0) ? 1.2 : 0.8;
    
    // Assume ~50-200 chars per second of agent output
    return Math.round(baseDuration * 100 * successMultiplier + Math.random() * 50);
  }

  private getSessionIdForTerminal(terminal: vscode.Terminal): string | undefined {
    for (const [id, session] of this.activeSessions) {
      // Note: We can't directly compare terminals, so we use a workaround
      // In a real implementation, we'd need to track terminals more carefully
      if (session.processName && terminal.name.toLowerCase().includes(session.processName.toLowerCase())) {
        return id;
      }
    }
    return undefined;
  }

  /**
   * Manual task completion for testing/fallback
   */
  manualComplete(complexity: 'small' | 'medium' | 'large' = 'medium') {
    const outputLength = complexity === 'small' ? 50 : complexity === 'medium' ? 150 : 300;
    const duration = complexity === 'small' ? 2000 : complexity === 'medium' ? 5000 : 10000;

    this.emit('agent-completed', {
      id: `manual-${Date.now()}`,
      processName: 'manual',
      duration,
      exitCode: 0,
      outputLength,
      success: true,
      manual: true,
      complexity
    });
  }

  // Public API for typed event handlers
  onAgentStarted(callback: (agent: any) => void) {
    this.on('agent-started', callback);
  }

  onAgentCompleted(callback: (agent: any, result: any) => void) {
    this.on('agent-completed', callback);
  }

  /**
   * Get current active sessions for status display
   */
  getActiveSessions(): AgentSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Force complete all active sessions (for cleanup)
   */
  cleanup() {
    const sessionIds = Array.from(this.activeSessions.keys());
    sessionIds.forEach(id => this.completeSession(id, 'cleanup'));
    this.processScanner.dispose();
  }
}