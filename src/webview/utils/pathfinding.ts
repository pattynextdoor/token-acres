// A* pathfinding algorithm for isometric grid movement

interface Node {
  col: number;
  row: number;
  g: number; // Distance from start
  h: number; // Heuristic distance to goal
  f: number; // Total cost (g + h)
  parent?: Node;
}

/**
 * Find path from start to goal using A* algorithm
 */
export function findPath(
  start: { col: number; row: number },
  goal: { col: number; row: number },
  walkableGrid: boolean[][] // [col][row] = isWalkable
): Array<{ col: number; row: number }> {
  
  if (!walkableGrid || walkableGrid.length === 0) {
    return []; // No valid grid
  }

  const gridWidth = walkableGrid.length;
  const gridHeight = walkableGrid[0].length;

  // Bounds check
  if (start.col < 0 || start.col >= gridWidth || start.row < 0 || start.row >= gridHeight ||
      goal.col < 0 || goal.col >= gridWidth || goal.row < 0 || goal.row >= gridHeight) {
    return []; // Out of bounds
  }

  // Can't path to unwalkable tile
  if (!walkableGrid[goal.row][goal.col]) {
    return []; // Goal is not walkable
  }

  // Already at goal
  if (start.col === goal.col && start.row === goal.row) {
    return [start];
  }

  const openSet: Node[] = [];
  const closedSet: Set<string> = new Set();

  const startNode: Node = {
    col: start.col,
    row: start.row,
    g: 0,
    h: heuristic(start, goal),
    f: 0,
  };
  startNode.f = startNode.g + startNode.h;
  openSet.push(startNode);

  while (openSet.length > 0) {
    // Find node with lowest f cost
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    const currentKey = `${current.col},${current.row}`;

    if (current.col === goal.col && current.row === goal.row) {
      // Path found, reconstruct it
      return reconstructPath(current);
    }

    closedSet.add(currentKey);

    // Check all 4 neighbors (no diagonal movement)
    const neighbors = [
      { col: current.col + 1, row: current.row },
      { col: current.col - 1, row: current.row },
      { col: current.col, row: current.row + 1 },
      { col: current.col, row: current.row - 1 },
    ];

    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.col},${neighbor.row}`;

      // Skip if out of bounds
      if (neighbor.col < 0 || neighbor.col >= gridWidth ||
          neighbor.row < 0 || neighbor.row >= gridHeight) {
        continue;
      }

      // Skip if not walkable
      if (!walkableGrid[neighbor.row][neighbor.col]) {
        continue;
      }

      // Skip if already processed
      if (closedSet.has(neighborKey)) {
        continue;
      }

      const tentativeG = current.g + 1; // Each step costs 1

      // Check if neighbor is already in open set
      let existingNeighbor = openSet.find(n => n.col === neighbor.col && n.row === neighbor.row);
      
      if (!existingNeighbor) {
        // New node
        const newNode: Node = {
          col: neighbor.col,
          row: neighbor.row,
          g: tentativeG,
          h: heuristic(neighbor, goal),
          f: 0,
          parent: current,
        };
        newNode.f = newNode.g + newNode.h;
        openSet.push(newNode);
      } else if (tentativeG < existingNeighbor.g) {
        // Better path to existing node
        existingNeighbor.g = tentativeG;
        existingNeighbor.f = existingNeighbor.g + existingNeighbor.h;
        existingNeighbor.parent = current;
      }
    }
  }

  // No path found
  return [];
}

/**
 * Manhattan distance heuristic
 */
function heuristic(a: { col: number; row: number }, b: { col: number; row: number }): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

/**
 * Reconstruct path from goal node back to start
 */
function reconstructPath(goalNode: Node): Array<{ col: number; row: number }> {
  const path = [];
  let current: Node | undefined = goalNode;

  while (current) {
    path.unshift({ col: current.col, row: current.row });
    current = current.parent;
  }

  return path;
}

/**
 * Generate a basic walkable grid for a farm
 * Returns true for tiles that pawns can walk on
 */
export function generateFarmWalkableGrid(
  gridSize: number,
  plots: Array<{ x: number; y: number; type: string }>,
  buildings: Array<{ position: { x: number; y: number } }>
): boolean[][] {
  
  const grid: boolean[][] = [];

  // Initialize all tiles as walkable
  for (let col = 0; col < gridSize; col++) {
    grid[col] = [];
    for (let row = 0; row < gridSize; row++) {
      grid[col][row] = true;
    }
  }

  // Mark building tiles as unwalkable
  buildings.forEach(building => {
    const { x, y } = building.position;
    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
      grid[x][y] = false;
    }
  });

  // Water tiles are unwalkable
  plots.forEach(plot => {
    if (plot.type === 'water') {
      if (plot.x >= 0 && plot.x < gridSize && plot.y >= 0 && plot.y < gridSize) {
        grid[plot.x][plot.y] = false;
      }
    }
  });

  return grid;
}

/**
 * Find the nearest walkable tile to a given position
 */
export function findNearestWalkable(
  target: { col: number; row: number },
  walkableGrid: boolean[][],
  maxSearchRadius: number = 5
): { col: number; row: number } | null {
  
  if (!walkableGrid || walkableGrid.length === 0) {
    return null;
  }

  const gridWidth = walkableGrid.length;
  const gridHeight = walkableGrid[0].length;

  // Check if target is already walkable
  if (target.col >= 0 && target.col < gridWidth &&
      target.row >= 0 && target.row < gridHeight &&
      walkableGrid[target.col][target.row]) {
    return target;
  }

  // Search in expanding rings
  for (let radius = 1; radius <= maxSearchRadius; radius++) {
    for (let col = target.col - radius; col <= target.col + radius; col++) {
      for (let row = target.row - radius; row <= target.row + radius; row++) {
        // Only check the perimeter of the current ring
        if (Math.abs(col - target.col) === radius || Math.abs(row - target.row) === radius) {
          if (col >= 0 && col < gridWidth && row >= 0 && row < gridHeight &&
              walkableGrid[col][row]) {
            return { col, row };
          }
        }
      }
    }
  }

  return null; // No walkable tile found
}