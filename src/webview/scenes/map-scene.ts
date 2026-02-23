import Phaser from 'phaser';
import { MessageBridge } from '../message-bridge';
import { PlayerController } from '../objects/player';
import { PawnManager } from '../systems/pawn-manager';
import { CropManager } from '../systems/crop-manager';
import { CameraController } from '../systems/camera';
import { DayNightSystem } from '../systems/day-night';
import { gridToScreen, generateFarmWalkableGrid } from '../utils/grid';

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

    try {
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

      console.log('MapScene setup complete');
    } catch (err) {
      console.error('MapScene create failed:', err);
      // Show error on screen so it's visible in webview
      this.add.text(this.scale.width / 2, this.scale.height / 2,
        `Error: ${err}`, { fontSize: '14px', color: '#ff4444' }).setOrigin(0.5);
    }
  }

  /** Check if a texture loaded successfully */
  private has(key: string): boolean {
    return this.textures.exists(key) && key !== '__MISSING';
  }

  private createTilemap() {
    // Add frames to terrain-elevated tileset (576x384 = 9x6 grid of 64x64 tiles)
    if (this.has('terrain-elevated')) {
      const tex = this.textures.get('terrain-elevated');
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 9; col++) {
          tex.add(row * 9 + col, 0, col * 64, row * 64, 64, 64);
        }
      }
    }

    // Create the rectangular farm layout (converted from isometric)
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

    if (this.has('water-bg')) {
      // Tile water background across entire rectangular game area
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const screenPos = gridToScreen(col, row);
          const waterBg = this.add.image(screenPos.x + 32, screenPos.y + 32, 'water-bg'); // Center on tile
          waterBg.setDepth(-20);
        }
      }
    } else {
      // Fallback: teal background rectangle
      const worldWidth = gridSize * 64;
      const worldHeight = gridSize * 64;
      const bg = this.add.graphics();
      bg.fillStyle(0x4a9e9e);
      bg.fillRect(0, 0, worldWidth, worldHeight);
      bg.setDepth(-20);
    }
  }

  private createElevatedIsland() {
    const islandBounds = {
      minCol: 2, maxCol: 13,
      minRow: 3, maxRow: 12
    };

    const useRealTiles = this.has('terrain-elevated');

    for (let row = islandBounds.minRow; row <= islandBounds.maxRow; row++) {
      for (let col = islandBounds.minCol; col <= islandBounds.maxCol; col++) {
        const screenPos = gridToScreen(col, row);

        if (useRealTiles) {
          const tileIndex = this.getElevatedTileIndex(col, row, islandBounds);
          const grassTile = this.add.image(screenPos.x + 32, screenPos.y + 32, 'terrain-elevated'); // Center on tile
          grassTile.setFrame(tileIndex);
          grassTile.setDepth(-5);
        } else {
          // Fallback: draw green rectangular tile
          const isEdge = row === islandBounds.minRow || row === islandBounds.maxRow ||
                         col === islandBounds.minCol || col === islandBounds.maxCol;
          const grass = this.add.graphics();
          grass.fillStyle(isEdge ? 0x4a8c3f : 0x5a9c4f);
          grass.fillRect(screenPos.x, screenPos.y, 64, 64);
          grass.setDepth(-5);
        }
      }
    }

    // Cliff faces rendered below/right of island edge
    if (useRealTiles) {
      this.createCliffFaces(islandBounds);
    }

    this.createFarmPlots(islandBounds);
  }

  private createCliffFaces(islandBounds: { minCol: number; maxCol: number; minRow: number; maxRow: number }) {
    // terrain-elevated.png has two 4-col blocks in a 9-col grid (frame = row*9+col):
    //   Left block (cols 0-3): cliff → walkable terrain
    //   Right block (cols 5-8): cliff → water  (the rocky cliff faces we need)
    //
    // Right block cliff frames (ref tile → frame):
    //   Bottom cliff (cols 5-7, rows 3-5):
    //     10→32  11→33  12→34   (cliff top, grass overhang)
    //     17→41  18→42  19→43   (cliff middle, rock)
    //     21→50  22→51  23→52   (cliff bottom, rock meets water)
    //   Right-edge column (col 8, rows 0-5):
    //     13→8   14→17  15→26   (surface-level right cliff)
    //     16→35  20→44  24→53   (cliff-level right cliff)

    const addCliffTile = (col: number, row: number, frame: number) => {
      const screenPos = gridToScreen(col, row);
      const tile = this.add.image(screenPos.x + 32, screenPos.y + 32, 'terrain-elevated');
      tile.setFrame(frame);
      tile.setDepth(-6);
    };

    // Bottom cliff — 2 rows below island bottom edge
    // Surface bottom edge already has ref tiles 7/8/9 (frames 18/19/20)
    // Below that: ref 17/18/19 then 21/22/23
    const cliffFrames = [
      [41, 42, 43], // ref 17/18/19: cliff middle (rock)
      [50, 51, 52], // ref 21/22/23: cliff bottom (rock meets water)
    ];

    for (let r = 0; r < cliffFrames.length; r++) {
      const gridRow = islandBounds.maxRow + 1 + r;
      for (let col = islandBounds.minCol; col <= islandBounds.maxCol; col++) {
        const isLeft = col === islandBounds.minCol;
        const isRight = col === islandBounds.maxCol;
        const frame = isLeft ? cliffFrames[r][0] : isRight ? cliffFrames[r][2] : cliffFrames[r][1];
        addCliffTile(col, gridRow, frame);
      }
    }

    // Right cliff column — alongside the island right edge
    const rightCol = islandBounds.maxCol + 1;
    const rightSurfaceFrames = [8, 17, 26]; // ref 13/14/15: right cliff at surface level
    for (let row = islandBounds.minRow; row <= islandBounds.maxRow; row++) {
      const isTop = row === islandBounds.minRow;
      const isBottom = row === islandBounds.maxRow;
      const frame = isTop ? rightSurfaceFrames[0] : isBottom ? rightSurfaceFrames[2] : rightSurfaceFrames[1];
      addCliffTile(rightCol, row, frame);
    }

    // Right cliff corner — below right cliff, at intersection with bottom cliff (2 rows)
    const rightCliffFrames = [44, 53]; // ref 20/24: right cliff at cliff level
    for (let r = 0; r < rightCliffFrames.length; r++) {
      addCliffTile(rightCol, islandBounds.maxRow + 1 + r, rightCliffFrames[r]);
    }
  }

  private getElevatedTileIndex(col: number, row: number, bounds: any): number {
    // terrain-elevated.png: 9 cols × 6 rows of 64×64 tiles
    // Left block = 4 cols (0-3) × 6 rows, frame = row*9 + col
    // Reference tile → frame index:
    //   Surface 3×3 (cols 0-2, rows 0-2):
    //     1→0(TL) 2→1(T) 3→2(TR) / 4→9(L) 5→10(C) 6→11(R) / 7→18(BL) 8→19(B) 9→20(BR)
    //   Right-edge col (col 3, rows 0-5):
    //     13→3, 14→12, 15→21, 16→30, 20→39, 24→48
    //   Cliff rows (cols 0-2, rows 3-5):
    //     10→27, 11→28, 12→29 / 17→36, 18→37, 19→38 / 21→45, 22→46, 23→47

    const isTopEdge = row === bounds.minRow;
    const isBottomEdge = row === bounds.maxRow;
    const isLeftEdge = col === bounds.minCol;
    const isRightEdge = col === bounds.maxCol;

    // Corners
    if (isTopEdge && isLeftEdge) return 0;
    if (isTopEdge && isRightEdge) return 2;
    if (isBottomEdge && isLeftEdge) return 18;
    if (isBottomEdge && isRightEdge) return 20;

    // Edges
    if (isTopEdge) return 1;
    if (isBottomEdge) return 19;
    if (isLeftEdge) return 9;
    if (isRightEdge) return 11;

    // Center fill
    return 10;
  }

  private createFarmPlots(islandBounds: any) {
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
        const tilledOverlay = this.add.graphics();
        tilledOverlay.fillStyle(0x8B4513, 0.8);
        // Rectangular tilled plot instead of ellipse
        tilledOverlay.fillRect(screenPos.x + 8, screenPos.y + 8, 48, 48);
        tilledOverlay.setDepth(-4);
      }
    }
  }

  private createWaterFoam() {
    if (!this.has('water-foam')) return;

    const islandBounds = { minCol: 2, maxCol: 13, minRow: 3, maxRow: 12 };
    const foamPositions: { col: number; row: number }[] = [];

    for (let col = islandBounds.minCol - 1; col <= islandBounds.maxCol + 1; col++) {
      foamPositions.push({ col, row: islandBounds.minRow - 1 });
      foamPositions.push({ col, row: islandBounds.maxRow + 1 });
    }
    for (let row = islandBounds.minRow; row <= islandBounds.maxRow; row++) {
      foamPositions.push({ col: islandBounds.minCol - 1, row });
      foamPositions.push({ col: islandBounds.maxCol + 1, row });
    }

    foamPositions.forEach((pos, index) => {
      const screenPos = gridToScreen(pos.col, pos.row);
      const foam = this.add.sprite(screenPos.x + 32, screenPos.y + 32, 'water-foam'); // Center on tile
      foam.setDepth(-10);
      foam.setScale(0.3);
      foam.play({ key: 'water-foam-anim', delay: index * 100 });
    });
  }

  private placeBuildingsAndDecorations() {
    const islandBounds = { minCol: 2, maxCol: 13, minRow: 3, maxRow: 12 };

    // Place house
    if (this.has('house')) {
      const housePos = gridToScreen(4, 5);
      const house = this.add.image(housePos.x + 32, housePos.y + 32 - 30, 'house'); // Center on tile
      house.setDepth(5);
      house.setScale(0.8);
    }

    // Place barn
    if (this.has('barn')) {
      const barnPos = gridToScreen(11, 6);
      const barn = this.add.image(barnPos.x + 32, barnPos.y + 32 - 40, 'barn'); // Center on tile
      barn.setDepth(5);
      barn.setScale(0.6);
    }

    // Trees
    this.placeTrees(islandBounds);

    // Decorations (bushes, rocks)
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
      if (!this.has(tree.type)) return;
      const screenPos = gridToScreen(tree.col, tree.row);
      const treeSprite = this.add.sprite(screenPos.x + 32, screenPos.y + 32 - 40, tree.type); // Center on tile
      treeSprite.setDepth(8);
      treeSprite.setScale(0.4);
      const animKey = `${tree.type}-sway`;
      if (this.anims.exists(animKey)) {
        treeSprite.play(animKey);
      }
    });
  }

  private placeIslandDecorations(islandBounds: any) {
    const decorations = [
      { col: 5, row: 11, type: 'bush1' },
      { col: 10, row: 5, type: 'bush2' },
      { col: 7, row: 4, type: 'rock1' },
      { col: 12, row: 10, type: 'rock2' },
      { col: 3, row: 9, type: 'bush1' }
    ];

    decorations.forEach(deco => {
      if (!this.has(deco.type)) return;
      const screenPos = gridToScreen(deco.col, deco.row);
      const decoration = this.add.image(screenPos.x + 32, screenPos.y + 32, deco.type); // Center on tile
      decoration.setDepth(2);
      decoration.setScale(0.5);
    });
  }

  private placeWaterDecorations() {
    const waterRocks = [
      { col: 1, row: 6, type: 'water-rock1' },
      { col: 14, row: 8, type: 'water-rock2' },
      { col: 7, row: 1, type: 'water-rock3' },
      { col: 9, row: 14, type: 'water-rock4' }
    ];

    waterRocks.forEach(rock => {
      if (!this.has(rock.type)) return;
      const screenPos = gridToScreen(rock.col, rock.row);
      const waterRock = this.add.image(screenPos.x + 32, screenPos.y + 32, rock.type); // Center on tile
      waterRock.setDepth(-8);
      waterRock.setScale(0.6);
    });

    // Rubber duck easter egg
    if (this.has('rubber-duck')) {
      const duckPos = gridToScreen(15, 5);
      const duck = this.add.image(duckPos.x + 32, duckPos.y + 32, 'rubber-duck'); // Center on tile
      duck.setDepth(-7);
      duck.setScale(0.8);
    }
  }

  private createPlayer(spawnPoint: string) {
    const spawnPositions: Record<string, { x: number; y: number }> = {
      default: { x: 8, y: 7 },
      fromTown: { x: 10, y: 10 },
    };

    const spawn = spawnPositions[spawnPoint] || spawnPositions.default;
    this.playerController = new PlayerController(this, spawn.x, spawn.y);
  }

  private initializeSystems() {
    if (this.currentMapId === 'farm') {
      this.pawnManager = new PawnManager(this);
      this.cropManager = new CropManager(this);
    }

    this.cameraController = new CameraController(this);
    this.dayNight = new DayNightSystem(this);
  }

  private setupInput() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.playerController) {
        this.playerController.handleClick(pointer);
      }
    });
  }

  private setupMessageHandling() {
    MessageBridge.on('state-update', (farmState) => {
      this.handleStateUpdate(farmState);
    });

    MessageBridge.on('season-change', (data) => {
      console.log('Season changed to:', data.season);
      this.dayNight?.updateSeason(data.season);
    });

    MessageBridge.on('event', (event) => {
      this.handleGameEvent(event);
    });
  }

  private setupCamera() {
    const gridSize = this.registry.get('gridSize') || 16;
    const worldWidth = gridSize * 64;
    const worldHeight = gridSize * 64; // Square world for top-down view

    // Set world and camera bounds to the rectangular world
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    if (this.playerController && this.cameraController) {
      this.cameraController.followPlayer(this.playerController.sprite);
    }
  }

  private handleStateUpdate(farmState: any) {
    if (this.pawnManager && farmState.pawns) {
      this.pawnManager.sync(farmState.pawns);
    }

    if (this.cropManager && farmState.farm && farmState.farm.plots) {
      this.cropManager.sync(farmState.farm.plots);
    }

    if (farmState.player && farmState.player.position) {
      const playerPos = farmState.player.position;
      if (this.playerController) {
        this.playerController.updatePosition(playerPos.x, playerPos.y);
      }
    }

    MessageBridge.setState({ farmState });
  }

  private handleGameEvent(event: any) {
    switch (event.type) {
      case 'harvest':
        console.log('Harvest event:', event.message);
        break;
      case 'pawn-spawn':
        break;
      default:
        console.log('Game event:', event);
    }
  }

  update(time: number, delta: number) {
    this.playerController?.update(delta);
    this.pawnManager?.update(delta);
    this.cropManager?.update(delta);
    this.cameraController?.update(delta);
    this.dayNight?.update(time);

    this.children.sort('depth');
  }

  onPlayerMove(gridX: number, gridY: number) {
    MessageBridge.send({
      type: 'player-move',
      position: { x: gridX, y: gridY }
    });
  }

  inspectTile(gridX: number, gridY: number) {
    MessageBridge.send({
      type: 'inspect',
      target: { type: 'plot', x: gridX, y: gridY }
    });
  }

  getScreenPosition(gridX: number, gridY: number): { x: number; y: number } {
    return gridToScreen(gridX, gridY);
  }

  private generateIslandWalkableGrid(gridSize: number): boolean[][] {
    const grid: boolean[][] = [];
    const islandBounds = { minCol: 2, maxCol: 13, minRow: 3, maxRow: 12 };

    for (let row = 0; row < gridSize; row++) {
      grid[row] = [];
      for (let col = 0; col < gridSize; col++) {
        grid[row][col] = false;
      }
    }

    for (let row = islandBounds.minRow; row <= islandBounds.maxRow; row++) {
      for (let col = islandBounds.minCol; col <= islandBounds.maxCol; col++) {
        grid[row][col] = true;
      }
    }

    const buildings = [
      { col: 4, row: 5 },
      { col: 11, row: 6 }
    ];
    buildings.forEach(building => {
      if (building.row >= 0 && building.row < gridSize &&
          building.col >= 0 && building.col < gridSize) {
        grid[building.row][building.col] = false;
      }
    });

    return grid;
  }

  supportsPawns(): boolean {
    return this.currentMapId === 'farm';
  }

  supportsCrops(): boolean {
    return this.currentMapId === 'farm';
  }
}
