# Fix Loading Bug & Add Process-Based Agent Detection

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Get the Phaser game rendering in the VS Code webview, then add system-wide process scanning so external Claude Code sessions appear as pawns in-game.

**Architecture:** Two independent changes sharing no code. Task 1-3 fix the webview rendering pipeline (CSP, Phaser config, tilemap creation). Task 4 adds a `ProcessScanner` class that polls `ps` for agent processes and feeds events into the existing `AgentTracker`. Both use the existing message protocol and pawn manager unchanged.

**Tech Stack:** Phaser 3, VS Code Extension API, Node.js `child_process.exec`, TypeScript

---

### Task 1: Fix CSP and Phaser renderer config

**Files:**
- Modify: `src/extension/webview-provider.ts:124-129` (CSP meta tag)
- Modify: `src/webview/config.ts:7` (renderer type)

**Step 1: Fix CSP to allow Phaser's eval usage**

In `src/extension/webview-provider.ts`, update the Content-Security-Policy. Phaser 3 uses `new Function()` internally for shader compilation. Add `'unsafe-eval'` to `script-src`:

```typescript
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             img-src ${webview.cspSource} ${assetsUri} data: blob:;
             script-src 'nonce-${nonce}' 'unsafe-eval';
             style-src ${webview.cspSource} 'unsafe-inline';
             connect-src ${webview.cspSource};">
```

**Step 2: Change renderer to AUTO**

In `src/webview/config.ts` line 7, change:
```typescript
  type: Phaser.AUTO,
```

This allows Phaser to fall back to Canvas2D if WebGL is unavailable in the webview.

**Step 3: Build and verify no compile errors**

Run: `npm run build`
Expected: Both extension and webview build successfully.

**Step 4: Commit**

```bash
git add src/extension/webview-provider.ts src/webview/config.ts
git commit -m "fix: allow Phaser to render in webview — AUTO renderer, CSP unsafe-eval"
```

---

### Task 2: Replace broken tilemap with sprite-based isometric ground

The current `MapScene.createTilemap()` passes a Tiled JSON object to `this.make.tilemap({ data: mapData })`, but `data` expects a 2D number array, not a JSON object. Rather than fixing the tilemap API usage (the terrain texture is a 1px green square anyway), draw the ground as isometric diamond sprites directly.

**Files:**
- Modify: `src/webview/scenes/boot-scene.ts:64-68` (replace 1px terrain with diamond tile)
- Modify: `src/webview/scenes/boot-scene.ts:217-264` (remove loadMapData and generateFarmMap)
- Modify: `src/webview/scenes/map-scene.ts:62-84` (replace createTilemap with sprite-based ground)

**Step 1: Generate a proper isometric diamond tile in BootScene**

In `src/webview/scenes/boot-scene.ts`, replace the 1px base64 terrain image in `loadPlaceholderAssets()` (line 68) with a canvas-drawn isometric diamond:

```typescript
  private loadPlaceholderAssets() {
    // Terrain tile — isometric diamond
    this.createTerrainPlaceholder();

    // ... rest unchanged (pawn, player, crop, UI, building placeholders)
  }

  private createTerrainPlaceholder() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Green grass diamond
      ctx.fillStyle = '#4a7c3f';
      ctx.beginPath();
      ctx.moveTo(32, 0);   // top
      ctx.lineTo(64, 16);  // right
      ctx.lineTo(32, 32);  // bottom
      ctx.lineTo(0, 16);   // left
      ctx.closePath();
      ctx.fill();

      // Slight highlight on top-left edge
      ctx.strokeStyle = '#5a9c4f';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(32, 1);
      ctx.lineTo(63, 16);
      ctx.stroke();
    }
    this.load.image('terrain-tile', canvas.toDataURL());
  }
```

**Step 2: Remove loadMapData and generateFarmMap from BootScene**

