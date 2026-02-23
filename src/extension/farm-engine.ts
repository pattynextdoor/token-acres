import { EventEmitter } from 'events';
import { EfficiencyScorer } from './efficiency-scorer';
import { 
  FarmState, 
  PawnState, 
  PlotState, 
  CropState, 
  TaskResult, 
  TaskRecord, 
  Grade, 
  Mood, 
  Season, 
  CropType,
  ItemStack,
  CROP_DATA 
} from './types';
import { InventoryManager } from './inventory';
import { cropToHarvestItem, createItemStack } from './item-registry';

export class FarmEngine extends EventEmitter {
  private state: FarmState;
  private scorer: EfficiencyScorer;
  private factionColors: Array<'blue' | 'red' | 'purple' | 'yellow'> = ['blue', 'red', 'purple', 'yellow'];
  private namePool: string[] = [
    'Ada', 'Bob', 'Cara', 'Dan', 'Eva', 'Finn', 'Gwen', 'Hal',
    'Ivy', 'Jack', 'Kate', 'Leo', 'Mia', 'Neo', 'Ora', 'Pike',
    'Quinn', 'Rex', 'Sam', 'Tess', 'Uma', 'Vex', 'Wade', 'Zoe'
  ];

  constructor(initialState: FarmState) {
    super();
    this.state = initialState;
    this.scorer = new EfficiencyScorer(this.state.stats.taskHistory);
    this.updateSeason();
  }

  /**
   * Called when an agent process starts.
   * Spawns a new Pawn or reactivates an existing idle one.
   */
  spawnPawn(agent: { id: string; processName: string }): PawnState {
    // Reuse idle pawn if one exists
    const idlePawn = this.state.pawns.find(p => 
      p.state === 'idle' && !p.agentSessionId
    );

    if (idlePawn) {
      idlePawn.agentSessionId = agent.id;
      idlePawn.state = 'walking';
      this.emit('pawn-activated', idlePawn);
      return idlePawn;
    }

    // Create new pawn
    const pawn: PawnState = {
      id: `pawn-${Date.now()}`,
      name: this.generateName(),
      factionColor: this.nextFactionColor(),
      mood: 'neutral',
      moodScore: 50,
      skin: 'default',
      accessories: [],
      trailEffect: 'none',
      totalTasks: 0,
      lifetimeEfficiency: 0,
      state: 'walking',
      position: this.getBarnPosition(),
      agentSessionId: agent.id,
      inventory: [], // Empty inventory for new pawn
    };

    this.state.pawns.push(pawn);
    this.emit('pawn-spawned', pawn);
    return pawn;
  }

  /**
   * Called when an agent task completes.
   * Scores efficiency, earns farm actions, advances crops, updates pawn.
   */
  completeTask(agent: any, result: any): { grade: Grade; actionsEarned: number; seedsEarned: number } {
    const taskResult: TaskResult = {
      duration: result.duration || 5000,
      exitCode: result.exitCode,
      outputLength: result.outputLength || 100,
      success: result.success !== false,
      manual: result.manual,
      complexity: result.complexity,
    };

    const grade = this.scorer.score(taskResult);
    const actionsEarned = this.gradeToActions(grade);

    // Record task
    const record: TaskRecord = {
      timestamp: Date.now(),
      agentId: agent?.id,
      duration: taskResult.duration,
      outputLength: taskResult.outputLength,
      grade,
      actionsEarned,
    };

    this.state.stats.taskHistory.push(record);
    if (this.state.stats.taskHistory.length > 50) {
      this.state.stats.taskHistory.shift(); // Rolling window
    }
    this.state.stats.totalTasksCompleted++;
    this.scorer.addRecord(record);

    // Update pawn
    const pawn = this.state.pawns.find(p => p.agentSessionId === agent?.id);
    if (pawn) {
      pawn.totalTasks++;
      pawn.state = grade === 'S' ? 'celebrating' : 'working';
      pawn.mood = this.gradeToMood(grade);
      pawn.lifetimeEfficiency = this.calculatePawnEfficiency(pawn);
      
      // Assign pawn to a plot for work animation
      const workPlot = this.findPlotForWork();
      if (workPlot) {
        pawn.assignedPlot = { x: workPlot.x, y: workPlot.y };
      }

      // Free the pawn after work animation
      setTimeout(() => {
        if (pawn.agentSessionId === agent?.id) {
          pawn.agentSessionId = undefined;
          pawn.state = 'idle';
          pawn.assignedPlot = undefined;
        }
      }, 3000);
    }

    // Advance all planted crops
    this.advanceCrops(actionsEarned);

    // Process harvests
    const seedsEarned = this.processHarvests();

    // Auto-plant logic: find idle pawn and empty tilled plot
    this.performAutoPlanting();

    // Update lifetime efficiency
    this.state.stats.lifetimeEfficiency = this.scorer.getCurrentEfficiency();

    this.emit('task-completed', { pawn, grade, actionsEarned, seedsEarned });
    
    return { grade, actionsEarned, seedsEarned };
  }

