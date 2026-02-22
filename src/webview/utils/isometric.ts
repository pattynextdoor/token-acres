// Isometric coordinate conversion utilities

const TILE_WIDTH = 64;   // Isometric tile width in pixels
const TILE_HEIGHT = 32;  // Isometric tile height in pixels

/**
 * Convert grid (col, row) to screen (x, y) pixel position.
 */
export function gridToScreen(col: number, row: number): { x: number; y: number } {
  return {
    x: (col - row) * (TILE_WIDTH / 2),
    y: (col + row) * (TILE_HEIGHT / 2),
  };
}

/**
 * Convert screen (x, y) pixel position to grid (col, row).
 */
export function screenToGrid(x: number, y: number): { col: number; row: number } {
  return {
    col: Math.round((x / (TILE_WIDTH / 2) + y / (TILE_HEIGHT / 2)) / 2),
    row: Math.round((y / (TILE_HEIGHT / 2) - x / (TILE_WIDTH / 2)) / 2),
  };
}

/**
 * Calculate depth value for isometric sorting.
 * Objects with higher depth appear in front of objects with lower depth.
 */
export function isoDepth(col: number, row: number, zOffset: number = 0): number {
  return (col + row) * 10 + zOffset;
}

/**
 * Get the center point of a tile in screen coordinates
 */
export function getTileCenter(col: number, row: number): { x: number; y: number } {
  const screenPos = gridToScreen(col, row);
  return {
    x: screenPos.x,
    y: screenPos.y + TILE_HEIGHT / 4, // Offset to visual center of tile
  };
}

/**
 * Check if a screen position is within a tile's bounds
 */
export function isPointInTile(screenX: number, screenY: number, tileCol: number, tileRow: number): boolean {
  const tileCenter = getTileCenter(tileCol, tileRow);
  const dx = Math.abs(screenX - tileCenter.x);
  const dy = Math.abs(screenY - tileCenter.y);
  
  // Simple diamond-shaped hit test for isometric tiles
  return (dx / (TILE_WIDTH / 2) + dy / (TILE_HEIGHT / 2)) <= 1;
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
 * Convert isometric movement vector to screen movement
 */
export function isoMovementToScreen(isoX: number, isoY: number): { x: number; y: number } {
  return {
    x: (isoX - isoY) * (TILE_WIDTH / 2),
    y: (isoX + isoY) * (TILE_HEIGHT / 2),
  };
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

export { TILE_WIDTH, TILE_HEIGHT };