Delete lines 217-264 (`loadMapData()` and `generateFarmMap()` methods) and remove the `this.loadMapData()` call on line 61 in `preload()`.

**Step 3: Replace createTilemap in MapScene with sprite-based ground**

Replace `MapScene.createTilemap()` (lines 62-84) with:

```typescript
  private createTilemap() {
    const gridSize = this.registry.get('gridSize') || 8;

    // Draw isometric ground tiles as sprites
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const pos = gridToScreen(col, row);
        const tile = this.add.image(pos.x, pos.y, 'terrain-tile');
        tile.setDepth(-1);
        tile.setOrigin(0.5, 0.5);
      }
    }

    // Store walkable grid for pathfinding
    const walkableGrid = generateFarmWalkableGrid(gridSize, [], []);
    this.registry.set('walkableGrid', walkableGrid);
  }
```

Also remove the `tilemap` field and `getTilemap()` method since they're no longer used.

**Step 4: Build and verify**

Run: `npm run build`
Expected: Clean build, no errors.

**Step 5: Commit**

```bash
git add src/webview/scenes/boot-scene.ts src/webview/scenes/map-scene.ts
git commit -m "fix: replace broken tilemap with sprite-based isometric ground"
```

---

### Task 3: Verify game loads end-to-end

**Step 1: Launch extension in development host**

Press F5 in VS Code (or Cursor) to launch Extension Development Host.

**Step 2: Open the farm view**

Command Palette → "Token Acres: Open Farm"

**Step 3: Verify rendering**

Expected:
- 8×8 green diamond grid visible
- Player sprite at center (grid 4,4)
- WASD movement works
- HUD shows seeds, season, efficiency
- Day/night overlay present
- No console errors in webview DevTools (Help → Toggle Developer Tools → Console)

**Step 4: Test manual task completion**

Command Palette → "Token Acres: Complete Task (Manual)"
Expected: A pawn spawns on the farm grid.

If anything fails, check the developer console for error messages and fix before proceeding.

---

### Task 4: Create ProcessScanner class

**Files:**
- Create: `src/extension/process-scanner.ts`

**Step 1: Write the ProcessScanner**

```typescript
import { exec } from 'child_process';
import { EventEmitter } from 'events';

interface TrackedProcess {
  pid: number;
  processName: string;
  command: string;
  firstSeen: number;
}

export class ProcessScanner extends EventEmitter {
  private tracked: Map<number, TrackedProcess> = new Map();
  private interval: ReturnType<typeof setInterval> | null = null;
  private patterns: RegExp[];
  private ownPid: number;

  constructor(patterns: RegExp[]) {
    super();
    this.patterns = patterns;
    this.ownPid = process.pid;
  }

  start(pollMs: number = 3000) {
    if (this.interval) return;
    this.scan(); // initial scan
    this.interval = setInterval(() => this.scan(), pollMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private scan() {
    exec('ps ax -o pid=,command=', { maxBuffer: 1024 * 512 }, (err, stdout) => {
      if (err) return;

      const currentPids = new Set<number>();

      for (const line of stdout.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const spaceIdx = trimmed.indexOf(' ');
        if (spaceIdx === -1) continue;

        const pid = parseInt(trimmed.slice(0, spaceIdx), 10);
        const command = trimmed.slice(spaceIdx + 1).trim();

        if (isNaN(pid) || pid === this.ownPid) continue;

        // Match against agent patterns
        const matchedPattern = this.patterns.find(p => p.test(command));
        if (!matchedPattern) continue;

        // Skip VS Code/Electron helper processes — only match CLI agent processes
        if (command.includes('extensionHost') || command.includes('electron')) continue;

        currentPids.add(pid);

        if (!this.tracked.has(pid)) {
          // Extract short process name from matched pattern
          const processName = matchedPattern.source.replace(/[/\\^$*+?.()|[\]{}]/g, '');
          const entry: TrackedProcess = { pid, processName, command, firstSeen: Date.now() };
          this.tracked.set(pid, entry);

          this.emit('agent-started', {
            id: `proc-${pid}`,
            processName,
            startTime: entry.firstSeen,
            pid,
          });
        }
      }

      // Detect departed processes
      for (const [pid, entry] of this.tracked) {
        if (!currentPids.has(pid)) {
          this.tracked.delete(pid);
          const duration = Date.now() - entry.firstSeen;

          this.emit('agent-completed', {
            id: `proc-${pid}`,
            processName: entry.processName,
            duration,
            exitCode: 0,
            outputLength: Math.round((duration / 1000) * 100), // heuristic
            success: true,
          });
        }
      }
    });
  }

  getTrackedProcesses(): TrackedProcess[] {
    return Array.from(this.tracked.values());
  }

  dispose() {
    this.stop();
    this.tracked.clear();
  }
}
```

