import * as vscode from 'vscode';
import { FarmState } from './types';

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'tokenacres.openFarm';
    this.statusBarItem.show();
  }

  update(state: FarmState) {
    const activePawns = state.pawns.filter(p => p.agentSessionId).length;
    const totalPawns = state.pawns.length;
    const seeds = state.economy.seeds;
    
    // Status format: "🌾 25 seeds • 2/5 pawns"
    const seedText = `🌱 ${seeds} seed${seeds !== 1 ? 's' : ''}`;
    const pawnText = activePawns > 0 ? 
      `${activePawns}/${totalPawns} pawn${totalPawns !== 1 ? 's' : ''}` :
      `${totalPawns} pawn${totalPawns !== 1 ? 's' : ''}`;
    
    this.statusBarItem.text = `🌾 ${seedText} • ${pawnText}`;
    
    // Tooltip with more details
    const efficiency = state.stats.lifetimeEfficiency;
    const season = this.capitalizeFirst(state.stats.currentSeason);
    const daysSince = state.stats.daysSinceStart;
    const seasonProgress = Math.round((daysSince / state.settings.seasonLengthDays) * 100);
    
    this.statusBarItem.tooltip = new vscode.MarkdownString(`
**Token Acres Farm**

🌱 **Seeds:** ${seeds}  
👥 **Pawns:** ${activePawns} active, ${totalPawns} total  
📊 **Efficiency:** ${efficiency}%  
🌿 **Season:** ${season} (${seasonProgress}% complete)  
✅ **Tasks:** ${state.stats.totalTasksCompleted} completed  

*Click to open farm view*
    `.trim());
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  dispose() {
    this.statusBarItem.dispose();
  }
}