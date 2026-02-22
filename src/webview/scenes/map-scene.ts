import Phaser from 'phaser';
import { MessageBridge } from '../message-bridge';
import { PlayerController } from '../objects/player';
import { PawnManager } from '../systems/pawn-manager';
import { CropManager } from '../systems/crop-manager';
import { CameraController } from '../systems/camera';
import { DayNightSystem } from '../systems/day-night';
import { gridToScreen, generateFarmWalkableGrid } from '../utils/isometric';

export class MapScene extends Phaser.Scene {
  private playerController?: PlayerController;
  private pawnManager?: PawnManager;
  private cropManager?: CropManager;
  private cameraController?: CameraController;
  private dayNight?: DayNightSystem;
  private currentMapId: string = 'farm';

  constructor() {
    super({ key: 'MapScene' });
  }

  init(data: { mapId?: string; spawnPoint?: string }) {
    this.currentMapId = data.mapId || 'farm';
  }

  create(data: { mapId?: string; spawnPoint?: string }) {
    console.log('MapScene created for map:', this.currentMapId);

    // Create tilemap from generated data
    this.createTilemap();

    // Initialize player
    const spawnPoint = data.spawnPoint || 'default';
    this.createPlayer(spawnPoint);

    // Initialize systems
    this.initializeSystems();

    // Setup input
    this.setupInput();

    // Setup message handling
    this.setupMessageHandling();

    // Camera setup
    this.setupCamera();

    // Enable depth sorting for isometric rendering
    this.children.sortChildrenFlag = true;

    // Start UI scene as overlay
    this.scene.launch('UIScene');

    // Notify extension host that we're ready
    MessageBridge.send({ type: 'ready', mapId: this.currentMapId });

    // Debug info
    console.log('MapScene setup complete');
  }

  private createTilemap() {
    // Generate the 8x8 isometric farm programmatically
    this.createFarmTiles();
    this.placeBuildingsAndDecorations();

    // Store walkable grid for pathfinding
    const gridSize = this.registry.get('gridSize') || 8;
    const walkableGrid = generateFarmWalkableGrid(gridSize, [], []);
    this.registry.set('walkableGrid', walkableGrid);
  }