  /**
   * Advance all planted crops by N steps.
   */
  private advanceCrops(steps: number) {
    for (const plot of this.state.farm.plots) {
      if (plot.type === 'planted' && plot.crop) {
        const crop = plot.crop;
        const soilPenalty = plot.soilHealth < 50 ? 1 : 0;
        
        crop.tasksUntilNextStage -= steps;

        while (crop.tasksUntilNextStage <= 0 && crop.stage < crop.maxStages) {
          crop.stage++;
          
          if (crop.stage < crop.maxStages) {
            const baseTasks = CROP_DATA[crop.type].tasksPerStage;
            crop.tasksUntilNextStage += baseTasks + soilPenalty;
          }

          // Check for golden crop chance (5% for S-tier quality)
          if (crop.stage === crop.maxStages && crop.quality === 'S' && Math.random() < 0.05) {
            crop.isGolden = true;
          }
        }
      }
    }
  }

  /**
   * Harvest ready crops and add to storehouse inventory.
   */
  private processHarvests(): number {
    let totalSeeds = 0;
    const harvestedPlots: PlotState[] = [];

    for (const plot of this.state.farm.plots) {
      if (plot.type === 'planted' && plot.crop && plot.crop.stage >= plot.crop.maxStages) {
        const crop = plot.crop;
        
        // Determine harvest item and quantity
        const harvestItemId = cropToHarvestItem(crop.type, crop.isGolden);
        const harvestQuantity = this.calculateHarvestQuantity(crop, plot.soilHealth);
        
        // Add harvested items to storehouse
        if (harvestQuantity > 0) {
          this.addToStorehouse(harvestItemId, harvestQuantity);
        }

        // Calculate seed value for tracking (economy stats)
        const sellValue = this.calculateSellValue(crop, plot.soilHealth);
        totalSeeds += sellValue;

        // Degrade soil health from harvest
        plot.soilHealth = Math.max(0, plot.soilHealth - 10);

        // Check if crop regrows
        const cropData = CROP_DATA[crop.type];
        if (cropData.regrows && cropData.regrows > 0) {
          crop.stage = cropData.stages - cropData.regrows;
          crop.tasksUntilNextStage = cropData.tasksPerStage;
          crop.isGolden = false; // Reset golden status
        } else {
          // Remove crop and return to tilled state
          plot.crop = undefined;
          plot.type = 'tilled';
        }

        harvestedPlots.push(plot);
      }
    }

    if (totalSeeds > 0) {
      // For now, still award seeds for backwards compatibility
      // In the future, selling system will convert items to seeds
      this.state.economy.seeds += totalSeeds;
      this.state.economy.totalEarned += totalSeeds;
      this.emit('crops-harvested', { plots: harvestedPlots, seedsEarned: totalSeeds });
    }

    return totalSeeds;
  }

