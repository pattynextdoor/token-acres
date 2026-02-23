import Phaser from 'phaser';
import { gridToScreen, topDownDepth } from '../utils/grid';

export interface CropState {
  type: string;
  stage: number;
  maxStages: number;
  quality: 'S' | 'A' | 'B' | 'C';
  isGolden: boolean;
  tasksUntilNextStage: number;
}

export class Crop extends Phaser.GameObjects.Container {
  public cropState: CropState;
  private scene: Phaser.Scene;
  private gridPosition: { col: number; row: number };
  private cropSprite: Phaser.GameObjects.Sprite;
  private qualityIndicator?: Phaser.GameObjects.Graphics;
  private goldenEffect?: Phaser.GameObjects.Graphics;
  private progressBar?: Phaser.GameObjects.Graphics;
  private bounceAnimation?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, col: number, row: number, cropState: CropState) {
    const pos = gridToScreen(col, row);
    
    super(scene, pos.x + 32, pos.y + 32); // Center on tile
    
    this.scene = scene;
    this.cropState = cropState;
    this.gridPosition = { col, row };
    this.setDepth(topDownDepth(col, row, 0.5)); // Behind pawns, above ground

    // Create the main crop sprite
    const spriteKey = this.getSpriteKey(cropState.type);
    this.cropSprite = scene.add.sprite(0, 0, spriteKey, 0);
    this.cropSprite.setScale(3); // Scale 16x16 sprites to ~48x48 for visibility
    this.add(this.cropSprite);

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

    // Update graphics if stage changed significantly
    if (Math.floor(oldStage) !== Math.floor(newCropState.stage)) {
      this.updateCropGraphics();
    }

    this.updateVisuals();
  }

  private getSpriteKey(cropType: string): string {
    // Map crop types to their sprite keys
    const spriteKeys: Record<string, string> = {
      'carrot': 'crop-carrot',
      'parsnip': 'crop-parsnip',
      'potato': 'crop-potato',
      'pepper': 'crop-pepper',
      'tomato': 'crop-tomato',
      'pumpkin': 'crop-pumpkin',
      'sunflower': 'crop-sunflower',
      'appletree': 'crop-appletree',
      'lemontree': 'crop-lemontree',
    };
    return spriteKeys[cropType] || 'crop-potato'; // fallback
  }

  private updateCropGraphics() {
    if (!this.cropSprite) return;
    
    const stageProgress = this.cropState.stage / this.cropState.maxStages;
    // Map progress to sprite frames (0-4 for growth stages)
    let frame = Math.min(4, Math.floor(stageProgress * 5));
    
    // For harvestable crops, use the final frame
    if (this.cropState.stage >= this.cropState.maxStages) {
      frame = 4; // Final growth stage
      this.startHarvestableAnimation();
    }
    
    this.cropSprite.setFrame(frame);
    
    // Apply golden tint effect
    if (this.cropState.isGolden) {
      const time = this.scene.time.now;
      const pulseIntensity = 0.7 + 0.3 * Math.sin(time * 0.005);
      this.cropSprite.setTint(0xffd700);
      this.cropSprite.setAlpha(pulseIntensity);
    } else {
      this.cropSprite.clearTint();
      this.cropSprite.setAlpha(1);
    }
  }

  private updateVisuals() {
    this.updateCropGraphics();
    this.updateQualityIndicator();
    this.updateProgressBar();
    this.updateGoldenEffect();
  }
  
  private startHarvestableAnimation() {
    // Stop any existing animation
    if (this.bounceAnimation) {
      this.bounceAnimation.destroy();
    }
    
    // Subtle bounce/pulse animation for harvestable crops
    this.bounceAnimation = this.scene.tweens.add({
      targets: this,
      y: this.y - 2,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
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
    // Highlight crop on hover by adding a white outline
    const highlightGraphics = this.scene.add.graphics();
    highlightGraphics.lineStyle(2, 0xffffff, 0.8);
    highlightGraphics.strokeCircle(this.x, this.y, 12);
    highlightGraphics.setDepth(this.depth + 0.1);
    this.setData('highlight', highlightGraphics);
    
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
    const highlight = this.getData('highlight');
    if (highlight) {
      highlight.destroy();
      this.setData('highlight', null);
    }
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
    // Stop bounce animation if active
    if (this.bounceAnimation) {
      this.bounceAnimation.destroy();
      this.bounceAnimation = undefined;
    }
    
    // Bounce and fade out animation
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
      onComplete: () => {
        this.scene.tweens.add({
          targets: this,
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
    // Stop any active animations
    if (this.bounceAnimation) {
      this.bounceAnimation.destroy();
    }
    
    // Clean up graphics and sprites
    this.cropSprite?.destroy();
    this.qualityIndicator?.destroy();
    this.progressBar?.destroy();
    this.goldenEffect?.destroy();
    
    // Clean up hover highlight if it exists
    const highlight = this.getData('highlight');
    if (highlight) {
      highlight.destroy();
    }
    
    super.destroy(fromScene);
  }
}