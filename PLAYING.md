# How to Play Token Acres

Token Acres turns your AI-assisted coding sessions into a farming game. Run AI agents in your VS Code terminal, and pixel farm workers will tend your crops. Code efficiently, and your farm thrives.

## Getting Started

### Installation

1. Install the Token Acres extension in VS Code
2. Open any workspace
3. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
4. Run **"Token Acres: Open Farm"**

Your farm appears in the Explorer sidebar with an 8x8 isometric grid, a house, a barn, and a 4x4 plot of tilled soil ready for planting. You start with **25 seeds** to spend.

### Your First Session

1. Open the farm view (sidebar or Command Palette > "Token Acres: Open Farm")
2. Open a VS Code integrated terminal
3. Run an AI agent: `claude`, `aider`, `copilot`, or any supported agent
4. A pawn spawns on your farm representing the agent
5. When the agent finishes its task, your pawn works the land and crops advance
6. Harvested crops earn you seeds to plant more

That's it. Keep coding with AI agents and your farm grows automatically.

## Controls

| Input | Action |
|-------|--------|
| `W` / `Up Arrow` | Move up-left |
| `A` / `Left Arrow` | Move down-left |
| `S` / `Down Arrow` | Move down-right |
| `D` / `Right Arrow` | Move up-right |
| Click on tile | Move to that tile |
| Mouse wheel | Zoom in/out (0.5x - 2.0x) |
| Right-click drag | Pan camera |
| Hover over crop/plot | Show info tooltip |

## How the Game Works

### Agent Detection

Token Acres watches your VS Code terminals for AI coding agents. The following agents are detected automatically:

- **Claude** (`claude`)
- **Aider** (`aider`)
- **Cursor Agent** (`cursor-agent`)
- **GitHub Copilot** (`copilot`)
- **OpenAI Codex** (`openai`, `codex`)
- **Cline** (`cline`)
- **Continue** (`continue`)

You can customize detected patterns in Settings > Extensions > Token Acres > **Agent Patterns**.

If your agent isn't detected automatically, use **"Token Acres: Complete Task (Manual)"** from the Command Palette to trigger a task completion manually.

### Pawns

When an AI agent starts in your terminal, a pawn spawns on your farm at the barn. Each pawn has:

- **A name** chosen from a pool (Ada, Bob, Cara, Dan, Eva, Finn, etc.)
- **A faction color** (blue, red, purple, or yellow)
- **A mood** that reflects recent task performance

Pawns walk to assigned plots, perform work animations when tasks complete, and wander idly between jobs. After an S-grade task, pawns celebrate.

**Mood indicators:**
- Ecstatic (green) - after S-grade tasks
- Happy (light green) - after A-grade tasks
- Neutral (yellow) - after B-grade tasks
- Tired (red) - after C-grade tasks

### Efficiency Scoring

Every completed task gets graded **S**, **A**, **B**, or **C** based on output density (how much the agent produced relative to how long it ran) compared to your historical performance.

| Grade | Percentile | Farm Actions | Crop Advance |
|-------|-----------|--------------|--------------|
| **S** | Top 10% | 3 actions | 3 stages |
| **A** | Top 40% | 2 actions | 2 stages |
| **B** | Average | 1 action | 1 stage |
| **C** | Below average | 1 action | 1 stage (slow) |

Your first 10 tasks default to B-grade while the system builds your performance history. After that, grades reflect your relative efficiency.

### Crops

Crops are the core of your farm economy. Each crop has a growth lifecycle:

**Plant > Grow (multiple stages) > Harvest > Earn seeds**

#### Available Crops

**Spring crops:**

| Crop | Stages | Base Value | Notes |
|------|--------|------------|-------|
| Turnip | 4 | 5 seeds | Also grows in Fall |
| Potato | 4 | 8 seeds | |
| Strawberry | 5 | 15 seeds | Regrows after harvest |
| Clover | 3 | 2 seeds | Cover crop, also grows in Fall |

**Summer crops:**

| Crop | Stages | Base Value | Notes |
|------|--------|------------|-------|
| Tomato | 5 | 12 seeds | Regrows after harvest |
| Corn | 5 | 14 seeds | |
| Melon | 4 | 20 seeds | Requires 2 tasks per stage |
| Starfruit | 6 | 50 seeds | Requires soil health 70%+ |