  /**
   * Plant a crop on a tilled plot.
   */
  plantCrop(plotX: number, plotY: number, cropType: CropType): boolean {
    const plot = this.getPlot(plotX, plotY);
    if (!plot || plot.type !== 'tilled') {
      return false;
    }

    // Check if crop is in season
    if (!this.isInSeason(cropType, this.state.stats.currentSeason)) {
      return false;
    }

    const cropData = CROP_DATA[cropType];
    const seedCost = Math.ceil(cropData.baseSellValue * 0.3); // Seeds cost ~30% of sell value

    if (this.state.economy.seeds < seedCost) {
      return false;
    }

    // Deduct seed cost
    this.state.economy.seeds -= seedCost;
    this.state.economy.totalSpent += seedCost;

    // Create crop with quality based on current efficiency
    const efficiency = this.scorer.getCurrentEfficiency();
    const quality: Grade = efficiency >= 80 ? 'S' : efficiency >= 60 ? 'A' : efficiency >= 40 ? 'B' : 'C';

    plot.type = 'planted';
    plot.crop = {
      type: cropType,
      stage: 0,
      maxStages: cropData.stages,
      quality,
      isGolden: false,
      tasksUntilNextStage: cropData.tasksPerStage,
    };

    this.emit('crop-planted', { plot, cropType, quality });
    return true;
  }

  /**
   * Update season based on elapsed time.
   */
  updateSeason() {
    const start = new Date(this.state.stats.seasonStartDate);
    const now = new Date();
    const daysPassed = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
    const seasonLength = this.state.settings.seasonLengthDays;

    this.state.stats.daysSinceStart = daysPassed;

    if (daysPassed >= seasonLength) {
      const seasons: Season[] = ['spring', 'summer', 'fall', 'winter'];
      const currentIdx = seasons.indexOf(this.state.stats.currentSeason);
      const newSeason = seasons[(currentIdx + 1) % 4];
      
      this.state.stats.currentSeason = newSeason;
      this.state.stats.seasonStartDate = now.toISOString();

      // Wilt out-of-season crops
      for (const plot of this.state.farm.plots) {
        if (plot.crop && !this.isInSeason(plot.crop.type, newSeason)) {
          plot.crop = undefined;
          plot.type = 'tilled';
          // Slightly restore soil when crops wilt naturally
          plot.soilHealth = Math.min(100, plot.soilHealth + 5);
        }
      }

      this.emit('season-changed', { season: newSeason, daysPassed: 0 });
    }
  }

  /**
   * Handle git events (bonus farm actions).
   */
  onGitEvent(repo: any) {
    // Simple bonus: each commit gives 1 extra farm action
    this.advanceCrops(1);
    this.processHarvests();
    this.emit('git-bonus', { actionsEarned: 1 });
  }

  /**
   * Update player position (for webview sync).
   */
  updatePlayerPosition(position: { x: number; y: number }) {
    this.state.player.position = position;
  }

  /**
   * Inspect a plot/pawn for tooltip info.
   */
  inspect(target: { type: 'crop' | 'pawn' | 'plot'; x: number; y: number }): any {
    if (target.type === 'crop' || target.type === 'plot') {
      const plot = this.getPlot(target.x, target.y);
      if (!plot) return null;

      if (plot.crop) {
        const cropData = CROP_DATA[plot.crop.type];
        return {
          type: 'crop',
          position: { x: target.x, y: target.y },
          data: {
            cropType: plot.crop.type,
            stage: plot.crop.stage,
            maxStages: plot.crop.maxStages,
            quality: plot.crop.quality,
            isGolden: plot.crop.isGolden,
            tasksUntilNext: plot.crop.tasksUntilNextStage,
            sellValue: plot.crop.stage >= plot.crop.maxStages ? 
                      this.calculateSellValue(plot.crop, plot.soilHealth) : null,
            soilHealth: plot.soilHealth,
          }
        };
      } else {
        return {
          type: 'plot',
          position: { x: target.x, y: target.y },
          data: {
            plotType: plot.type,
            soilHealth: plot.soilHealth,
          }
        };
      }
    }

    return null;
  }

  // ===== INVENTORY OPERATIONS =====

  /**
   * Add items to storehouse
   */
  addToStorehouse(itemId: string, quantity: number): boolean {
    const result = InventoryManager.addItem(
      this.state.storehouse.inventory, 
      itemId, 
      quantity, 
      this.state.storehouse.capacity
    );
    
    if (result.processed > 0) {
      this.emit('storehouse-update', { inventory: this.state.storehouse.inventory });
    }

    return result.success;
  }

  /**
   * Remove items from storehouse
   */
  removeFromStorehouse(itemId: string, quantity: number): boolean {
    const result = InventoryManager.removeItem(
      this.state.storehouse.inventory, 
      itemId, 
      quantity
    );

    if (result.processed > 0) {
      this.emit('storehouse-update', { inventory: this.state.storehouse.inventory });
    }

    return result.success;
  }

