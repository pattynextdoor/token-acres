import Phaser from 'phaser';
import { Pawn, PawnState } from '../objects/pawn';

export class PawnManager {
  private scene: Phaser.Scene;
  private pawns: Map<string, Pawn> = new Map();
  private idleBehaviorTimer = 0;
  private readonly IDLE_BEHAVIOR_INTERVAL = 8000; // 8 seconds

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    console.log('PawnManager initialized');
  }

  /**
   * Synchronize pawns with state from extension host
   */
  sync(pawnStates: PawnState[]) {
    // Create or update existing pawns
    for (const state of pawnStates) {
      const existingPawn = this.pawns.get(state.id);
      
      if (existingPawn) {
        // Update existing pawn
        existingPawn.updateState(state);
      } else {
        // Create new pawn
        const newPawn = new Pawn(this.scene, state);
        this.pawns.set(state.id, newPawn);
        console.log(`Spawned new pawn: ${state.name} (${state.factionColor})`);
        
        // Play spawn animation
        this.playSpawnAnimation(newPawn);
      }
    }

    // Remove pawns that no longer exist in the state
    const activeIds = new Set(pawnStates.map(p => p.id));
    const pawnsToRemove = [];
    
    for (const [id, pawn] of this.pawns) {
      if (!activeIds.has(id)) {
        pawnsToRemove.push(id);
        this.playDespawnAnimation(pawn, () => {
          pawn.destroy();
        });
      }
    }

    // Clean up removed pawns
    pawnsToRemove.forEach(id => {
      this.pawns.delete(id);
      console.log(`Removed pawn: ${id}`);
    });
  }

  /**
   * Update all pawns
   */
  update(delta: number) {
    // Update each pawn
    for (const pawn of this.pawns.values()) {
      pawn.update(delta);
    }

    // Handle idle behaviors
    this.updateIdleBehavior(delta);
  }

  private updateIdleBehavior(delta: number) {
    this.idleBehaviorTimer += delta;
    
    if (this.idleBehaviorTimer >= this.IDLE_BEHAVIOR_INTERVAL) {
      this.idleBehaviorTimer = 0;
      this.performIdleBehaviors();
    }
  }

  private performIdleBehaviors() {
    // Make some idle pawns wander around
    const idlePawns = Array.from(this.pawns.values()).filter(p => 
      p.pawnState.state === 'idle' && !p.pawnState.agentSessionId
    );

    // Only move 1-2 pawns at a time to avoid chaos
    const pawnsToMove = Math.min(2, Math.ceil(idlePawns.length * 0.3));
    
    for (let i = 0; i < pawnsToMove; i++) {
      const randomPawn = idlePawns[Math.floor(Math.random() * idlePawns.length)];
      if (randomPawn) {
        randomPawn.performIdleBehavior();
      }
    }
  }

  /**
   * Play spawn animation for new pawn
   */
  private playSpawnAnimation(pawn: Pawn) {
    // Start small and scale up
    pawn.setScale(0.1);
    pawn.setAlpha(0.5);

    this.scene.tweens.add({
      targets: pawn,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 600,
      ease: 'Back.easeOut',
    });

    // Bounce effect
    this.scene.tweens.add({
      targets: pawn,
      y: pawn.y - 10,
      duration: 300,
      yoyo: true,
      ease: 'Power2',
    });

    // Spawn particles
    this.createSpawnParticles(pawn.x, pawn.y, pawn.pawnState.factionColor);
  }

  /**
   * Play despawn animation for removed pawn
   */
  private playDespawnAnimation(pawn: Pawn, onComplete: () => void) {
    // Fade out and shrink
    this.scene.tweens.add({
      targets: pawn,
      scaleX: 0.1,
      scaleY: 0.1,
      alpha: 0,
      y: pawn.y - 20,
      duration: 500,
      ease: 'Power2',
      onComplete,
    });

    // Despawn particles
    this.createDespawnParticles(pawn.x, pawn.y);
  }

  /**
   * Create particle effects for pawn spawn
   */
  private createSpawnParticles(x: number, y: number, color: string) {
    const particleCount = 8;
    const colors: Record<string, number> = {
      blue: 0x4a90e2,
      red: 0xe24a4a,
      purple: 0x9a4ae2,
      yellow: 0xe2d14a,
    };

    const particleColor = colors[color] || 0xffffff;

    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.graphics();
      particle.fillStyle(particleColor);
      particle.fillCircle(0, 0, 2);
      particle.setPosition(x, y);

      // Random direction
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 50 + Math.random() * 30;
      const targetX = x + Math.cos(angle) * speed;
      const targetY = y + Math.sin(angle) * speed;

      this.scene.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        duration: 800,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  /**
   * Create particle effects for pawn despawn
   */
  private createDespawnParticles(x: number, y: number) {
    const particleCount = 6;

    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.graphics();
      particle.fillStyle(0xffffff);
      particle.fillCircle(0, 0, 1);
      particle.setPosition(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20);

      this.scene.tweens.add({
        targets: particle,
        y: particle.y - 30,
        alpha: 0,
        duration: 1000,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  /**
   * Get pawn by ID
   */
  getPawn(id: string): Pawn | undefined {
    return this.pawns.get(id);
  }

  /**
   * Get all pawns
   */
  getAllPawns(): Pawn[] {
    return Array.from(this.pawns.values());
  }

  /**
   * Get count of active pawns (those linked to agent sessions)
   */
  getActivePawnCount(): number {
    return Array.from(this.pawns.values()).filter(p => p.pawnState.agentSessionId).length;
  }

  /**
   * Get total pawn count
   */
  getTotalPawnCount(): number {
    return this.pawns.size;
  }

  /**
   * Check if any pawns are currently moving (for performance optimization)
   */
  hasMovingPawns(): boolean {
    return Array.from(this.pawns.values()).some(p => p.pawnState.state === 'walking');
  }

  /**
   * Find pawns near a given position
   */
  getPawnsNear(col: number, row: number, radius: number): Pawn[] {
    return Array.from(this.pawns.values()).filter(pawn => {
      const pos = pawn.pawnState.position;
      const distance = Math.abs(pos.x - col) + Math.abs(pos.y - row);
      return distance <= radius;
    });
  }

  /**
   * Cleanup when scene is destroyed
   */
  destroy() {
    for (const pawn of this.pawns.values()) {
      pawn.destroy();
    }
    this.pawns.clear();
  }
}