import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FarmState, PlotState, Season } from './types';

const SAVE_DIR = '.token-acres';
const STATE_FILE = 'farm-state.json';
const SCHEMA_VERSION = 2;

export class PersistenceManager {
  private savePath: string;

  constructor(private context: vscode.ExtensionContext) {
    // Save in user home directory (portable across workspaces)
    const homeDir = os.homedir();
    this.savePath = path.join(homeDir, SAVE_DIR);

    if (!fs.existsSync(this.savePath)) {
      fs.mkdirSync(this.savePath, { recursive: true });
    }
  }

  load(): FarmState {
    const filePath = path.join(this.savePath, STATE_FILE);

    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const state = JSON.parse(raw) as FarmState;

        // Migration check
        if (state.version < SCHEMA_VERSION) {
          return this.migrate(state);
        }

        return state;
      } catch (err) {
        console.error('Token Acres: Failed to load save, starting fresh', err);
        vscode.window.showWarningMessage('Token Acres: Failed to load farm save, starting fresh.');
        return this.createDefaultState();
      }
    }

    return this.createDefaultState();
  }

  save(state: FarmState) {
    try {
      const filePath = path.join(this.savePath, STATE_FILE);

      // Write to temp file first, then rename (atomic write)
      const tmpPath = filePath + '.tmp';
      fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2));
      fs.renameSync(tmpPath, filePath);

      // Backup to VS Code globalState (secondary)
      this.context.globalState.update('tokenacres.farmState', state);
    } catch (err) {
      console.error('Token Acres: Failed to save farm state', err);
    }
  }

  export(): string {
    const state = this.load();
    return JSON.stringify(state, null, 2);
  }

  import(json: string): FarmState {
    try {
      const state = JSON.parse(json) as FarmState;
      // Validate basic structure
      if (!state.version || !state.farm || !state.pawns) {
        throw new Error('Invalid farm state format');
      }
      this.save(state);
      return state;
    } catch (err) {
      throw new Error(`Failed to import farm state: ${err}`);
    }
  }

  private createDefaultState(): FarmState {
    return {
      version: SCHEMA_VERSION,
      farm: {
        gridSize: 8,
        plots: this.generateDefaultPlots(8),
        buildings: [
          { type: 'house', position: { x: 0, y: 0 } },
          { type: 'barn', position: { x: 7, y: 0 } },
          { type: 'well', position: { x: 3, y: 1 } },
          { type: 'storehouse', position: { x: 6, y: 1 } },
        ],
      },
      pawns: [],
      player: {
        position: { x: 4, y: 4 },
        avatar: {
          skinTone: 0,
          hairStyle: 0,
          hairColor: 0,
          outfit: 0,
        },
      },
      economy: {
        seeds: 25, // Start with 25 seeds
        totalEarned: 0,
        totalSpent: 0,
      },
      stats: {
        totalTasksCompleted: 0,
        taskHistory: [],
        lifetimeEfficiency: 0,
        currentSeason: 'spring' as Season,
        seasonStartDate: new Date().toISOString(),
        daysSinceStart: 0,
      },
      settings: {
        seasonLengthDays: 7,
        soundEnabled: false,
        notificationsEnabled: true,
      },
      storehouse: {
        inventory: [],
        capacity: 256,
      },
    };
  }

  private generateDefaultPlots(size: number): PlotState[] {
    const plots: PlotState[] = [];
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        plots.push({
          x,
          y,
          type: (x >= 2 && x <= 5 && y >= 3 && y <= 5) ? 'tilled' : 'empty',
          soilHealth: 80, // Start with healthy soil
        });
      }
    }
    return plots;
  }

  private migrate(state: FarmState): FarmState {
    // Handle schema migrations
    console.log(`Token Acres: Migrating farm state from version ${state.version} to ${SCHEMA_VERSION}`);
    
    // Version 1 -> 2: Add inventory system
    if (state.version < 2) {
      // Add storehouse
      (state as any).storehouse = {
        inventory: [],
        capacity: 256,
      };

      // Add inventory to all pawns
      for (const pawn of state.pawns) {
        (pawn as any).inventory = [];
      }
    }
    
    // Update version
    state.version = SCHEMA_VERSION;
    
    // Add any missing fields with defaults
    if (!state.settings) {
      state.settings = {
        seasonLengthDays: 7,
        soundEnabled: false,
        notificationsEnabled: true,
      };
    }

    if (!state.player.avatar) {
      state.player.avatar = {
        skinTone: 0,
        hairStyle: 0,
        hairColor: 0,
        outfit: 0,
      };
    }

    // Ensure storehouse exists (in case of partial migration)
    if (!(state as any).storehouse) {
      (state as any).storehouse = {
        inventory: [],
        capacity: 256,
      };
    }

    // Ensure all pawns have inventory
    for (const pawn of state.pawns) {
      if (!(pawn as any).inventory) {
        (pawn as any).inventory = [];
      }
    }

    return state;
  }

  /**
   * Get save file location for user reference
   */
  getSaveLocation(): string {
    return path.join(this.savePath, STATE_FILE);
  }

  /**
   * Check if save file exists
   */
  hasSave(): boolean {
    const filePath = path.join(this.savePath, STATE_FILE);
    return fs.existsSync(filePath);
  }

  /**
   * Delete save file (reset farm)
   */
  deleteSave() {
    const filePath = path.join(this.savePath, STATE_FILE);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    this.context.globalState.update('tokenacres.farmState', undefined);
  }

  /**
   * Reset the farm to initial state
   */
  reset(): FarmState {
    this.deleteSave();
    const newState = this.createDefaultState();
    this.save(newState);
    return newState;
  }
}