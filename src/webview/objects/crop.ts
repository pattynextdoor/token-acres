import Phaser from 'phaser';
import { gridToScreen, isoDepth } from '../utils/isometric';

export interface CropState {
  type: string;
  stage: number;
  maxStages: number;
  quality: 'S' | 'A' | 'B' | 'C';
  isGolden: boolean;
  tasksUntilNextStage: number;
}

export class Crop extends Phaser.GameObjects.Sprite {
  public cropState: CropState;
  private scene: Phaser.Scene;
  private gridPosition: { col: number; row: number };
  private qualityIndicator?: Phaser.GameObjects.Graphics;
  private goldenEffect?: Phaser.GameObjects.Graphics;
  private progressBar?: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, col: number, row: number, cropState: CropState) {
    const pos = gridToScreen(col, row);
    
    // Determine sprite key based on crop type and stage
    const spriteKey = `crop-${cropState.type}`;
    
    super(scene, pos.x, pos.y, spriteKey);
    
    this.scene = scene;
    this.cropState = cropState;
    this.gridPosition = { col, row };
    this.setDepth(isoDepth(col, row, 0.5)); // Behind pawns, above ground

    scene.add.existing(this);

    // Create visual indicators
    this.createQualityIndicator();
    this.createProgressBar();
    this.updateVisuals();

    console.log(`Crop ${cropState.type} planted at (${col}, ${row}) - Stage ${cropState.stage}/${cropState.maxStages}`);
  }

  private createQualityIndicator() {
    this.qualityIndicator = this.scene.add.graphics();
    this.qualityIndicator.setDepth(this.depth + 0.1);
  }

  private createProgressBar() {
    this.progressBar = this.scene.add.graphics();
    this.progressBar.setDepth(this.depth + 0.1);
  }

  /**
   * Update crop with new state
   */
  updateState(newCropState: CropState) {
    const oldStage = this.cropState.stage;
    this.cropState = newCropState;

    // Update sprite if stage changed significantly
    if (Math.floor(oldStage) !== Math.floor(newCropState.stage)) {
      this.updateSprite();
    }

    this.updateVisuals();
  }

  private updateSprite() {
    // Update sprite based on growth stage
    const stageProgress = this.cropState.stage / this.cropState.maxStages;
    
    if (stageProgress >= 1.0) {
      // Fully grown - use mature sprite
      this.setFrame(0); // Assuming frame 0 is mature
    } else if (stageProgress >= 0.75) {
      // Near mature
      this.setFrame(0);
    } else if (stageProgress >= 0.5) {
      // Growing
      this.setFrame(0);
    } else if (stageProgress >= 0.25) {
      // Sprout
      this.setFrame(0);
    } else {
      // Seedling
      this.setFrame(0);
    }

    // Scale based on growth
    const scale = 0.4 + (stageProgress * 0.6); // Scale from 0.4 to 1.0
    this.setScale(scale);
  }

  private updateVisuals() {
    this.updateQualityIndicator();
    this.updateProgressBar();
    this.updateGoldenEffect();
  }

  private updateQualityIndicator() {
    if (!this.qualityIndicator) return;

    this.qualityIndicator.clear();

    // Show quality as colored border around crop
    let color = 0xffffff;
    switch (this.cropState.quality) {
      case 'S': color = 0xff6b35; break; // Orange/gold
      case 'A': color = 0x4ecdc4; break; // Teal
      case 'B': color = 0x95e1d3; break; // Light teal
      case 'C': color = 0xf7f7f7; break; // White
    }

    // Draw thin border around crop
    this.qualityIndicator.lineStyle(1, color, 0.8);
    this.qualityIndicator.strokeRect(
      this.x - this.width * this.scaleX / 2,
      this.y - this.height * this.scaleY / 2,
      this.width * this.scaleX,
      this.height * this.scaleY
    );

    // Quality letter indicator
    if (this.cropState.quality === 'S' || this.cropState.quality === 'A') {
      const text = this.scene.add.text(
        this.x + 8,
        this.y - 8,
        this.cropState.quality,
        {
          fontSize: '8px',
          color: `#${color.toString(16)}`,
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 1,
        }
      );
      text.setDepth(this.depth + 0.2);
      
      // Auto-destroy after 2 seconds
      this.scene.time.delayedCall(2000, () => text.destroy());
    }
  }

  private updateProgressBar() {
    if (!this.progressBar) return;

    this.progressBar.clear();

    // Only show progress bar if crop is not fully grown
    if (this.cropState.stage >= this.cropState.maxStages) {
      return;
    }

    // Calculate progress within current stage
    const stageProgress = this.cropState.stage / this.cropState.maxStages;
    
    if (stageProgress < 1.0) {
      const barWidth = 20;
      const barHeight = 3;
      const barX = this.x - barWidth / 2;
      const barY = this.y + this.height / 2 + 5;

      // Background
      this.progressBar.fillStyle(0x000000, 0.5);
      this.progressBar.fillRect(barX, barY, barWidth, barHeight);

      // Progress
      this.progressBar.fillStyle(0x27ae60);
      this.progressBar.fillRect(barX, barY, barWidth * stageProgress, barHeight);

      // Border
      this.progressBar.lineStyle(1, 0xffffff, 0.8);
      this.progressBar.strokeRect(barX, barY, barWidth, barHeight);
    }
  }

  private updateGoldenEffect() {
    if (this.cropState.isGolden) {
      if (!this.goldenEffect) {
        this.goldenEffect = this.scene.add.graphics();
        this.goldenEffect.setDepth(this.depth + 0.3);
      }

      this.goldenEffect.clear();
      
      // Pulsing golden aura
      const time = this.scene.time.now;
      const pulseAlpha = 0.3 + 0.2 * Math.sin(time * 0.005);
      
      this.goldenEffect.fillStyle(0xffd700, pulseAlpha);
      this.goldenEffect.fillCircle(this.x, this.y, 20);

      // Sparkle particles
      if (Math.random() < 0.1) {
        this.createSparkle();
      }
    } else if (this.goldenEffect) {
      this.goldenEffect.destroy();
      this.goldenEffect = undefined;
    }
  }

  private createSparkle() {
    const sparkle = this.scene.add.graphics();
    sparkle.setDepth(this.depth + 0.4);
    
    const sparkleX = this.x + (Math.random() - 0.5) * 30;
    const sparkleY = this.y + (Math.random() - 0.5) * 30;
    
    sparkle.fillStyle(0xffffff);
    sparkle.fillCircle(sparkleX, sparkleY, 2);

    // Animate sparkle
    this.scene.tweens.add({
      targets: sparkle,
      alpha: 0,
      y: sparkleY - 20,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => sparkle.destroy(),
    });
  }

  /**
   * Handle hover/inspection
   */
  onHover() {
    // Highlight crop on hover
    this.setTint(0xdddddd);
    
    // Show detailed info
    const info = {
      type: 'crop',
      position: this.gridPosition,
      data: {
        cropType: this.cropState.type,
        stage: this.cropState.stage,
        maxStages: this.cropState.maxStages,
        quality: this.cropState.quality,
        isGolden: this.cropState.isGolden,
        tasksUntilNext: this.cropState.tasksUntilNextStage,
      }
    };

    // Notify scene about inspection (will send to extension host)
    if ('inspectTile' in this.scene) {
      (this.scene as any).inspectTile(this.gridPosition.col, this.gridPosition.row);
    }
  }

  onHoverEnd() {
    this.clearTint();
  }

  /**
   * Check if crop is ready for harvest
   */
  isReadyForHarvest(): boolean {
    return this.cropState.stage >= this.cropState.maxStages;
  }

  /**
   * Get harvest animation
   */
  playHarvestAnimation(onComplete?: () => void) {
    // Bounce and fade out animation
    this.scene.tweens.add({
      targets: [this, this.qualityIndicator, this.progressBar, this.goldenEffect],
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
      onComplete: () => {
        this.scene.tweens.add({
          targets: [this, this.qualityIndicator, this.progressBar, this.goldenEffect],
          alpha: 0,
          y: this.y - 20,
          duration: 400,
          ease: 'Power2',
          onComplete: () => {
            onComplete?.();
          },
        });
      },
    });
  }

  /**
   * Clean up when crop is removed
   */
  destroy(fromScene?: boolean) {
    this.qualityIndicator?.destroy();
    this.progressBar?.destroy();
    this.goldenEffect?.destroy();
    super.destroy(fromScene);
  }
}