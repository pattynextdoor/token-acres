// Shared type definitions for Token Acres extension

export type Grade = 'S' | 'A' | 'B' | 'C';
export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type Mood = 'ecstatic' | 'happy' | 'neutral' | 'tired' | 'exhausted';
export type MapId = 'farm' | 'town';
export type CropType = 'turnip' | 'potato' | 'strawberry' | 'clover' 
                     | 'tomato' | 'corn' | 'melon' | 'starfruit'
                     | 'pumpkin' | 'grape' | 'yam' | 'sunflower';

// Inventory types
export interface ItemStack {
  itemId: string;        // e.g. 'turnip_seed', 'turnip', 'strawberry', 'milk'
  quantity: number;      // how many in this stack
  maxStack: number;      // max per stack (from ItemDefinition)
}

export interface FarmState {
  version: number;
  farm: {
    gridSize: number;
    plots: PlotState[];
    buildings: Building[];
  };
  pawns: PawnState[];
  player: PlayerState;
  economy: {
    seeds: number;
    totalEarned: number;
    totalSpent: number;
  };
  stats: {
    totalTasksCompleted: number;
    taskHistory: TaskRecord[];
    lifetimeEfficiency: number;
    currentSeason: Season;
    seasonStartDate: string;
    daysSinceStart: number;
  };
  settings: {
    seasonLengthDays: number;
    soundEnabled: boolean;
    notificationsEnabled: boolean;
  };
  storehouse: {
    inventory: ItemStack[];  // max 256 stacks
    capacity: number;        // 256
  };
}

export interface PlotState {
  x: number;
  y: number;
  type: 'empty' | 'tilled' | 'planted' | 'path' | 'building' | 'water';
  crop?: CropState;
  soilHealth: number;
}

export interface CropState {
  type: CropType;
  stage: number;
  maxStages: number;
  quality: Grade;
  isGolden: boolean;
  tasksUntilNextStage: number;
}

export interface PawnState {
  id: string;
  name: string;
  factionColor: 'blue' | 'red' | 'purple' | 'yellow';
  mood: Mood;
  moodScore: number;
  skin: string;
  accessories: string[];
  trailEffect: string;
  totalTasks: number;
  lifetimeEfficiency: number;
  state: 'idle' | 'walking' | 'working' | 'resting' | 'celebrating';
  position: { x: number; y: number };
  assignedPlot?: { x: number; y: number };
  agentSessionId?: string;
  inventory: ItemStack[];  // max 5 stacks
}

export interface PlayerState {
  position: { x: number; y: number };
  avatar: {
    skinTone: number;
    hairStyle: number;
    hairColor: number;
    outfit: number;
  };
}

export interface Building {
  type: string;
  position: { x: number; y: number };
}

export interface TaskRecord {
  timestamp: number;
  agentId?: string;
  duration: number;
  outputLength?: number;
  linesChanged?: number;
  filesChanged?: number;
  grade: Grade;
  actionsEarned: number;
}

export interface TaskResult {
  duration: number;
  exitCode?: number;
  outputLength: number;
  success: boolean;
  manual?: boolean;
  complexity?: 'small' | 'medium' | 'large';
}

export interface CropConfig {
  seasons: Season[];
  stages: number;
  tasksPerStage: number;
  baseSellValue: number;
  regrows?: number;
  coverCrop?: boolean;
  plotSize?: number;
  minSoilHealth?: number;
  requiresTrellis?: boolean;
  attractsBees?: boolean;
}

export interface AgentSession {
  id: string;
  processName: string;
  startTime: number;
  outputLength: number;
}

export interface FarmEvent {
  type: string;
  message: string;
  timestamp: number;
}

export interface InspectInfo {
  type: 'crop' | 'pawn' | 'plot';
  position: { x: number; y: number };
  data: any;
}

// Message protocol types
export type HostToWebview =
  | { type: 'state-update'; data: FarmState }
  | { type: 'pawn-spawn'; data: PawnState }
  | { type: 'pawn-task-complete'; data: { pawnId: string; grade: Grade; plot: { x: number; y: number } } }
  | { type: 'crop-harvested'; data: { plot: { x: number; y: number }; cropType: CropType; value: number; isGolden: boolean } }
  | { type: 'season-change'; data: { season: Season } }
  | { type: 'event'; data: FarmEvent }
  | { type: 'inspect-result'; data: InspectInfo }
  | { type: 'storehouse-update'; data: { inventory: ItemStack[] } }
  | { type: 'pawn-inventory-update'; data: { pawnId: string; inventory: ItemStack[] } };

export type WebviewToHost =
  | { type: 'ready'; mapId?: MapId }
  | { type: 'player-move'; position: { x: number; y: number } }
  | { type: 'inspect'; target: { type: 'crop' | 'pawn' | 'plot'; x: number; y: number } }
  | { type: 'plant'; plot: { x: number; y: number }; cropType: CropType }
  | { type: 'sell'; cropType: CropType; quantity: number }
  | { type: 'buy-upgrade'; upgradeType: string }
  | { type: 'rename-pawn'; pawnId: string; name: string }
  | { type: 'map-change'; mapId: MapId };

export const CROP_DATA: Record<CropType, CropConfig> = {
  turnip:     { seasons: ['spring', 'fall'], stages: 4, tasksPerStage: 1, baseSellValue: 5 },
  potato:     { seasons: ['spring'], stages: 4, tasksPerStage: 1, baseSellValue: 8 },
  strawberry: { seasons: ['spring'], stages: 5, tasksPerStage: 1, baseSellValue: 15, regrows: 1 },
  clover:     { seasons: ['spring', 'fall'], stages: 3, tasksPerStage: 1, baseSellValue: 2, coverCrop: true },
  tomato:     { seasons: ['summer'], stages: 5, tasksPerStage: 1, baseSellValue: 12, regrows: 1 },
  corn:       { seasons: ['summer'], stages: 5, tasksPerStage: 1, baseSellValue: 14 },
  melon:      { seasons: ['summer'], stages: 4, tasksPerStage: 2, baseSellValue: 20, plotSize: 2 },
  starfruit:  { seasons: ['summer'], stages: 6, tasksPerStage: 2, baseSellValue: 50, minSoilHealth: 70 },
  pumpkin:    { seasons: ['fall'], stages: 5, tasksPerStage: 2, baseSellValue: 30, plotSize: 3 },
  grape:      { seasons: ['fall'], stages: 5, tasksPerStage: 2, baseSellValue: 18, requiresTrellis: true },
  yam:        { seasons: ['fall'], stages: 4, tasksPerStage: 1, baseSellValue: 10 },
  sunflower:  { seasons: ['fall'], stages: 5, tasksPerStage: 1, baseSellValue: 12, attractsBees: true },
};