  /**
   * Get count of items in storehouse
   */
  getStorehouseCount(itemId: string): number {
    return InventoryManager.getCount(this.state.storehouse.inventory, itemId);
  }

  /**
   * Pawn picks up items (direct to inventory)
   */
  pawnPickup(pawnId: string, itemId: string, quantity: number): boolean {
    const pawn = this.state.pawns.find(p => p.id === pawnId);
    if (!pawn) return false;

    const result = InventoryManager.addItem(pawn.inventory, itemId, quantity, 5);
    
    if (result.processed > 0) {
      this.emit('pawn-inventory-update', { pawnId, inventory: pawn.inventory });
    }

    return result.success;
  }

  /**
   * Pawn deposits items (direct from inventory)
   */
  pawnDeposit(pawnId: string, itemId: string, quantity: number): boolean {
    const pawn = this.state.pawns.find(p => p.id === pawnId);
    if (!pawn) return false;

    const result = InventoryManager.removeItem(pawn.inventory, itemId, quantity);
    
    if (result.processed > 0) {
      this.emit('pawn-inventory-update', { pawnId, inventory: pawn.inventory });
    }

    return result.success;
  }

  /**
   * Pawn deposits all items to storehouse
   */
  pawnDepositAll(pawnId: string): void {
    const pawn = this.state.pawns.find(p => p.id === pawnId);
    if (!pawn) return;

    const uniqueItems = InventoryManager.getUniqueItems(pawn.inventory);
    let hasDeposited = false;

    for (const itemId of uniqueItems) {
      const quantity = InventoryManager.getCount(pawn.inventory, itemId);
      if (quantity > 0) {
        const transferred = this.transferToStorehouse(pawnId, itemId, quantity);
        if (transferred) {
          hasDeposited = true;
        }
      }
    }

    if (hasDeposited) {
      this.emit('pawn-inventory-update', { pawnId, inventory: pawn.inventory });
      this.emit('storehouse-update', { inventory: this.state.storehouse.inventory });
    }
  }

  /**
   * Transfer items from pawn to storehouse
   */
  transferToStorehouse(pawnId: string, itemId: string, quantity: number): boolean {
    const pawn = this.state.pawns.find(p => p.id === pawnId);
    if (!pawn) return false;

    const result = InventoryManager.transfer(
      pawn.inventory,
      this.state.storehouse.inventory,
      itemId,
      quantity,
      this.state.storehouse.capacity
    );

    if (result.processed > 0) {
      this.emit('pawn-inventory-update', { pawnId, inventory: pawn.inventory });
      this.emit('storehouse-update', { inventory: this.state.storehouse.inventory });
    }

    return result.success;
  }

  /**
   * Withdraw items from storehouse to pawn
   */
  withdrawFromStorehouse(pawnId: string, itemId: string, quantity: number): boolean {
    const pawn = this.state.pawns.find(p => p.id === pawnId);
    if (!pawn) return false;

    const result = InventoryManager.transfer(
      this.state.storehouse.inventory,
      pawn.inventory,
      itemId,
      quantity,
      5 // Pawn inventory max slots
    );

    if (result.processed > 0) {
      this.emit('storehouse-update', { inventory: this.state.storehouse.inventory });
      this.emit('pawn-inventory-update', { pawnId, inventory: pawn.inventory });
    }

    return result.success;
  }

  /**
   * Get storehouse inventory
   */
  getStorehouseInventory(): ItemStack[] {
    return [...this.state.storehouse.inventory]; // Return copy
  }

  /**
   * Get pawn inventory
   */
  getPawnInventory(pawnId: string): ItemStack[] {
    const pawn = this.state.pawns.find(p => p.id === pawnId);
    return pawn ? [...pawn.inventory] : []; // Return copy
  }

  /**
   * Check if storehouse can accept items
   */
  canStorehouseAccept(itemId: string, quantity: number): boolean {
    return InventoryManager.hasSpace(
      this.state.storehouse.inventory,
      itemId,
      quantity,
      this.state.storehouse.capacity
    );
  }