**Fall crops:**

| Crop | Stages | Base Value | Notes |
|------|--------|------------|-------|
| Pumpkin | 5 | 30 seeds | Requires 2 tasks per stage |
| Grape | 5 | 18 seeds | Needs trellis support |
| Yam | 4 | 10 seeds | |
| Sunflower | 5 | 12 seeds | Attracts bees |

#### Crop Quality

Crop quality is set when planted, based on your current efficiency:

| Quality | Efficiency | Harvest Multiplier |
|---------|-----------|-------------------|
| **S** | 80%+ | 1.5x value |
| **A** | 60-79% | 1.2x value |
| **B** | 40-59% | 1.0x value |
| **C** | Below 40% | 0.7x value |

#### Golden Crops

S-quality crops have a **5% chance** of becoming golden when they reach maturity. Golden crops are worth **3x their normal value** and display a sparkle effect.

### Seasons

The farm follows a seasonal cycle: **Spring > Summer > Fall > Winter > Spring...**

Each season lasts **7 real days** by default (configurable in settings). When a season changes:

- Crops that don't belong to the new season **wilt and are removed**
- New seasonal crops become available for planting
- Visual lighting changes reflect the current season

Plan your planting around the season calendar to avoid losing crops to wilting.

### Soil Health

Each plot has a soil health percentage that affects your crops:

- **Starting health:** 80%
- **Harvesting** reduces soil by 10 points
- **Natural wilting** restores 5 points
- **Soil below 50%** penalizes crop growth
- **Soil below 30%** reduces sell value by 10%
- **Soil at 80%+** boosts sell value by 20%

Rotate your crops and let plots rest to maintain healthy soil.

### Day/Night Cycle

The farm has a real-time day/night cycle. Lighting shifts throughout the day:

- **Dawn** (6-8 AM) - Orange sunrise transition
- **Daytime** (8 AM - 4 PM) - Full brightness
- **Dusk** (4-6 PM) - Orange sunset transition
- **Night** (8 PM - 6 AM) - Blue overlay with reduced visibility

Lighting colors change with the seasons (warm summers, cool winters).

### Economy

Seeds are your currency:

- **Earn seeds** by harvesting mature crops
- **Spend seeds** to plant new crops (costs ~30% of the crop's base sell value)
- **Starting balance:** 25 seeds

Final harvest value = `base value x quality multiplier x golden bonus (if any) x soil health bonus`

### Git Bonus

Making git commits in your workspace triggers a bonus farm action, giving your crops an extra growth boost.

## Commands

Open these from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command | Description |
|---------|-------------|
| **Token Acres: Open Farm** | Open or focus the farm view |
| **Token Acres: Complete Task (Manual)** | Manually trigger a task completion for undetected agents |
| **Token Acres: Export Farm Save** | Save your farm progress to a JSON file |
| **Token Acres: Import Farm Save** | Load farm progress from a JSON file |

## Status Bar

The bottom-right corner of VS Code shows your current seed count and active pawn count. Click it to open the farm view.

## Settings

Configure Token Acres in VS Code Settings > Extensions > Token Acres:

| Setting | Default | Description |
|---------|---------|-------------|
| **Season Length (Days)** | 7 | Real days per in-game season |
| **Sound Enabled** | Off | Toggle farm ambient sounds |
| **Notifications** | On | Show harvest and event notifications |
| **Agent Patterns** | `claude, aider, cursor-agent, copilot, cline, continue, codex` | Terminal patterns to detect as AI agents |

## Save System

Your farm auto-saves every 60 seconds and when tasks complete. Save data is stored in `~/.token-acres/farm-state.json` and persists across workspaces.

Use the export/import commands to back up your farm or transfer it between machines.

## Tips

- **Keep coding consistently** - Regular AI agent sessions mean steady crop growth
- **Watch the seasons** - Plant crops that match the current season to avoid wilting
- **Aim for S-grades** - Top efficiency unlocks golden crops (3x value) and 3 farm actions per task
- **Manage soil health** - Rotate plots and avoid over-farming a single tile
- **Use manual complete** - If your AI tool isn't auto-detected, the manual command still progresses your farm
- **Check your pawns** - Pawn moods reflect your recent coding performance
