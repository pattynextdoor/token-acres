import Phaser from 'phaser';

export class CameraController {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private target?: Phaser.GameObjects.GameObject;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private zoomLevel = 1;
  private readonly minZoom = 0.5;
  private readonly maxZoom = 2.0;
  private readonly zoomStep = 0.1;

  constructor(private scene: Phaser.Scene) {
    this.camera = scene.cameras.main;
    this.setupCamera();
    this.setupInput();
  }

  private setupCamera() {
    // Set camera bounds to encompass the farm area
    // For 8x8 farm with 64x32 isometric tiles
    const farmSize = this.scene.registry.get('gridSize') || 8;
    const bounds = {
      x: -400,
      y: -300,
      width: 800 + (farmSize * 64),
      height: 600 + (farmSize * 32),
    };
    
    this.camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    this.camera.setZoom(this.zoomLevel);
    
    // Center camera on farm initially
    this.camera.centerOn(0, 0);
  }

  private setupInput() {
    // Mouse wheel zoom
    this.scene.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number) => {
      this.handleZoom(deltaY > 0 ? -this.zoomStep : this.zoomStep, pointer.worldX, pointer.worldY);
    });

    // Mouse drag to pan (middle mouse button or right click)
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
        this.isDragging = true;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
        this.scene.input.setDefaultCursor('grabbing');
      }
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        this.isDragging = false;
        this.scene.input.setDefaultCursor('default');
      }
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const deltaX = pointer.x - this.dragStartX;
        const deltaY = pointer.y - this.dragStartY;
        
        this.camera.scrollX -= deltaX / this.zoomLevel;
        this.camera.scrollY -= deltaY / this.zoomLevel;
        
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
      }
    });

    // Keyboard camera controls (WASD alternative for panning)
    const cursors = this.scene.input.keyboard?.createCursorKeys();
    if (cursors) {
      // These will be handled in update() method
    }
  }

  private handleZoom(zoomDelta: number, worldX: number, worldY: number) {
    const newZoom = Phaser.Math.Clamp(this.zoomLevel + zoomDelta, this.minZoom, this.maxZoom);
    if (newZoom !== this.zoomLevel) {
      this.zoomLevel = newZoom;
      this.camera.setZoom(this.zoomLevel);
      
      // Zoom towards mouse cursor
      const pointer = this.scene.input.activePointer;
      if (pointer) {
        const zoomPoint = this.camera.getWorldPoint(pointer.x, pointer.y);
        this.camera.centerOn(zoomPoint.x, zoomPoint.y);
      }
    }
  }

  followPlayer(playerSprite: Phaser.GameObjects.Sprite) {
    this.target = playerSprite;
    
    // Start following with smooth lerp
    this.camera.startFollow(playerSprite, true, 0.08, 0.08);
  }

  stopFollowing() {
    this.camera.stopFollow();
    this.target = undefined;
  }

  centerOnGrid(gridX: number, gridY: number) {
    // Convert grid coordinates to world position
    const worldPos = this.scene.getScreenPosition?.(gridX, gridY) || { x: gridX * 64, y: gridY * 32 };
    this.camera.pan(worldPos.x, worldPos.y, 1000, 'Power2');
  }

  update(delta: number) {
    // Handle keyboard panning if no target is being followed
    if (!this.target) {
      const cursors = this.scene.input.keyboard?.createCursorKeys();
      if (cursors) {
        const panSpeed = 200 / this.zoomLevel; // Adjust speed based on zoom
        
        if (cursors.left?.isDown) {
          this.camera.scrollX -= panSpeed * (delta / 1000);
        }
        if (cursors.right?.isDown) {
          this.camera.scrollX += panSpeed * (delta / 1000);
        }
        if (cursors.up?.isDown) {
          this.camera.scrollY -= panSpeed * (delta / 1000);
        }
        if (cursors.down?.isDown) {
          this.camera.scrollY += panSpeed * (delta / 1000);
        }
      }
    }
  }

  // Public API
  getZoom(): number {
    return this.zoomLevel;
  }

  setZoom(zoom: number) {
    this.zoomLevel = Phaser.Math.Clamp(zoom, this.minZoom, this.maxZoom);
    this.camera.setZoom(this.zoomLevel);
  }

  shake(intensity: number = 5, duration: number = 100) {
    this.camera.shake(duration, intensity);
  }

  flash(color: number = 0xffffff, duration: number = 100) {
    this.camera.flash(duration, color >> 16, (color >> 8) & 0xff, color & 0xff);
  }

  fade(color: number = 0x000000, duration: number = 500) {
    this.camera.fade(duration, color >> 16, (color >> 8) & 0xff, color & 0xff);
  }
}