  /**
   * Check if pawn can carry items
   */
  canPawnCarry(pawnId: string, itemId: string, quantity: number): boolean {
    const pawn = this.state.pawns.find(p => p.id === pawnId);
    if (!pawn) return false;

    return InventoryManager.hasSpace(pawn.inventory, itemId, quantity, 5);
  }

  // Helper methods
  private calculateHarvestQuantity(crop: CropState, soilHealth: number): number {
    // Base quantity is 1, can be improved with quality and soil health
    let quantity = 1;

    // Quality bonus
    switch (crop.quality) {
      case 'S': quantity += 1; break; // 2 items
      case 'A': quantity += 0.5; break; // 1.5 items (rounded)
      // B and C stay at 1
    }

    // Soil health bonus
    if (soilHealth >= 80) {
      quantity += 0.5;
    } else if (soilHealth < 30) {
      quantity = Math.max(1, quantity - 0.5);
    }

    // Golden crops give more
    if (crop.isGolden) {
      quantity *= 1.5;
    }

    return Math.floor(Math.max(1, quantity));
  }

  private gradeToActions(grade: Grade): number {
    switch (grade) {
      case 'S': return 3;
      case 'A': return 2;
      case 'B': return 1;
      case 'C': return 1;
      default: return 1;
    }
  }

  private gradeToMood(grade: Grade): Mood {
    switch (grade) {
      case 'S': return 'ecstatic';
      case 'A': return 'happy';
      case 'B': return 'neutral';
      case 'C': return 'tired';
      default: return 'neutral';
    }
  }

  private calculateSellValue(crop: CropState, soilHealth: number): number {
    const baseValue = CROP_DATA[crop.type].baseSellValue;
    let value = baseValue;

    // Quality multiplier
    switch (crop.quality) {
      case 'S': value *= 1.5; break;
      case 'A': value *= 1.2; break;
      case 'B': value *= 1.0; break;
      case 'C': value *= 0.7; break;
    }

    // Golden multiplier
    if (crop.isGolden) value *= 3;

    // Soil health bonus
    if (soilHealth >= 80) value *= 1.2;
    else if (soilHealth < 30) value *= 0.8;

    return Math.round(value);
  }

  private calculatePawnEfficiency(pawn: PawnState): number {
    if (pawn.totalTasks === 0) return 50;
    
    // Simple efficiency based on recent performance
    // In a fuller implementation, we'd track per-pawn task history
    return this.scorer.getCurrentEfficiency();
  }

  private isInSeason(cropType: CropType, season: Season): boolean {
    return CROP_DATA[cropType].seasons.includes(season);
  }

  private generateName(): string {
    const usedNames = this.state.pawns.map(p => p.name);
    const availableNames = this.namePool.filter(name => !usedNames.includes(name));
    
    if (availableNames.length === 0) {
      // All names used, generate procedural name
      return `Pawn${this.state.pawns.length + 1}`;
    }
    
    return availableNames[Math.floor(Math.random() * availableNames.length)];
  }

  private nextFactionColor(): 'blue' | 'red' | 'purple' | 'yellow' {
    const colorCounts = { blue: 0, red: 0, purple: 0, yellow: 0 };
    this.state.pawns.forEach(p => colorCounts[p.factionColor]++);
    
    // Return least used color
    return Object.keys(colorCounts).reduce((a, b) => 
      colorCounts[a as keyof typeof colorCounts] <= colorCounts[b as keyof typeof colorCounts] ? a : b
    ) as 'blue' | 'red' | 'purple' | 'yellow';
  }

  private getBarnPosition(): { x: number; y: number } {
    const barn = this.state.farm.buildings.find(b => b.type === 'barn');
    return barn ? barn.position : { x: 7, y: 0 };
  }

  private findPlotForWork(): PlotState | null {
    // Find a planted plot that needs attention, or a tilled plot for planting
    const workablePlots = this.state.farm.plots.filter(p => 
      p.type === 'planted' || p.type === 'tilled'
    );
    
    if (workablePlots.length === 0) return null;
    return workablePlots[Math.floor(Math.random() * workablePlots.length)];
  }

  private getPlot(x: number, y: number): PlotState | null {
    return this.state.farm.plots.find(p => p.x === x && p.y === y) || null;
  }

