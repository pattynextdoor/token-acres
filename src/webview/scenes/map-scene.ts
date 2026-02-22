import Phaser from 'phaser';
import { MessageBridge } from '../message-bridge';
import { PlayerController } from '../objects/player';
import { PawnManager } from '../systems/pawn-manager';
import { CropManager } from '../systems/crop-manager';
import { CameraController } from '../systems/camera';
import { DayNightSystem } from '../systems/day-night';
import { gridToScreen, generateFarmWalkableGrid } from '../utils/isometric';

export class MapScene extends Phaser.Scene {
  private tilemap?: Phaser.Tilemaps.Tilemap;
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
    // Use the generated map data from BootScene
    const mapData = this.cache.json.get('farm-map');
    
    // Create tilemap from data
    this.tilemap = this.make.tilemap({ key: null, data: mapData });
    
    // Add tileset
    const terrain = this.tilemap.addTilesetImage('terrain', 'terrain-grass');
    
    if (terrain) {
      // Create ground layer
      const groundLayer = this.tilemap.createLayer('Ground', terrain);
      if (groundLayer) {
        groundLayer.setDepth(-1); // Behind all other objects
      }
    }

    // Store walkable grid for pathfinding
    const gridSize = this.registry.get('gridSize') || 8;
    const walkableGrid = generateFarmWalkableGrid(gridSize, [], []);
    this.registry.set('walkableGrid', walkableGrid);
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
   * Get the tilemap for other systems to use
   */
  getTilemap(): Phaser.Tilemaps.Tilemap | undefined {
    return this.tilemap;
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