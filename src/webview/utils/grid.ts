// Top-down grid coordinate conversion utilities

const TILE_SIZE = 64; // Each tile is 64x64 pixels

/**
 * Convert grid (col, row) to screen (x, y) pixel position.
 */
export function gridToScreen(col: number, row: number): { x: number; y: number } {
  return { x: col * TILE_SIZE, y: row * TILE_SIZE };
}

/**
 * Convert screen (x, y) pixel position to grid (col, row).
 */
export function screenToGrid(x: number, y: number): { col: number; row: number } {
  return {
    col: Math.floor(x / TILE_SIZE),
    row: Math.floor(y / TILE_SIZE),
  };
}

/**
 * Calculate depth value for top-down sorting.
 * Objects lower on screen (higher y) appear in front.
 */
export function topDownDepth(col: number, row: number, zOffset: number = 0): number {
  return row * 10 + zOffset;
}

/**
 * Get the center point of a tile in screen coordinates
 */
export function getTileCenter(col: number, row: number): { x: number; y: number } {
  const screenPos = gridToScreen(col, row);
  return {
    x: screenPos.x + TILE_SIZE / 2,
    y: screenPos.y + TILE_SIZE / 2,
  };
}

/**
 * Check if a screen position is within a tile's bounds
 */
export function isPointInTile(screenX: number, screenY: number, tileCol: number, tileRow: number): boolean {
  const tilePos = gridToScreen(tileCol, tileRow);
  return (
    screenX >= tilePos.x &&
    screenX < tilePos.x + TILE_SIZE &&
    screenY >= tilePos.y &&
    screenY < tilePos.y + TILE_SIZE
  );
}

/**
 * Get all tiles within a given radius of a center tile
 */
export function getTilesInRadius(centerCol: number, centerRow: number, radius: number): Array<{col: number, row: number}> {
  const tiles = [];
  
  for (let col = centerCol - radius; col <= centerCol + radius; col++) {
    for (let row = centerRow - radius; row <= centerRow + radius; row++) {
      const distance = Math.abs(col - centerCol) + Math.abs(row - centerRow);
      if (distance <= radius) {
        tiles.push({ col, row });
      }
    }
  }
  
  return tiles;
}

/**
 * Calculate Manhattan distance between two grid positions
 */
export function manhattanDistance(col1: number, row1: number, col2: number, row2: number): number {
  return Math.abs(col1 - col2) + Math.abs(row1 - row2);
}

/**
 * Generate a walkable grid for pathfinding on the farm
 * Returns a 2D boolean array where true = walkable, false = blocked
 */
export function generateFarmWalkableGrid(
  gridSize: number,
  buildings: Array<{ x: number; y: number }> = [],
  obstacles: Array<{ x: number; y: number }> = []
): boolean[][] {
  const grid: boolean[][] = [];
  
  // Initialize all tiles as walkable
  for (let row = 0; row < gridSize; row++) {
    grid[row] = [];
    for (let col = 0; col < gridSize; col++) {
      grid[row][col] = true;
    }
  }
  
  // Mark buildings as unwalkable
  for (const building of buildings) {
    if (building.x >= 0 && building.x < gridSize && building.y >= 0 && building.y < gridSize) {
      grid[building.y][building.x] = false;
    }
  }
  
  // Mark obstacles as unwalkable
  for (const obstacle of obstacles) {
    if (obstacle.x >= 0 && obstacle.x < gridSize && obstacle.y >= 0 && obstacle.y < gridSize) {
      grid[obstacle.y][obstacle.x] = false;
    }
  }
  
  return grid;
}

export { TILE_SIZE };