  /**
   * Auto-planting: find idle pawn and empty tilled plot, then plant best available crop
   */
  private performAutoPlanting() {
    // Find idle pawn (not assigned to agent session)
    const idlePawn = this.state.pawns.find(p => 
      p.state === 'idle' && !p.agentSessionId
    );
    
    if (!idlePawn) return;

    // Find empty tilled plot
    const emptyPlot = this.state.farm.plots.find(p => 
      p.type === 'tilled' && !p.crop && p.soilHealth > 20
    );
    
    if (!emptyPlot) return;

    // Determine best crop for current season
    const currentSeason = this.state.stats.currentSeason;
    const availableCrops = Object.entries(CROP_DATA)
      .filter(([type, data]) => data.seasons.includes(currentSeason))
      .sort((a, b) => a[1].baseSellValue - b[1].baseSellValue); // Sort by value (cheapest first for reliability)

    if (availableCrops.length === 0) return;

    // Default to turnip (or first available crop)
    const cropToPlant = availableCrops.find(([type]) => type === 'turnip')?.[0] || availableCrops[0][0];
    
    // Plant the crop (free planting as per PRD)
    this.plantCropFree(emptyPlot.x, emptyPlot.y, cropToPlant as CropType, idlePawn);
  }

  /**
   * Plant a crop for free (auto-planting doesn't cost seeds)
   */
  private plantCropFree(plotX: number, plotY: number, cropType: CropType, pawn?: PawnState): boolean {
    const plot = this.getPlot(plotX, plotY);
    if (!plot || plot.type !== 'tilled') {
      return false;
    }

    // Check if crop is in season
    if (!this.isInSeason(cropType, this.state.stats.currentSeason)) {
      return false;
    }

    const cropData = CROP_DATA[cropType];

    // Create crop with quality based on current efficiency and soil health
    const efficiency = this.scorer.getCurrentEfficiency();
    const soilBonus = plot.soilHealth > 70 ? 10 : plot.soilHealth < 30 ? -20 : 0;
    const adjustedEfficiency = Math.max(0, Math.min(100, efficiency + soilBonus));
    
    const quality: Grade = adjustedEfficiency >= 80 ? 'S' : 
                          adjustedEfficiency >= 60 ? 'A' : 
                          adjustedEfficiency >= 40 ? 'B' : 'C';

    plot.type = 'planted';
    plot.crop = {
      type: cropType,
      stage: 0,
      maxStages: cropData.stages,
      quality,
      isGolden: false,
      tasksUntilNextStage: cropData.tasksPerStage,
    };

    // Degrade soil slightly from planting
    plot.soilHealth = Math.max(0, plot.soilHealth - 5);

    // Assign pawn to this plot for visual work animation
    if (pawn) {
      pawn.assignedPlot = { x: plotX, y: plotY };
      pawn.state = 'walking';
      
      // Auto-return pawn to idle after animation
      setTimeout(() => {
        if (pawn.assignedPlot?.x === plotX && pawn.assignedPlot?.y === plotY) {
          pawn.assignedPlot = undefined;
          pawn.state = 'idle';
        }
      }, 2000);
    }

    this.emit('crop-planted', { plot, cropType, quality, automatic: true });
    return true;
  }

  // Public API
  getState(): FarmState {
    return this.state;
  }

  getPawnCount(): number {
    return this.state.pawns.length;
  }

  getActivePawnCount(): number {
    return this.state.pawns.filter(p => p.agentSessionId).length;
  }

  getSeedCount(): number {
    return this.state.economy.seeds;
  }

  /**
   * Pawn withdraws seeds from storehouse
   */
  pawnWithdrawSeeds(pawnId: string, maxSeeds: number): boolean {
    const pawn = this.state.pawns.find(p => p.id === pawnId);
    if (!pawn) return false;

    // Find available seed types in storehouse
    const availableSeeds = this.state.storehouse.inventory.filter(stack => 
      stack.itemId.endsWith('_seed') && stack.quantity > 0
    );

    if (availableSeeds.length === 0) return false;

    let seedsWithdrawn = 0;
    for (const seedStack of availableSeeds.slice(0, maxSeeds)) {
      if (seedsWithdrawn >= maxSeeds) break;

      // Withdraw 2-4 seeds of this type
      const withdrawAmount = Math.min(seedStack.quantity, 2 + Math.floor(Math.random() * 3));
      
      const result = InventoryManager.transfer(
        this.state.storehouse.inventory,
        pawn.inventory,
        seedStack.itemId,
        withdrawAmount,
        5 // Pawn inventory max slots
      );

      if (result.processed > 0) {
        seedsWithdrawn++;
        this.emit('storehouse-update', { inventory: this.state.storehouse.inventory });
        this.emit('pawn-inventory-update', { pawnId, inventory: pawn.inventory });
      }
    }

    console.log(`Pawn ${pawnId} withdrew ${seedsWithdrawn} seed types from storehouse`);
    return seedsWithdrawn > 0;
  }

