import Phaser from 'phaser';
import { gridToScreen, isoDepth } from '../utils/isometric';
import { findPath } from '../utils/pathfinding';

export interface ItemStack {
  itemId: string;
  quantity: number;
  maxStack: number;
}

export interface PawnState {
  id: string;
  name: string;
  factionColor: 'blue' | 'red' | 'purple' | 'yellow';
  mood: 'ecstatic' | 'happy' | 'neutral' | 'tired' | 'exhausted';
  state: 'idle' | 'walking' | 'working' | 'resting' | 'celebrating';
  position: { x: number; y: number };
  assignedPlot?: { x: number; y: number };
  agentSessionId?: string;
  inventory: ItemStack[];
}

export class Pawn extends Phaser.GameObjects.Sprite {
  public pawnState: PawnState;
  private path: Array<{ col: number; row: number }> = [];
  private pathIndex = 0;
  private moveSpeed = 80; // pixels per second
  private onArriveCallback?: () => void;
  private scene: Phaser.Scene;
  private nameText: Phaser.GameObjects.Text;
  private moodIndicator: Phaser.GameObjects.Graphics;
  private inventoryIndicator: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, state: PawnState) {
    const pos = gridToScreen(state.position.x, state.position.y);
    super(scene, pos.x, pos.y, `pawn-${state.factionColor}-idle`);
    
    this.scene = scene;
    this.pawnState = state;
    this.setDepth(isoDepth(state.position.x, state.position.y, 1));

    // Scale down the 192px sprites to fit the 64px tile grid
    this.setScale(0.35);

    scene.add.existing(this);

    // Create floating name label
    this.nameText = scene.add.text(pos.x, pos.y - 20, state.name, {
      fontSize: '10px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(this.depth + 1);

    // Create mood indicator
    this.moodIndicator = scene.add.graphics();
    this.moodIndicator.setDepth(this.depth + 1);

    // Create inventory indicator (item count badge)
    this.inventoryIndicator = scene.add.text(pos.x + 15, pos.y - 30, '', {
      fontSize: '8px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 2, y: 1 }
    }).setOrigin(0.5).setDepth(this.depth + 2);

    this.createAnimations();
    this.updateMoodIndicator();
    this.updateInventoryIndicator();
    this.updateAnimation();

    console.log(`Pawn ${state.name} (${state.factionColor}) created at (${state.position.x}, ${state.position.y})`);
  }

  private createAnimations() {
    const color = this.pawnState.factionColor;

    // Only create animations if they don't exist yet
    if (!this.scene.anims.exists(`pawn-${color}-idle-anim`)) {
      this.scene.anims.create({
        key: `pawn-${color}-idle-anim`,
        frames: this.scene.anims.generateFrameNumbers(`pawn-${color}-idle`, { frames: [0, 1, 2, 3, 4, 5, 6, 7] }),
        frameRate: 8,
        repeat: -1,
      });

      this.scene.anims.create({
        key: `pawn-${color}-run-anim`,
        frames: this.scene.anims.generateFrameNumbers(`pawn-${color}-run`, { frames: [0, 1, 2, 3, 4, 5] }),
        frameRate: 12,
        repeat: -1,
      });

      this.scene.anims.create({
        key: `pawn-${color}-work-anim`,
        frames: this.scene.anims.generateFrameNumbers(`pawn-${color}-work`, { frames: [0, 1, 2] }),
        frameRate: 6,
        repeat: 2,
      });

      this.scene.anims.create({
        key: `pawn-${color}-celebrate-anim`,
        frames: this.scene.anims.generateFrameNumbers(`pawn-${color}-idle`, { frames: [0, 1, 2, 3, 4, 5, 6, 7] }),
        frameRate: 16,
        repeat: 3,
      });
    }
  }

  /**
   * Update pawn with new state from extension host
   */
  updateState(newState: PawnState) {
    const oldState = this.pawnState.state;
    this.pawnState = newState;

    // Handle position changes
    if (newState.position.x !== this.pawnState.position.x || 
        newState.position.y !== this.pawnState.position.y) {
      this.moveToGrid(newState.position.x, newState.position.y);
    }

    // Handle state changes
    if (oldState !== newState.state) {
      this.updateAnimation();
    }

    // Handle assignment changes
    if (newState.assignedPlot && newState.state === 'working') {
      this.moveToGrid(newState.assignedPlot.x, newState.assignedPlot.y, () => {
        this.performWork();
      });
    }

    // Update visual elements
    this.nameText.setText(newState.name);
    this.updateMoodIndicator();
    this.updateInventoryIndicator();
  }

  /**
   * Move to a grid position with pathfinding
   */
  moveToGrid(col: number, row: number, onArrive?: () => void) {
    const walkableGrid = this.scene.registry.get('walkableGrid');
    
    if (walkableGrid) {
      this.path = findPath(
        { col: this.pawnState.position.x, row: this.pawnState.position.y },
        { col, row },
        walkableGrid
      );
    } else {
      // Fallback: direct path
      this.path = [{ col, row }];
    }

    this.pathIndex = 0;
    this.onArriveCallback = onArrive;
    
    if (this.path.length > 0) {
      this.pawnState.state = 'walking';
      this.updateAnimation();
    }
  }

  /**
   * Perform work animation at current location
   */
  private performWork() {
    this.pawnState.state = 'working';
    this.updateAnimation();

    // Work for 2 seconds then return to idle
    this.scene.time.delayedCall(2000, () => {
      if (this.pawnState.state === 'working') {
        this.pawnState.state = 'idle';
        this.updateAnimation();
      }
    });
  }

  private updateAnimation() {
    const color = this.pawnState.factionColor;
    
    switch (this.pawnState.state) {
      case 'idle':
      case 'resting':
        this.play(`pawn-${color}-idle-anim`);
        break;
      case 'walking':
        this.play(`pawn-${color}-run-anim`);
        break;
      case 'working':
        this.play(`pawn-${color}-work-anim`);
        break;
      case 'celebrating':
        this.play(`pawn-${color}-celebrate-anim`);
        // Auto-return to idle after celebration
        this.scene.time.delayedCall(3000, () => {
          if (this.pawnState.state === 'celebrating') {
            this.pawnState.state = 'idle';
            this.updateAnimation();
          }
        });
        break;
    }
  }

  private updateMoodIndicator() {
    this.moodIndicator.clear();
    
    // Draw mood as colored circle above pawn
    let color = 0xffffff;
    switch (this.pawnState.mood) {
      case 'ecstatic': color = 0x00ff00; break; // Green
      case 'happy': color = 0x90ee90; break;    // Light green
      case 'neutral': color = 0xffff00; break;  // Yellow
      case 'tired': color = 0xffa500; break;    // Orange
      case 'exhausted': color = 0xff0000; break; // Red
    }

    this.moodIndicator.fillStyle(color);
    this.moodIndicator.fillCircle(this.x + 12, this.y - 25, 3);
  }

  private updateInventoryIndicator() {
    const inventory = this.pawnState.inventory || [];
    const totalItems = inventory.reduce((sum, stack) => sum + stack.quantity, 0);
    const usedSlots = inventory.length;
    
    if (totalItems > 0) {
      this.inventoryIndicator.setText(`${totalItems}`);
      this.inventoryIndicator.setVisible(true);
      
      // Change color based on how full inventory is
      if (usedSlots >= 5) {
        this.inventoryIndicator.setStyle({ backgroundColor: '#cc3333' }); // Full - red
      } else if (usedSlots >= 3) {
        this.inventoryIndicator.setStyle({ backgroundColor: '#cc8833' }); // Mostly full - orange
      } else {
        this.inventoryIndicator.setStyle({ backgroundColor: '#333333' }); // Normal - dark
      }
    } else {
      this.inventoryIndicator.setVisible(false);
    }
  }

  update(delta: number) {
    this.updateMovement(delta);
    this.updateVisualElements();
  }

  private updateMovement(delta: number) {
    if (this.path.length === 0 || this.pathIndex >= this.path.length) {
      return;
    }

    const target = this.path[this.pathIndex];
    const targetScreen = gridToScreen(target.col, target.row);
    const dx = targetScreen.x - this.x;
    const dy = targetScreen.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 2) {
      // Arrived at current waypoint
      this.pawnState.position = { x: target.col, y: target.row };
      this.setDepth(isoDepth(target.col, target.row, 1));
      this.pathIndex++;

      if (this.pathIndex >= this.path.length) {
        // Arrived at final destination
        this.path = [];
        this.pathIndex = 0;
        this.pawnState.state = 'idle';
        this.updateAnimation();
        
        if (this.onArriveCallback) {
          this.onArriveCallback();
          this.onArriveCallback = undefined;
        }
      }
    } else {
      // Move towards current waypoint
      const speed = this.moveSpeed * (delta / 1000);
      this.x += (dx / distance) * speed;
      this.y += (dy / distance) * speed;
    }
  }

  private updateVisualElements() {
    // Update name text position
    this.nameText.setPosition(this.x, this.y - 20);

    // Update inventory indicator position
    this.inventoryIndicator.setPosition(this.x + 15, this.y - 30);

    // Update mood indicator position
    this.moodIndicator.setPosition(0, 0); // Reset transform
    this.updateMoodIndicator(); // Redraw at current position
  }

  /**
   * Add idle behavior (random wandering)
   */
  performIdleBehavior() {
    if (this.pawnState.state !== 'idle' || this.path.length > 0) {
      return;
    }

    const gridSize = this.scene.registry.get('gridSize') || 8;
    const currentPos = this.pawnState.position;
    
    // Wander to a nearby random position
    const wanderRadius = 2;
    const newCol = Math.max(0, Math.min(gridSize - 1, 
      currentPos.x + Math.floor(Math.random() * (wanderRadius * 2 + 1)) - wanderRadius));
    const newRow = Math.max(0, Math.min(gridSize - 1, 
      currentPos.y + Math.floor(Math.random() * (wanderRadius * 2 + 1)) - wanderRadius));

    if (newCol !== currentPos.x || newRow !== currentPos.y) {
      this.moveToGrid(newCol, newRow);
    }
  }

  /**
   * Clean up when pawn is removed
   */
  destroy(fromScene?: boolean) {
    this.nameText.destroy();
    this.moodIndicator.destroy();
    this.inventoryIndicator.destroy();
    super.destroy(fromScene);
  }
}