  private createFarmTiles() {
    const gridSize = 8;
    
    // Create base grass tiles and tilled soil plots
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const screenPos = gridToScreen(col, row);
        
        // Base layer - grass tiles (using the terrain tileset)
        const grassTile = this.add.image(screenPos.x, screenPos.y, 'terrain-tileset');
        grassTile.setDepth(-10); // Behind everything else
        
        // Create tilled plots in the center 4x4 area
        if (col >= 2 && col <= 5 && row >= 2 && row <= 5) {
          // Use a darker tile or create a simple brown overlay for tilled soil
          const tilledOverlay = this.add.graphics();
          tilledOverlay.fillStyle(0x8B4513, 0.7); // Semi-transparent brown
          tilledOverlay.fillEllipse(screenPos.x, screenPos.y, 60, 30); // Isometric oval shape
          tilledOverlay.setDepth(-9); // Above grass, below everything else
        }
      }
    }
  }

  private placeBuildingsAndDecorations() {
    // Place house (top-left area)
    const housePos = gridToScreen(1, 1);
    const house = this.add.image(housePos.x, housePos.y - 30, 'house'); // Offset Y for building height
    house.setDepth(5);
    house.setScale(0.8); // Scale down to fit better
    
    // Place barn (top-right area) 
    const barnPos = gridToScreen(6, 1);
    const barn = this.add.image(barnPos.x, barnPos.y - 40, 'barn'); // Offset Y for building height
    barn.setDepth(5);
    barn.setScale(0.6); // Scale down to fit better
    
    // Add some decorative bushes around the edges
    const bush1Pos = gridToScreen(0, 0);
    const bush1 = this.add.image(bush1Pos.x, bush1Pos.y, 'bush1');
    bush1.setDepth(1);
    bush1.setScale(0.5);
    
    const bush2Pos = gridToScreen(7, 0);
    const bush2 = this.add.image(bush2Pos.x, bush2Pos.y, 'bush2');
    bush2.setDepth(1);
    bush2.setScale(0.5);
    
    // Add some rocks as decoration
    const rock1Pos = gridToScreen(0, 7);
    const rock1 = this.add.image(rock1Pos.x, rock1Pos.y, 'rock1');
    rock1.setDepth(1);
    rock1.setScale(0.4);
    
    const rock2Pos = gridToScreen(7, 7);
    const rock2 = this.add.image(rock2Pos.x, rock2Pos.y, 'rock2');
    rock2.setDepth(1);
    rock2.setScale(0.4);
  }

  private createPlayer(spawnPoint: string) {
    // Default spawn positions for different entry points
    const spawnPositions: Record<string, { x: number; y: number }> = {
      default: { x: 4, y: 4 },
      fromTown: { x: 7, y: 7 },
    };

    const spawn = spawnPositions[spawnPoint] || spawnPositions.default;
    this.playerController = new PlayerController(this, spawn.x, spawn.y);
  }

  private initializeSystems() {
    // Only initialize farm-specific systems for farm map
    if (this.currentMapId === 'farm') {
      this.pawnManager = new PawnManager(this);
      this.cropManager = new CropManager(this);
    }

    this.cameraController = new CameraController(this);
    this.dayNight = new DayNightSystem(this);
  }

  private setupInput() {
    // Click/tap to move
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.playerController) {
        this.playerController.handleClick(pointer);
      }
    });

    // Keyboard controls are handled in PlayerController
  }

  private setupMessageHandling() {
    // Handle state updates from extension host
    MessageBridge.on('state-update', (farmState) => {
      this.handleStateUpdate(farmState);
    });

    // Handle season changes
    MessageBridge.on('season-change', (data) => {
      console.log('Season changed to:', data.season);
      // Update lighting/ambiance for season
      this.dayNight?.updateSeason(data.season);
    });

    // Handle events
    MessageBridge.on('event', (event) => {
      this.handleGameEvent(event);
    });
  }

  private setupCamera() {
    if (this.playerController && this.cameraController) {
      this.cameraController.followPlayer(this.playerController.sprite);
    }
  }

  private handleStateUpdate(farmState: any) {
    // Update pawns
    if (this.pawnManager && farmState.pawns) {
      this.pawnManager.sync(farmState.pawns);
    }

    // Update crops
    if (this.cropManager && farmState.farm && farmState.farm.plots) {
      this.cropManager.sync(farmState.farm.plots);
    }

    // Update player position if needed
    if (farmState.player && farmState.player.position) {
      const playerPos = farmState.player.position;
      if (this.playerController) {
        this.playerController.updatePosition(playerPos.x, playerPos.y);
      }
    }

    // Store current state for persistence
    MessageBridge.setState({ farmState });
  }

  private handleGameEvent(event: any) {
    switch (event.type) {
      case 'harvest':
        // Show harvest particles or effects
        console.log('Harvest event:', event.message);
        break;
      case 'pawn-spawn':
        // Could show spawn effect
        break;
      default:
        console.log('Game event:', event);
    }
  }

  update(time: number, delta: number) {
    // Update all systems
    this.playerController?.update(delta);
    this.pawnManager?.update(delta);
    this.cropManager?.update(delta);
    this.cameraController?.update(delta);
    this.dayNight?.update(time);

    // Sort children by depth for isometric rendering
    this.children.sort('depth');
  }

  /**
   * Handle player movement for extension host sync
   */
  onPlayerMove(gridX: number, gridY: number) {
    MessageBridge.send({
      type: 'player-move',
      position: { x: gridX, y: gridY }
    });
  }

  /**
   * Handle inspection of game objects
   */
  inspectTile(gridX: number, gridY: number) {
    MessageBridge.send({
      type: 'inspect',
      target: { type: 'plot', x: gridX, y: gridY }
    });
  }

  /**
   * Get screen position from grid coordinates
   */
  getScreenPosition(gridX: number, gridY: number): { x: number; y: number } {
    return gridToScreen(gridX, gridY);
  }

  /**
   * Check if current map supports pawns/farming
   */
  supportsPawns(): boolean {
    return this.currentMapId === 'farm';
  }

  supportsCrops(): boolean {
    return this.currentMapId === 'farm';
  }
}