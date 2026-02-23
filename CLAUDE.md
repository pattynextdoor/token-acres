# Token Acres VS Code Extension

> **AI Agent Farm Game** — Your coding agents tend a pixel farm. Code well, grow well.

## Post-Task Rule

After completing a task (or a full list of tasks), always run:
```
npm run build && npm run package && "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" --install-extension token-acres-*.vsix
```
This installs the latest changes into VS Code. The user just needs to reload the window to see updates.

## What This Is

Token Acres is a VS Code extension that gamifies your AI-assisted coding workflow. When you run AI coding agents (Claude, Aider, Cursor, etc.) in your terminal, they appear as pixel creatures on your farm. Your coding efficiency determines crop quality and farm growth.

**Core Loop:**
1. Run an AI agent in VS Code terminal → Pawn spawns on farm
2. Agent completes task → Pawn works the land, crops advance  
3. Better code quality = better crops = more farm expansion

## Project Structure

```
token-acres/
├── src/
│   ├── extension/           # VS Code extension host (Node.js)
│   │   ├── extension.ts     # Entry point & activation
│   │   ├── agent-tracker.ts # Detects AI agents in terminals
│   │   ├── farm-engine.ts   # Game state machine + economy
│   │   ├── efficiency-scorer.ts # Grades task performance
│   │   ├── persistence.ts   # Save/load farm state
│   │   └── webview-provider.ts # Creates game webview
│   │
│   └── webview/            # Phaser 3 game (browser)
│       ├── main.ts         # Phaser bootstrap
│       ├── config.ts       # Game configuration
│       ├── scenes/         # Game scenes (boot, farm, UI)
│       ├── objects/        # Game objects (pawns, crops, player)
│       ├── systems/        # Game systems (pawn manager, crops)
│       └── utils/          # Isometric math, pathfinding
│
├── assets/                 # Sprites, tilesets, sounds
├── scripts/                # Build scripts (esbuild)
├── package.json           # Extension manifest
└── README.md              # User-facing documentation
```

## Tech Stack

- **Extension Host:** TypeScript + VS Code Extension API
- **Game Engine:** Phaser 3 (WebGL/Canvas)
- **Build System:** ESBuild (fast TypeScript compilation)
- **Art Style:** Pixel art, isometric projection
- **Communication:** postMessage between extension host and webview

## Development Setup

### Prerequisites

- Node.js 18+
- VS Code 1.85+
- Git

### Build & Run

```bash
# Clone and setup
git clone https://github.com/pattynextdoor/token-acres
cd token-acres

# Install dependencies
npm install

# Build extension + webview
npm run build

# Or watch mode for development
npm run watch

# Package for distribution
npm run package
```

### VS Code Development

1. Open project in VS Code
2. Press `F5` to launch Extension Development Host
3. In the new window, open any workspace
4. View → Command Palette → "Token Acres: Open Farm"
5. Run an AI agent: `claude` or `aider` in terminal
6. Watch your pawn spawn! 🐾

### Architecture

The extension operates as two communicating processes:

1. **Extension Host** (Node.js) — Monitors terminals, tracks agent processes, manages farm state
2. **Webview** (Browser) — Renders Phaser 3 game, handles player input, displays farm

Communication happens via VS Code's `postMessage` API with strongly typed message protocols.

## Game Mechanics

### Agent Detection

The extension monitors VS Code integrated terminals for AI agent processes:

- **Process patterns:** `claude`, `aider`, `cursor-agent`, `copilot`, `cline`, `continue`
- **Shell integration:** Uses VS Code 1.93+ command lifecycle APIs when available
- **Manual fallback:** "Complete Task" command for undetectable agents

### Efficiency Scoring

Tasks are graded `S` / `A` / `B` / `C` based on:
- **Output density:** How much code/text the agent produced per second
- **Historical percentile:** Your grade relative to your past performance
- **Success indicators:** Clean exit codes, substantial output

Better grades = more farm actions = faster crop growth.

### Farm Simulation

