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
    // Create the elevated island farm
    this.createWaterBackground();
    this.createElevatedIsland();
    this.createWaterFoam();
    this.placeBuildingsAndDecorations();
    this.placeWaterDecorations();

    // Store walkable grid for pathfinding (only the island area is walkable)
    const gridSize = this.registry.get('gridSize') || 16;
    const walkableGrid = this.generateIslandWalkableGrid(gridSize);
    this.registry.set('walkableGrid', walkableGrid);
  }

  private createWaterBackground() {
    const gridSize = this.registry.get('gridSize') || 16;
    
    // Create water background tiling across entire game area
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const screenPos = gridToScreen(col, row);
        const waterBg = this.add.image(screenPos.x, screenPos.y, 'water-bg');
        waterBg.setDepth(-20); // Lowest layer
      }
    }
  }

  private createElevatedIsland() {
    // Create a roughly 12x10 island in the center of the 16x16 world
    // Island center is around (8,8), so island goes from (2,3) to (13,12)
    const islandBounds = {
      minCol: 2, maxCol: 13,
      minRow: 3, maxRow: 12
    };

    // Create the elevated grass platform
    for (let row = islandBounds.minRow; row <= islandBounds.maxRow; row++) {
      for (let col = islandBounds.minCol; col <= islandBounds.maxCol; col++) {
        const screenPos = gridToScreen(col, row);
        
        // Use terrain-elevated tileset for the grass platform
        // For now, use a simple approach - we'll use tile index based on position
        const tileIndex = this.getElevatedTileIndex(col, row, islandBounds);
        const grassTile = this.add.image(screenPos.x, screenPos.y, 'terrain-elevated');
        
        // Set the frame based on tile index (9 cols in tileset)
        grassTile.setFrame(tileIndex);
        grassTile.setDepth(-5); // Above water, below decorations
      }
    }

    // Create tilled plots in the center 6x4 area
    this.createFarmPlots(islandBounds);
  }

  private getElevatedTileIndex(col: number, row: number, bounds: any): number {
    // Simple tile selection for elevated terrain (9 cols × 6 rows tileset)
    // Top-left corner tiles, edge tiles, center tiles, etc.
    
    const isTopEdge = row === bounds.minRow;
    const isBottomEdge = row === bounds.maxRow;
    const isLeftEdge = col === bounds.minCol;
    const isRightEdge = col === bounds.maxCol;
    
    // Corner tiles
    if (isTopEdge && isLeftEdge) return 0;      // Top-left corner
    if (isTopEdge && isRightEdge) return 2;     // Top-right corner
    if (isBottomEdge && isLeftEdge) return 18;  // Bottom-left corner (row 2)
    if (isBottomEdge && isRightEdge) return 20; // Bottom-right corner
    
    // Edge tiles
    if (isTopEdge) return 1;     // Top edge
    if (isBottomEdge) return 19; // Bottom edge
    if (isLeftEdge) return 9;    // Left edge
    if (isRightEdge) return 11;  // Right edge
    
    // Center/inner tiles
    return 10; // Center grass tile
  }

  private createFarmPlots(islandBounds: any) {
    // Create 6x4 tilled area in the center of the island
    const plotCenterCol = Math.floor((islandBounds.minCol + islandBounds.maxCol) / 2);
    const plotCenterRow = Math.floor((islandBounds.minRow + islandBounds.maxRow) / 2);
    
    const plotBounds = {
      minCol: plotCenterCol - 3,
      maxCol: plotCenterCol + 2,
      minRow: plotCenterRow - 2,
      maxRow: plotCenterRow + 1
    };

    for (let row = plotBounds.minRow; row <= plotBounds.maxRow; row++) {
      for (let col = plotBounds.minCol; col <= plotBounds.maxCol; col++) {
        const screenPos = gridToScreen(col, row);
        
        // Create tilled soil overlay
        const tilledOverlay = this.add.graphics();
        tilledOverlay.fillStyle(0x8B4513, 0.8); // Brown tilled soil
        tilledOverlay.fillEllipse(screenPos.x, screenPos.y, 60, 30);
        tilledOverlay.setDepth(-4); // Above grass platform
      }
    }
  }

  private createWaterFoam() {
    // Place animated water foam around the island edges
    const islandBounds = { minCol: 2, maxCol: 13, minRow: 3, maxRow: 12 };
    const foamPositions = [];
    
    // Add foam around island perimeter
    for (let col = islandBounds.minCol - 1; col <= islandBounds.maxCol + 1; col++) {
      // Top and bottom edges
      foamPositions.push({ col, row: islandBounds.minRow - 1 });
      foamPositions.push({ col, row: islandBounds.maxRow + 1 });
    }
    
    for (let row = islandBounds.minRow; row <= islandBounds.maxRow; row++) {
      // Left and right edges
      foamPositions.push({ col: islandBounds.minCol - 1, row });
      foamPositions.push({ col: islandBounds.maxCol + 1, row });
    }

    // Place foam sprites with animation
    foamPositions.forEach((pos, index) => {
      const screenPos = gridToScreen(pos.col, pos.row);
      const foam = this.add.sprite(screenPos.x, screenPos.y, 'water-foam');
      foam.setDepth(-10); // Above water background, below island
      foam.setScale(0.3); // Scale down the large 192x192 frames
      foam.play('water-foam-anim');
      
      // Add slight random delay to make foam feel more natural
      foam.setDelay(index * 100);
    });
  }

  private placeBuildingsAndDecorations() {
    // Island bounds
    const islandBounds = { minCol: 2, maxCol: 13, minRow: 3, maxRow: 12 };
    
    // Place house on the island (left side)
    const housePos = gridToScreen(4, 5);
    const house = this.add.image(housePos.x, housePos.y - 30, 'house');
    house.setDepth(5);
    house.setScale(0.8);
    
    // Place barn on the island (right side)
    const barnPos = gridToScreen(11, 6);
    const barn = this.add.image(barnPos.x, barnPos.y - 40, 'barn');
    barn.setDepth(5);
    barn.setScale(0.6);
    
    // Place animated trees around island perimeter (4-6 trees)
    this.placeTrees(islandBounds);
    
    // Add decorative bushes and rocks on the island
    this.placeIslandDecorations(islandBounds);
  }

  private placeTrees(islandBounds: any) {
    const treePositions = [
      { col: 3, row: 4, type: 'tree1' },
      { col: 12, row: 4, type: 'tree2' },
      { col: 2, row: 8, type: 'tree3' },
      { col: 13, row: 9, type: 'tree4' },
      { col: 6, row: 3, type: 'tree1' },
      { col: 9, row: 12, type: 'tree2' }
    ];

    treePositions.forEach(tree => {
      const screenPos = gridToScreen(tree.col, tree.row);
      const treeSprite = this.add.sprite(screenPos.x, screenPos.y - 40, tree.type);
      treeSprite.setDepth(8); // High depth so they appear in front
      treeSprite.setScale(0.4); // Scale down the large tree sprites
      treeSprite.play(`${tree.type}-sway`);
    });
  }

  private placeIslandDecorations(islandBounds: any) {
    // Scatter bushes and rocks on the grass areas
    const decorations = [
      { col: 5, row: 11, type: 'bush1' },
      { col: 10, row: 5, type: 'bush2' },
      { col: 7, row: 4, type: 'rock1' },
      { col: 12, row: 10, type: 'rock2' },
      { col: 3, row: 9, type: 'bush1' }
    ];

    decorations.forEach(deco => {
      const screenPos = gridToScreen(deco.col, deco.row);
      const decoration = this.add.image(screenPos.x, screenPos.y, deco.type);
      decoration.setDepth(2); // Above grass, below trees and buildings
      decoration.setScale(0.5);
    });
  }

  private placeWaterDecorations() {
    // Place water rocks around the island
    const waterRocks = [
      { col: 1, row: 6, type: 'water-rock1' },
      { col: 14, row: 8, type: 'water-rock2' },
      { col: 7, row: 1, type: 'water-rock3' },
      { col: 9, row: 14, type: 'water-rock4' }
    ];

    waterRocks.forEach(rock => {
      const screenPos = gridToScreen(rock.col, rock.row);
      const waterRock = this.add.image(screenPos.x, screenPos.y, rock.type);
      waterRock.setDepth(-8); // Above water, but below foam
      waterRock.setScale(0.6);
    });

    // Place rubber duck (easter egg)
    const duckPos = gridToScreen(15, 5);
    const duck = this.add.image(duckPos.x, duckPos.y, 'rubber-duck');
    duck.setDepth(-7); // Floating on water surface
    duck.setScale(0.8);
  }

  private createPlayer(spawnPoint: string) {
    // Default spawn positions for different entry points (on the island)
    const spawnPositions: Record<string, { x: number; y: number }> = {
      default: { x: 8, y: 7 }, // Center of island
      fromTown: { x: 10, y: 10 }, // Near barn
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
    // Set world bounds to accommodate the larger map with water
    const gridSize = this.registry.get('gridSize') || 16;
    const worldWidth = gridSize * 64; // Approximate world size
    const worldHeight = gridSize * 32;
    
    this.physics.world.setBounds(-worldWidth/2, -worldHeight/2, worldWidth * 2, worldHeight * 2);
    this.cameras.main.setBounds(-worldWidth/2, -worldHeight/2, worldWidth * 2, worldHeight * 2);
    
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
   * Generate walkable grid for the island (only island tiles are walkable)
   */
  private generateIslandWalkableGrid(gridSize: number): boolean[][] {
    const grid: boolean[][] = [];
    const islandBounds = { minCol: 2, maxCol: 13, minRow: 3, maxRow: 12 };
    
    // Initialize all tiles as non-walkable
    for (let row = 0; row < gridSize; row++) {
      grid[row] = [];
      for (let col = 0; col < gridSize; col++) {
        grid[row][col] = false;
      }
    }
    
    // Mark island area as walkable
    for (let row = islandBounds.minRow; row <= islandBounds.maxRow; row++) {
      for (let col = islandBounds.minCol; col <= islandBounds.maxCol; col++) {
        grid[row][col] = true;
      }
    }
    
    // Mark building positions as non-walkable
    const buildings = [
      { col: 4, row: 5 }, // house
      { col: 11, row: 6 } // barn
    ];
    
    buildings.forEach(building => {
      if (building.row >= 0 && building.row < gridSize && 
          building.col >= 0 && building.col < gridSize) {
        grid[building.row][building.col] = false;
      }
    });
    
    return grid;
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