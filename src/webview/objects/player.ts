import Phaser from 'phaser';
import { gridToScreen, screenToGrid, isoDepth, TILE_WIDTH, TILE_HEIGHT } from '../utils/isometric';

export class PlayerController {
  public sprite: Phaser.GameObjects.Sprite;
  private scene: Phaser.Scene;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  
  private moveSpeed = 100; // pixels per second
  private gridPosition = { col: 4, row: 4 };
  private targetPosition?: { x: number; y: number };
  private isMoving = false;

  constructor(scene: Phaser.Scene, startCol: number, startRow: number) {
    this.scene = scene;
    this.gridPosition = { col: startCol, row: startRow };

    // Create player sprite
    const startPos = gridToScreen(startCol, startRow);
    this.sprite = scene.add.sprite(startPos.x, startPos.y, 'player');
    this.sprite.setDepth(isoDepth(startCol, startRow, 2)); // Above pawns and crops

    // Setup input
    this.setupInput();

    // Create animations (placeholder - will be expanded when we have proper sprites)
    this.createAnimations();

    console.log(`Player created at grid (${startCol}, ${startRow}), screen (${startPos.x}, ${startPos.y})`);
  }

  private setupInput() {
    // Arrow keys
    if (this.scene.input.keyboard) {
      this.cursors = this.scene.input.keyboard.createCursorKeys();

      // WASD keys
      this.wasdKeys = {
        W: this.scene.input.keyboard.addKey('W'),
        A: this.scene.input.keyboard.addKey('A'),
        S: this.scene.input.keyboard.addKey('S'),
        D: this.scene.input.keyboard.addKey('D'),
      };
    }
  }

  private createAnimations() {
    // Simple placeholder animations
    // These will be replaced when we have proper sprite sheets
    
    if (!this.scene.anims.exists('player-idle')) {
      this.scene.anims.create({
        key: 'player-idle',
        frames: [{ key: 'player', frame: 0 }],
        frameRate: 1,
        repeat: -1,
      });
    }

    this.sprite.play('player-idle');
  }

  update(delta: number) {
    this.handleKeyboardInput(delta);
    this.handleMovementToTarget(delta);
    this.updateDepthSorting();
  }

  private handleKeyboardInput(delta: number) {
    if (!this.cursors || !this.wasdKeys || this.targetPosition) return;

    // Isometric movement: W = up-left, S = down-right, A = down-left, D = up-right
    let moveX = 0;
    let moveY = 0;
    const speed = this.moveSpeed * (delta / 1000);

    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
      moveX -= speed * 0.5;
      moveY -= speed * 0.25;
    }
    if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
      moveX += speed * 0.5;
      moveY += speed * 0.25;
    }
    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
      moveX -= speed * 0.5;
      moveY += speed * 0.25;
    }
    if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
      moveX += speed * 0.5;
      moveY -= speed * 0.25;
    }

    if (moveX !== 0 || moveY !== 0) {
      // Move the sprite
      this.sprite.x += moveX;
      this.sprite.y += moveY;

      // Update grid position
      const newGrid = screenToGrid(this.sprite.x, this.sprite.y);
      if (newGrid.col !== this.gridPosition.col || newGrid.row !== this.gridPosition.row) {
        this.gridPosition = { col: newGrid.col, row: newGrid.row };
        this.notifyPositionChange();
      }

      this.isMoving = true;
    } else {
      this.isMoving = false;
    }
  }

  private handleMovementToTarget(delta: number) {
    if (!this.targetPosition) return;

    const dx = this.targetPosition.x - this.sprite.x;
    const dy = this.targetPosition.y - this.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 2) {
      // Arrived at target
      this.sprite.setPosition(this.targetPosition.x, this.targetPosition.y);
      this.targetPosition = undefined;
      this.isMoving = false;
    } else {
      // Move towards target
      const speed = this.moveSpeed * (delta / 1000);
      this.sprite.x += (dx / distance) * speed;
      this.sprite.y += (dy / distance) * speed;
      this.isMoving = true;

      // Update grid position
      const newGrid = screenToGrid(this.sprite.x, this.sprite.y);
      if (newGrid.col !== this.gridPosition.col || newGrid.row !== this.gridPosition.row) {
        this.gridPosition = { col: newGrid.col, row: newGrid.row };
        this.notifyPositionChange();
      }
    }
  }

  private updateDepthSorting() {
    // Update depth based on current position for isometric sorting
    this.sprite.setDepth(isoDepth(this.gridPosition.col, this.gridPosition.row, 2));
  }

  private notifyPositionChange() {
    // Notify the scene about position change (for extension host sync)
    if (this.scene instanceof Phaser.Scene && 'onPlayerMove' in this.scene) {
      (this.scene as any).onPlayerMove(this.gridPosition.col, this.gridPosition.row);
    }
  }

  /**
   * Handle click-to-move
   */
  handleClick(pointer: Phaser.Input.Pointer) {
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const gridPos = screenToGrid(worldPoint.x, worldPoint.y);
    
    // Move to clicked grid position
    this.moveToGrid(gridPos.col, gridPos.row);
  }

  /**
   * Move to a specific grid position
   */
  moveToGrid(col: number, row: number) {
    const targetScreen = gridToScreen(col, row);
    this.targetPosition = { x: targetScreen.x, y: targetScreen.y };
  }

  /**
   * Update position from external source (e.g., state sync)
   */
  updatePosition(col: number, row: number) {
    if (col === this.gridPosition.col && row === this.gridPosition.row) {
      return; // Already at this position
    }

    this.gridPosition = { col, row };
    const screenPos = gridToScreen(col, row);
    
    // Smoothly tween to new position instead of snapping
    this.scene.tweens.add({
      targets: this.sprite,
      x: screenPos.x,
      y: screenPos.y,
      duration: 300,
      ease: 'Power2',
    });
  }

  /**
   * Get current grid position
   */
  getGridPosition(): { col: number; row: number } {
    return { ...this.gridPosition };
  }

  /**
   * Check if player is currently moving
   */
  getIsMoving(): boolean {
    return this.isMoving;
  }

  /**
   * Get screen bounds for camera following
   */
  getBounds(): Phaser.Geom.Rectangle {
    return this.sprite.getBounds();
  }
}