**Step 2: Build and verify**

Run: `npm run build`
Expected: Clean build.

**Step 3: Commit**

```bash
git add src/extension/process-scanner.ts
git commit -m "feat: add ProcessScanner — polls ps for external agent processes"
```

---

### Task 5: Integrate ProcessScanner into AgentTracker

**Files:**
- Modify: `src/extension/agent-tracker.ts` (add process scanner integration)

**Step 1: Add ProcessScanner as a detection source**

Import and instantiate `ProcessScanner` in `AgentTracker`. Forward its events through the same interface. Dedup by checking if a terminal session already covers the same agent name.

Add to the constructor:

```typescript
import { ProcessScanner } from './process-scanner';

// In AgentTracker class, add field:
private processScanner: ProcessScanner;

// In constructor, after existing setup:
this.processScanner = new ProcessScanner(this.agentPatterns);
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
this.processScanner.start(3000);
```

Update the `cleanup()` method to also dispose the process scanner:

```typescript
cleanup() {
  const sessionIds = Array.from(this.activeSessions.keys());
  sessionIds.forEach(id => this.completeSession(id, 'cleanup'));
  this.processScanner.dispose();
}
```

Update `loadAgentPatterns()` to also refresh the process scanner patterns when config changes:

```typescript
private loadAgentPatterns() {
  const config = vscode.workspace.getConfiguration('tokenacres');
  const patterns = config.get<string[]>('agentPatterns') || ['claude', 'aider', 'cursor-agent', 'copilot'];
  this.agentPatterns = patterns.map(p => new RegExp(p, 'i'));
}
```

(ProcessScanner receives patterns at construction time, so if config changes and a new AgentTracker is created in extension.ts, it'll get the new patterns.)

**Step 2: Build and verify**

Run: `npm run build`
Expected: Clean build.

**Step 3: Commit**

```bash
git add src/extension/agent-tracker.ts
git commit -m "feat: integrate ProcessScanner into AgentTracker for external agent detection"
```

---

### Task 6: Manual end-to-end test

**Step 1: Build and launch**

```bash
npm run build
```
Then press F5 to launch Extension Development Host.

**Step 2: Open farm**

Command Palette → "Token Acres: Open Farm"
Verify: Green isometric grid renders, player visible.

**Step 3: Open an external terminal and run a detectable process**

In a separate terminal (iTerm, Terminal.app), run:
```bash
# Simulate a "claude" process that the scanner will detect
sleep 30 & disown  # won't match
# This will match the 'claude' pattern:
bash -c 'exec -a claude-test sleep 20'
```

Or simply run `claude` if you have Claude Code installed.

**Step 4: Verify pawn spawns**

Within ~3 seconds, a pawn should appear on the farm grid in the webview.

**Step 5: Kill the external process**

Close the external claude process.

**Step 6: Verify pawn goes idle**

Within ~3 seconds, the pawn should transition from 'working' to 'idle' state.

**Step 7: Commit if all tests pass**

```bash
git add -A
git commit -m "docs: add implementation plan for loading fix and process detection"
```
