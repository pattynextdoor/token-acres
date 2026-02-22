import { Grade, TaskRecord, TaskResult } from './types';

export class EfficiencyScorer {
  private history: TaskRecord[];

  constructor(history: TaskRecord[]) {
    this.history = history;
  }

  /**
   * Score a completed task using rolling percentile from history.
   * 
   * Efficiency heuristic: outputLength / duration = output density
   * High density = agent produced a lot quickly = efficient
   * 
   * Without API token data, this is our best proxy for agent efficiency.
   */
  score(result: TaskResult): Grade {
    if (result.manual) {
      return 'B'; // Manual completions always B grade
    }

    // Not enough history - default to B
    if (this.history.length < 10) {
      return 'B';
    }

    // Calculate output density: chars per second
    const durationSec = Math.max(result.duration / 1000, 1);
    const density = (result.outputLength || 100) / durationSec;

    // Get percentile against historical performance
    const historicalDensities = this.history
      .filter(h => h.duration > 0)
      .map(h => (h.outputLength || 100) / (h.duration / 1000));

    historicalDensities.sort((a, b) => a - b);
    const percentile = this.getPercentile(density, historicalDensities);

    // Grade thresholds
    if (percentile >= 90) return 'S';
    if (percentile >= 60) return 'A';
    if (percentile >= 30) return 'B';
    return 'C';
  }

  /**
   * Update internal history with new task record.
   */
  addRecord(record: TaskRecord) {
    this.history.push(record);
    // Keep rolling window of last 50 tasks
    if (this.history.length > 50) {
      this.history.shift();
    }
  }

  /**
   * Get current efficiency percentile (0-100) for display.
   */
  getCurrentEfficiency(): number {
    if (this.history.length === 0) return 50;
    
    const recentTasks = this.history.slice(-10);
    const avgGrade = recentTasks.reduce((sum, task) => {
      switch (task.grade) {
        case 'S': return sum + 4;
        case 'A': return sum + 3;
        case 'B': return sum + 2;
        case 'C': return sum + 1;
        default: return sum + 2;
      }
    }, 0) / recentTasks.length;

    // Convert to percentile (1-4 scale to 0-100)
    return Math.round(((avgGrade - 1) / 3) * 100);
  }

  private getPercentile(value: number, sortedArray: number[]): number {
    if (sortedArray.length === 0) return 50;
    
    let count = 0;
    for (const v of sortedArray) {
      if (v < value) count++;
    }
    return (count / sortedArray.length) * 100;
  }
}