- **Isometric grid:** 8×8 starting farm (expandable to 16×16)
- **Crop lifecycle:** Plant → Grow (multiple stages) → Harvest → Sell
- **Pawn behavior:** AI agents become farm workers with personality
- **Seasonal calendar:** 7-day seasons with crop rotation

## File Walkthrough

### Core Extension Files

**`src/extension/extension.ts`**  
Entry point. Sets up all systems and registers VS Code hooks.

**`src/extension/agent-tracker.ts`**  
Monitors terminals and processes to detect when AI agents start/stop.

**`src/extension/farm-engine.ts`**  
Game state machine. Handles pawn spawning, crop advancement, economy.

**`src/extension/efficiency-scorer.ts`**  
Grades completed tasks based on output density and historical performance.

**`src/extension/webview-provider.ts`**  
Creates and manages the Phaser game webview panel.

### Core Webview Files

**`src/webview/main.ts`**  
Phaser game bootstrap. Creates game instance with config.

**`src/webview/config.ts`**  
Phaser game configuration. Defines scenes, physics, rendering settings.

**`src/webview/scenes/farm-scene.ts`**  
Main game scene. Loads tilemap, manages pawns/crops/player.

**`src/webview/objects/pawn.ts`**  
AI agent representation. Pathfinding, animation states, work behavior.

**`src/webview/systems/pawn-manager.ts`**  
Spawns and synchronizes pawns with extension host state.

## Build System

### Extension Build (`scripts/build-extension.mjs`)

ESBuild configuration for extension host:
- **Entry:** `src/extension/extension.ts`  
- **Output:** `dist/extension/extension.js`
- **Format:** CommonJS (Node.js)
- **External:** `vscode` module (provided by VS Code)

### Webview Build (`scripts/build-webview.mjs`)

ESBuild configuration for game:
- **Entry:** `src/webview/main.ts`
- **Output:** `dist/webview/main.js`  
- **Format:** IIFE (browser bundle)
- **Target:** Modern browsers (Chrome 91+)

### Development Workflow

```bash
# Watch mode — rebuilds on file changes
npm run watch

# Single build
npm run build

# Type checking only
npm run lint

# Package extension (.vsix file)
npm run package
```

## Key Design Decisions

### Extension Host + Webview Split

VS Code webviews are sandboxed — they can't access Node.js APIs or VS Code Extension APIs directly. This forces a clean separation:

- **Extension Host:** Business logic, file I/O, VS Code integration
- **Webview:** Pure rendering, user input, animations

All communication happens via typed `postMessage` protocols.

### Agent Detection Approach

We detect AI agents primarily through terminal process monitoring:

1. **Terminal name matching:** Many agents set terminal titles
2. **Shell integration:** VS Code 1.93+ provides command lifecycle events
3. **Process tree scanning:** Fallback for complex agent setups

This approach works for 80% of use cases without requiring API keys or agent-specific integrations.

### Efficiency Scoring Without Token Data

Since we can't access most AI APIs directly (privacy, API keys), we estimate efficiency using:

- **Output density:** `characters_produced / duration_seconds`
- **Historical percentile:** Grade relative to user's past performance

This gives meaningful relative scores without needing token counts.

### Isometric Rendering

Phaser 3 doesn't have built-in isometric support, so we implement:

- **Coordinate conversion:** Grid (col, row) ↔ Screen (x, y)  
- **Depth sorting:** Objects sorted by `(col + row)` for correct overlap
- **Pathfinding:** A* on isometric grid with obstacle avoidance

## Performance Considerations

- **60 FPS target:** Game loop optimized for smooth animation
- **Minimal extension host load:** Business logic runs only on events
- **Efficient message passing:** State updates batched, not per-frame
- **Asset optimization:** Sprite sheets, texture atlases, compressed audio

## Testing Strategy

- **Unit tests:** Jest for extension host business logic
- **E2E tests:** VS Code extension test runner
- **Manual testing:** Regression checklist for each release

## Future Roadmap

**v0.2:** Multi-map system (Farm + Town)
**v0.3:** Multiplayer farms (shared state)  
**v0.4:** Advanced customization (skins, accessories)
**v1.0:** Public marketplace release

---

*Happy farming! 🌾*