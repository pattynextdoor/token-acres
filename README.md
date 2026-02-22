# 🌾 Token Acres — AI Agent Farm

> **Turn your AI coding agents into pixel farmhands!**

Your AI assistants (Claude, Aider, Cursor, etc.) appear as little workers on your farm. The better you code together, the better your crops grow. A gamified coding companion that makes AI-assisted development more engaging and rewarding.

![Token Acres Farm Screenshot](assets/ui/screenshot.png)

## ✨ Features

- **🤖 Agent Detection:** Automatically detects AI agents running in VS Code terminals
- **🎮 Pixel Art Farm:** Beautiful isometric farm with growing crops and wandering pawns
- **📊 Efficiency Scoring:** Your code quality determines crop growth and farm success
- **🌱 Crop Lifecycle:** Plant seeds, tend crops, harvest rewards
- **🎭 Pawn Personalities:** Each agent becomes a unique farm worker with mood and style
- **🔄 Seasonal Calendar:** 7-day seasons with crop rotation and farm events
- **💾 Persistent Progress:** Your farm saves automatically and grows over time

## 🚀 Quick Start

### Installation

1. Download the `.vsix` file from releases
2. In VS Code: `Ctrl+Shift+P` → "Extensions: Install from VSIX..."
3. Open any workspace and run: `Ctrl+Shift+P` → "Token Acres: Open Farm"
4. Your farm panel will appear in the Explorer sidebar! 🚜

### First Steps

1. **Start an AI agent** in VS Code's integrated terminal:
   ```bash
   claude  # or aider, cursor-agent, copilot, etc.
   ```

2. **Watch your pawn spawn** — A little worker will appear on your farm!

3. **Complete some coding tasks** — Each successful task advances your crops

4. **Harvest and expand** — Sell crops for seeds to plant more and grow your farm

### Supported AI Agents

Token Acres automatically detects these agent patterns in terminal names:
- **Claude** (claude)
- **Aider** (aider) 
- **Cursor Agent** (cursor-agent)
- **GitHub Copilot CLI** (copilot)
- **Cline** (cline)
- **Continue** (continue)
- **OpenAI Codex** (codex)

*Can't see your agent? Use "Token Acres: Complete Task (Manual)" to manually advance your farm.*

## 🎯 How It Works

### The Core Loop

```
Run AI Agent → Pawn Spawns → Complete Task → Crops Grow → Harvest → Expand Farm
```

1. **Agent Detection:** Monitors VS Code terminals for AI agent processes
2. **Efficiency Scoring:** Grades your tasks `S`/`A`/`B`/`C` based on output and speed
3. **Farm Actions:** Better grades = more crop advancement per task
4. **Economy:** Harvest crops → earn seeds → plant more → bigger farm

### Efficiency Grading

Your task performance is scored based on:
- **Output Density:** How much code/text produced per second
- **Historical Performance:** Your grade relative to your past work
- **Success Indicators:** Clean exit codes and substantial output

**Grade Scale:**
- **S-Rank:** 🏆 Top 10% of your performance — crops advance 3 stages
- **A-Rank:** 🥇 Top 40% of your performance — crops advance 2 stages  
- **B-Rank:** 🥈 Average performance — crops advance 1 stage
- **C-Rank:** 🥉 Below average — crops advance 1 stage slowly

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- VS Code 1.85+
- Git

### Building from Source

```bash
# Clone the repository
git clone https://github.com/pattynextdoor/token-acres
cd token-acres

# Install dependencies
npm install

# Build the extension
npm run build

# Or run in watch mode for development
npm run watch

# Package for installation
npm run package  # Creates token-acres-0.1.0.vsix
```

### Development Workflow

1. **Open in VS Code:** Load the project folder
2. **Press F5:** Launches Extension Development Host with your changes
3. **Test in new window:** Open any workspace and activate Token Acres
4. **Make changes:** Edit code, extension reloads automatically in watch mode

### Project Structure

```
token-acres/
├── src/
│   ├── extension/           # Extension host (Node.js)
│   │   ├── extension.ts     # Main entry point
│   │   ├── agent-tracker.ts # Detects AI agents
│   │   ├── farm-engine.ts   # Game logic + state
│   │   └── webview-provider.ts # Game panel
│   │
│   └── webview/            # Phaser 3 game (browser)
│       ├── main.ts         # Game bootstrap
│       ├── scenes/         # Game scenes
│       ├── objects/        # Sprites (pawns, crops)
│       └── systems/        # Game systems
│
├── assets/                 # Art, sounds, tilesets
├── scripts/                # Build configuration
└── package.json           # Extension manifest
```

## ⚙️ Configuration

Access settings via `File > Preferences > Settings > Extensions > Token Acres`:

- **Season Length:** How many real days per in-game season (default: 7)
- **Sound Effects:** Enable/disable farm ambient sounds
- **Notifications:** Show harvest alerts and farm events
- **Agent Patterns:** Customize which process names to detect as agents

## 🤝 Contributing

We'd love your help making Token Acres better!

### Bug Reports
- Use GitHub Issues with detailed reproduction steps
- Include VS Code version, OS, and extension version
- Screenshots of your farm are always helpful! 📸

### Feature Requests
- Check existing issues to avoid duplicates
- Describe the use case and expected behavior
- Consider implementation complexity and scope

### Development
- Follow TypeScript best practices
- Add tests for new features
- Keep commits atomic and descriptive
- Update documentation as needed

## 📝 License

MIT License — See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- **Phaser 3** — Incredible HTML5 game framework
- **Tiny Swords** — Beautiful pixel art assets  
- **VS Code Extension API** — Powerful platform for creative tools
- **The AI coding community** — For inspiring this project

## 🐛 Troubleshooting

### Agent Not Detected
1. Ensure you're using VS Code's **integrated terminal** (not external)
2. Check that your agent command contains a supported pattern (claude, aider, etc.)
3. Try the manual "Complete Task" command as a fallback

### Farm Not Loading
1. Check VS Code Developer Console: `Help > Toggle Developer Tools`
2. Look for JavaScript errors in the Console tab
3. Try reloading the extension: `Ctrl+Shift+P` → "Developer: Reload Window"

### Performance Issues
1. Close other VS Code panels you don't need
2. Reduce farm size in settings if on older hardware
3. Disable sound effects if experiencing audio glitches

---

**Happy farming! May your agents be productive and your crops bountiful!** 🌾✨