  /**
   * Pawn plants seed at specific position (from pawn inventory)
   */
  pawnPlantSeed(pawnId: string, plotX: number, plotY: number, seedItemId?: string): boolean {
    const pawn = this.state.pawns.find(p => p.id === pawnId);
    if (!pawn) return false;

    const plot = this.getPlot(plotX, plotY);
    if (!plot || plot.type !== 'tilled') return false;

    // Find seed to plant
    let seedToUse: string;
    if (seedItemId) {
      // Use specified seed if pawn has it
      const hasSpecificSeed = InventoryManager.getCount(pawn.inventory, seedItemId) > 0;
      if (!hasSpecificSeed) return false;
      seedToUse = seedItemId;
    } else {
      // Use any available seed
      const availableSeeds = pawn.inventory.filter(stack => 
        stack.itemId.endsWith('_seed') && stack.quantity > 0
      );
      if (availableSeeds.length === 0) return false;
      seedToUse = availableSeeds[0].itemId;
    }

    // Convert seed item to crop type
    const cropType = this.seedToCropType(seedToUse);
    if (!cropType) return false;

    // Check if crop is in season
    if (!this.isInSeason(cropType, this.state.stats.currentSeason)) {
      return false;
    }

    // Remove seed from pawn inventory
    const removeResult = InventoryManager.removeItem(pawn.inventory, seedToUse, 1);
    if (!removeResult.success) return false;

    // Plant the crop (similar to plantCrop but free)
    const cropData = CROP_DATA[cropType];
    const efficiency = this.scorer.getCurrentEfficiency();
    const soilBonus = plot.soilHealth > 70 ? 10 : plot.soilHealth < 30 ? -20 : 0;
    const adjustedEfficiency = Math.max(0, Math.min(100, efficiency + soilBonus));
    
    const quality: Grade = adjustedEfficiency >= 80 ? 'S' : 
                          adjustedEfficiency >= 60 ? 'A' : 
                          adjustedEfficiency >= 40 ? 'B' : 'C';

    plot.type = 'planted';
    plot.crop = {
      type: cropType,
      stage: 0,
      maxStages: cropData.stages,
      quality,
      isGolden: false,
      tasksUntilNextStage: cropData.tasksPerStage,
    };

    // Degrade soil slightly from planting
    plot.soilHealth = Math.max(0, plot.soilHealth - 5);

    // Assign pawn to this plot for visual work animation
    pawn.assignedPlot = { x: plotX, y: plotY };
    pawn.state = 'working';

    this.emit('pawn-inventory-update', { pawnId, inventory: pawn.inventory });
    this.emit('crop-planted', { plot, cropType, quality, pawnId });

    console.log(`Pawn ${pawnId} planted ${cropType} at (${plotX}, ${plotY})`);
    return true;
  }

  /**
   * Convert seed item ID to crop type
   */
  private seedToCropType(seedItemId: string): CropType | null {
    const seedToCropMap: Record<string, CropType> = {
      'carrot_seed': 'carrot',
      'parsnip_seed': 'parsnip',
      'potato_seed': 'potato',
      'pepper_seed': 'pepper',
      'tomato_seed': 'tomato',
      'pumpkin_seed': 'pumpkin',
      'sunflower_seed': 'sunflower',
      'appletree_seed': 'appletree',
      'lemontree_seed': 'lemontree',
      'turnip_seed': 'turnip',
      'strawberry_seed': 'strawberry',
      'corn_seed': 'corn',
    };
    return seedToCropMap[seedItemId] || null;
  }
}