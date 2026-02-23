import Phaser from 'phaser';
import { PawnState, ItemStack } from '../objects/pawn';

export interface PawnTask {
  type: 'walkToStorehouse' | 'withdrawSeeds' | 'walkToPlot' | 'plantSeed' | 'depositItems' | 'idle';
  targetPosition?: { x: number; y: number };
  itemId?: string;
  quantity?: number;
}

export class PawnAI {
  private scene: Phaser.Scene;
  private pawnTasks: Map<string, PawnTask[]> = new Map();
  private updateTimer = 0;
  private readonly UPDATE_INTERVAL = 1000; // 1 second

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    console.log('PawnAI system initialized');
  }

  /**
   * Update the AI system - called from scene update loop
   */
  update(delta: number, pawns: Map<string, any>) {
    this.updateTimer += delta;
    
    if (this.updateTimer >= this.UPDATE_INTERVAL) {
      this.updateTimer = 0;
      this.processAllPawns(pawns);
    }
  }

  /**
   * Process AI behavior for all pawns
   */
  private processAllPawns(pawns: Map<string, any>) {
    for (const [pawnId, pawn] of pawns) {
      if (pawn.pawnState.agentSessionId) {
        // Skip pawns that are assigned to agent sessions
        continue;
      }

      this.processPawnBehavior(pawnId, pawn);
    }
  }

  /**
   * Process individual pawn behavior based on current task queue
   */
  private processPawnBehavior(pawnId: string, pawn: any) {
    const taskQueue = this.pawnTasks.get(pawnId) || [];
    
    // If pawn is already busy (walking, working), wait
    if (pawn.pawnState.state === 'walking' || pawn.pawnState.state === 'working') {
      return;
    }

    // If no tasks, assign new ones based on game state
    if (taskQueue.length === 0) {
      this.assignNewTasks(pawnId, pawn);
      return;
    }

    // Process current task
    const currentTask = taskQueue[0];
    this.executeTask(pawnId, pawn, currentTask);
  }

  /**
   * Assign new tasks to idle pawn based on current needs
   */
  private assignNewTasks(pawnId: string, pawn: any) {
    const tasks: PawnTask[] = [];
    const pawnInventory = pawn.pawnState.inventory || [];
    
    // Check if pawn has harvested items to deposit
    const harvestedItems = pawnInventory.filter((stack: ItemStack) => 
      this.isHarvestedItem(stack.itemId)
    );
    
    if (harvestedItems.length > 0) {
      // Priority: deposit harvested items
      tasks.push({ type: 'walkToStorehouse' });
      tasks.push({ type: 'depositItems' });
      tasks.push({ type: 'idle' });
    } else {
      // Check if pawn has seeds
      const seedItems = pawnInventory.filter((stack: ItemStack) => 
        this.isSeedItem(stack.itemId)
      );
      
      const emptyTilledPlots = this.getEmptyTilledPlots();
      
      if (seedItems.length > 0 && emptyTilledPlots.length > 0) {
        // Has seeds and empty plots - go plant
        const targetPlot = emptyTilledPlots[0];
        const seedToPlant = seedItems[0];
        
        tasks.push({ 
          type: 'walkToPlot', 
          targetPosition: targetPlot 
        });
        tasks.push({ 
          type: 'plantSeed', 
          itemId: seedToPlant.itemId,
          targetPosition: targetPlot 
        });
        
        // If more seeds and plots available, continue planting
        if (seedItems.length > 1 && emptyTilledPlots.length > 1) {
          const nextPlot = emptyTilledPlots[1];
          tasks.push({ 
            type: 'walkToPlot', 
            targetPosition: nextPlot 
          });
          tasks.push({ 
            type: 'plantSeed', 
            itemId: seedItems[1].itemId,
            targetPosition: nextPlot 
          });
        }
        
        tasks.push({ type: 'idle' });
      } else if (emptyTilledPlots.length > 0 && this.storehouseHasSeeds()) {
        // No seeds but storehouse has them - go get seeds
        tasks.push({ type: 'walkToStorehouse' });
        tasks.push({ type: 'withdrawSeeds' });
        
        // Then plan to plant
        const targetPlot = emptyTilledPlots[0];
        tasks.push({ 
          type: 'walkToPlot', 
          targetPosition: targetPlot 
        });
        tasks.push({ 
          type: 'plantSeed', 
          targetPosition: targetPlot 
        });
        tasks.push({ type: 'idle' });
      } else {
        // Nothing to do - idle behavior
        tasks.push({ type: 'idle' });
      }
    }

    this.pawnTasks.set(pawnId, tasks);
    console.log(`Assigned ${tasks.length} tasks to pawn ${pawnId}:`, tasks.map(t => t.type));
  }

  /**
   * Execute a specific task for a pawn
   */
  private executeTask(pawnId: string, pawn: any, task: PawnTask) {
    console.log(`Executing task ${task.type} for pawn ${pawnId}`);
    
    switch (task.type) {
      case 'walkToStorehouse':
        const storehousePos = this.getStorehousePosition();
        pawn.moveToGrid(storehousePos.x, storehousePos.y, () => {
          this.completeTask(pawnId);
        });
        break;
        
      case 'withdrawSeeds':
        this.withdrawSeedsFromStorehouse(pawnId, pawn);
        this.completeTask(pawnId);
        break;
        
      case 'walkToPlot':
        if (task.targetPosition) {
          pawn.moveToGrid(task.targetPosition.x, task.targetPosition.y, () => {
            this.completeTask(pawnId);
          });
        } else {
          this.completeTask(pawnId); // Skip invalid task
        }
        break;
        
      case 'plantSeed':
        this.plantSeedAtPosition(pawnId, pawn, task);
        this.completeTask(pawnId);
        break;
        
      case 'depositItems':
        this.depositItemsToStorehouse(pawnId, pawn);
        this.completeTask(pawnId);
        break;
        
      case 'idle':
        // Random wander
        pawn.performIdleBehavior();
        this.completeTask(pawnId);
        break;
    }
  }

  /**
   * Complete current task and move to next in queue
   */
  private completeTask(pawnId: string) {
    const taskQueue = this.pawnTasks.get(pawnId) || [];
    if (taskQueue.length > 0) {
      taskQueue.shift(); // Remove completed task
      this.pawnTasks.set(pawnId, taskQueue);
    }
  }

  /**
   * Withdraw seeds from storehouse to pawn inventory
   */
  private withdrawSeedsFromStorehouse(pawnId: string, pawn: any) {
    // Send message to extension host to withdraw seeds
    const message = {
      type: 'pawn-withdraw-seeds',
      data: { pawnId, maxSeeds: 3 } // Withdraw up to 3 seed stacks
    };
    
    // Send through message bridge
    if (this.scene.registry.has('messageBridge')) {
      const bridge = this.scene.registry.get('messageBridge');
      bridge.sendToHost(message);
    }
    
    console.log(`Pawn ${pawnId} withdrawing seeds from storehouse`);
  }

  /**
   * Deposit items from pawn inventory to storehouse
   */
  private depositItemsToStorehouse(pawnId: string, pawn: any) {
    // Send message to extension host to deposit all items
    const message = {
      type: 'pawn-deposit-all',
      data: { pawnId }
    };
    
    // Send through message bridge
    if (this.scene.registry.has('messageBridge')) {
      const bridge = this.scene.registry.get('messageBridge');
      bridge.sendToHost(message);
    }
    
    console.log(`Pawn ${pawnId} depositing items to storehouse`);
  }

  /**
   * Plant seed at specific position
   */
  private plantSeedAtPosition(pawnId: string, pawn: any, task: PawnTask) {
    if (!task.targetPosition) return;
    
    // Send message to extension host to plant seed
    const message = {
      type: 'pawn-plant-seed',
      data: { 
        pawnId, 
        position: task.targetPosition,
        seedItemId: task.itemId 
      }
    };
    
    // Send through message bridge
    if (this.scene.registry.has('messageBridge')) {
      const bridge = this.scene.registry.get('messageBridge');
      bridge.sendToHost(message);
    }
    
    // Play work animation
    pawn.pawnState.state = 'working';
    pawn.updateAnimation();
    
    // Return to idle after animation
    setTimeout(() => {
      if (pawn.pawnState.state === 'working') {
        pawn.pawnState.state = 'idle';
        pawn.updateAnimation();
      }
    }, 2000);
    
    console.log(`Pawn ${pawnId} planting ${task.itemId} at (${task.targetPosition.x}, ${task.targetPosition.y})`);
  }

  /**
   * Get storehouse position from buildings registry
   */
  private getStorehousePosition(): { x: number; y: number } {
    const buildings = this.scene.registry.get('buildings') || [];
    const storehouse = buildings.find((b: any) => b.type === 'storehouse');
    return storehouse ? storehouse.position : { x: 6, y: 1 }; // fallback
  }

  /**
   * Get list of empty tilled plots from scene registry
   */
  private getEmptyTilledPlots(): Array<{ x: number; y: number }> {
    const plotStates = this.scene.registry.get('plotStates') || [];
    return plotStates.filter((plot: any) => 
      plot.type === 'tilled' && !plot.crop && plot.soilHealth > 20
    ).map((plot: any) => ({ x: plot.x, y: plot.y }));
  }

  /**
   * Check if storehouse has seeds available
   */
  private storehouseHasSeeds(): boolean {
    const storehouseInventory = this.scene.registry.get('storehouseInventory') || [];
    return storehouseInventory.some((stack: ItemStack) => this.isSeedItem(stack.itemId));
  }

  /**
   * Check if item is a seed
   */
  private isSeedItem(itemId: string): boolean {
    return itemId.endsWith('_seed') || itemId.includes('seed');
  }

  /**
   * Check if item is a harvested crop
   */
  private isHarvestedItem(itemId: string): boolean {
    const harvestedItems = [
      'carrot', 'parsnip', 'potato', 'pepper', 'tomato', 'pumpkin', 'sunflower', 
      'apple', 'lemon', 'turnip', 'strawberry', 'corn', 'melon', 'starfruit', 
      'grape', 'yam', 'clover',
      // Golden variants
      'golden_carrot', 'golden_parsnip', 'golden_potato', 'golden_pepper', 
      'golden_tomato', 'golden_apple', 'golden_lemon', 'golden_turnip', 
      'golden_strawberry', 'golden_corn'
    ];
    return harvestedItems.includes(itemId);
  }

  /**
   * Force reassign tasks for a specific pawn (called when game state changes)
   */
  reassignTasks(pawnId: string) {
    this.pawnTasks.set(pawnId, []); // Clear current tasks
    console.log(`Reassigning tasks for pawn ${pawnId}`);
  }

  /**
   * Clear all tasks for cleanup
   */
  destroy() {
    this.pawnTasks.clear();
  }
}