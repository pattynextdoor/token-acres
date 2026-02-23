import Phaser from 'phaser';
import { Crop, CropState } from '../objects/crop';

export interface PlotState {
  x: number;
  y: number;
  type: 'empty' | 'tilled' | 'planted' | 'path' | 'building' | 'water';
  crop?: CropState;
  soilHealth: number;
}

export class CropManager {
  private scene: Phaser.Scene;
  private crops: Map<string, Crop> = new Map();
  private plotIndicators: Map<string, Phaser.GameObjects.Graphics> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    console.log('CropManager initialized');
  }

  /**
   * Synchronize crops with plot states from extension host
   */
  sync(plotStates: PlotState[]) {
    const activeKeys = new Set<string>();

    for (const plot of plotStates) {
      const key = `${plot.x},${plot.y}`;
      activeKeys.add(key);

      if (plot.type === 'planted' && plot.crop) {
        const existingCrop = this.crops.get(key);
        
        if (existingCrop) {
          // Update existing crop
          existingCrop.updateState(plot.crop);
        } else {
          // Create new crop
          const newCrop = new Crop(this.scene, plot.x, plot.y, plot.crop);
          this.crops.set(key, newCrop);
          this.createPlantingEffect(plot.x, plot.y);
          console.log(`Planted ${plot.crop.type} at (${plot.x}, ${plot.y})`);
        }
      } else {
        // No crop on this plot - remove if exists
        const existingCrop = this.crops.get(key);
        if (existingCrop) {
          if (existingCrop.isReadyForHarvest()) {
            // Play harvest animation
            existingCrop.playHarvestAnimation(() => {
              existingCrop.destroy();
            });
            this.createHarvestEffect(plot.x, plot.y, existingCrop.cropState);
          } else {
            // Crop was removed/wilted
            existingCrop.destroy();
          }
          this.crops.delete(key);
        }
      }

      // Update plot indicator
      this.updatePlotIndicator(plot);
    }

    // Remove crops that are no longer in the state
    for (const [key, crop] of this.crops) {
      if (!activeKeys.has(key)) {
        crop.destroy();
        this.crops.delete(key);
      }
    }

    // Remove plot indicators that are no longer needed
    for (const [key, indicator] of this.plotIndicators) {
      if (!activeKeys.has(key)) {
        indicator.destroy();
        this.plotIndicators.delete(key);
      }
    }
  }

  /**
   * Update visual indicators for plot states
   */
  private updatePlotIndicator(plot: PlotState) {
    const key = `${plot.x},${plot.y}`;
    const gridToScreen = (col: number, row: number) => ({
      x: col * 64,
      y: row * 64,
    });
    const pos = gridToScreen(plot.x, plot.y);

    let indicator = this.plotIndicators.get(key);
    
    if (!indicator) {
      indicator = this.scene.add.graphics();
      indicator.setDepth(-0.5); // Below crops, above ground
      this.plotIndicators.set(key, indicator);
    }

    indicator.clear();

    // Draw plot base
    switch (plot.type) {
      case 'tilled':
        // Soil health-based coloring
        let soilColor: number;
        let soilAlpha = 0.8;
        
        if (plot.soilHealth > 70) {
          soilColor = 0x8b4513; // Rich brown - healthy
        } else if (plot.soilHealth >= 40) {
          soilColor = 0xa0522d; // Lighter brown - medium
        } else {
          soilColor = 0xd2b48c; // Grayish/pale - depleted
          soilAlpha = 0.6;
        }
        
        indicator.fillStyle(soilColor, soilAlpha);
        indicator.fillRect(pos.x, pos.y, 64, 64);
        
        // Health indicator bar at top of plot
        const healthWidth = (plot.soilHealth / 100) * 44;
        const healthColor = plot.soilHealth > 70 ? 0x27ae60 : 
                           plot.soilHealth >= 40 ? 0xf39c12 : 0xe74c3c;
        
        // Background bar
        indicator.fillStyle(0x2c3e50, 0.6);
        indicator.fillRect(pos.x + 10, pos.y - 5, 44, 3);
        
        // Health bar
        indicator.fillStyle(healthColor, 0.8);
        indicator.fillRect(pos.x + 10, pos.y - 5, healthWidth, 3);
        break;
        
      case 'water':
        // Blue water
        indicator.fillStyle(0x3498db, 0.8);
        indicator.fillRect(pos.x, pos.y, 64, 64);
        
        // Subtle wave animation
        const time = this.scene.time.now * 0.002;
        indicator.fillStyle(0x5dade2, 0.4);
        indicator.fillRect(pos.x, pos.y + Math.sin(time) * 2, 64, 20);
        break;
        
      case 'path':
        // Stone path
        indicator.fillStyle(0x95a5a6, 0.9);
        indicator.fillRect(pos.x, pos.y, 64, 64);
        break;
        
      case 'empty':
        // Just grass - subtle green tint
        indicator.fillStyle(0x27ae60, 0.1);
        indicator.fillRect(pos.x, pos.y, 64, 64);
        break;
    }

    // Add hover detection for plot interaction
    if (plot.type === 'tilled' && !plot.crop) {
      // Show plantable indicator on hover
      indicator.setInteractive(new Phaser.Geom.Rectangle(pos.x, pos.y, 64, 64), 
        Phaser.Geom.Rectangle.Contains);
      
      indicator.on('pointerover', () => {
        indicator.lineStyle(2, 0xf1c40f, 0.8);
        indicator.strokeRect(pos.x, pos.y, 64, 64);
      });
      
      indicator.on('pointerout', () => {
        this.updatePlotIndicator(plot); // Redraw without border
      });
    }

    indicator.setPosition(0, 0);
  }

  /**
   * Update all crops
   */
  update(delta: number) {
    for (const crop of this.crops.values()) {
      // Individual crop updates are handled by the Crop class itself
      // This is where we could add system-wide effects like wind, etc.
    }
  }

  /**
   * Create planting effect particles
   */
  private createPlantingEffect(col: number, row: number) {
    const gridToScreen = (c: number, r: number) => ({
      x: c * 64 + 32,
      y: r * 64 + 32,
    });
    const pos = gridToScreen(col, row);

    // Dirt particles
    const particleCount = 5;
    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.graphics();
      particle.fillStyle(0x8b4513);
      particle.fillCircle(0, 0, 1 + Math.random());
      
      const startX = pos.x + (Math.random() - 0.5) * 30;
      const startY = pos.y + (Math.random() - 0.5) * 15;
      particle.setPosition(startX, startY);

      this.scene.tweens.add({
        targets: particle,
        y: startY - 10 - Math.random() * 10,
        alpha: 0,
        duration: 800 + Math.random() * 400,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  /**
   * Create harvest effect particles
   */
  private createHarvestEffect(col: number, row: number, cropState: CropState) {
    const gridToScreen = (c: number, r: number) => ({
      x: c * 64 + 32,
      y: r * 64 + 32,
    });
    const pos = gridToScreen(col, row);

    // Quality determines particle color and count
    let particleColor = 0x27ae60; // Default green
    let particleCount = 3;

    switch (cropState.quality) {
      case 'S':
        particleColor = 0xf39c12;
        particleCount = 8;
        break;
      case 'A':
        particleColor = 0x3498db;
        particleCount = 6;
        break;
      case 'B':
        particleColor = 0x27ae60;
        particleCount = 4;
        break;
      case 'C':
        particleColor = 0x95a5a6;
        particleCount = 2;
        break;
    }

    // Golden crops get special effect
    if (cropState.isGolden) {
      particleColor = 0xffd700;
      particleCount *= 2;
      
      // Extra sparkle burst
      for (let i = 0; i < 12; i++) {
        const sparkle = this.scene.add.graphics();
        sparkle.fillStyle(0xffffff);
        sparkle.fillStar(0, 0, 4, 2, 4, 0);
        sparkle.setPosition(pos.x, pos.y);

        const angle = (Math.PI * 2 * i) / 12;
        const distance = 40 + Math.random() * 20;
        
        this.scene.tweens.add({
          targets: sparkle,
          x: pos.x + Math.cos(angle) * distance,
          y: pos.y + Math.sin(angle) * distance,
          rotation: Math.PI * 2,
          alpha: 0,
          duration: 1200,
          ease: 'Power2',
          onComplete: () => sparkle.destroy(),
        });
      }
    }

    // Standard harvest particles
    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.graphics();
      particle.fillStyle(particleColor);
      particle.fillCircle(0, 0, 2 + Math.random() * 2);
      particle.setPosition(pos.x, pos.y);

      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * 30;
      
      this.scene.tweens.add({
        targets: particle,
        x: pos.x + Math.cos(angle) * distance,
        y: pos.y + Math.sin(angle) * distance - 20,
        alpha: 0,
        duration: 1000 + Math.random() * 500,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }

    // Show harvest value text
    this.showHarvestValue(pos.x, pos.y, cropState);
  }

  /**
   * Show floating text for harvest value
   */
  private showHarvestValue(x: number, y: number, cropState: CropState) {
    // Estimate value (simplified - actual calculation is in extension host)
    const baseValue = { turnip: 5, potato: 8, strawberry: 15, tomato: 12 }[cropState.type] || 5;
    let value = baseValue;
    
    switch (cropState.quality) {
      case 'S': value *= 1.5; break;
      case 'A': value *= 1.2; break;
      case 'C': value *= 0.7; break;
    }
    
    if (cropState.isGolden) value *= 3;

    let text = `+${Math.round(value)} 🌱`;
    let color = '#f1c40f';
    let fontSize = '14px';
    
    if (cropState.isGolden) {
      text = `✨ ${text} ✨`;
      color = '#ffd700';
      fontSize = '16px';
    } else if (cropState.quality === 'S') {
      color = '#f39c12';
      fontSize = '15px';
    }

    const valueText = this.scene.add.text(x, y - 15, text, {
      fontSize,
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100);

    // More dramatic animation for better visibility
    this.scene.tweens.add({
      targets: valueText,
      y: y - 50,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 2500,
      ease: 'Power2',
      onComplete: () => valueText.destroy(),
    });

    // Add small bounce at start
    this.scene.tweens.add({
      targets: valueText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Get crop at position
   */
  getCropAt(col: number, row: number): Crop | undefined {
    return this.crops.get(`${col},${row}`);
  }

  /**
   * Get all crops
   */
  getAllCrops(): Crop[] {
    return Array.from(this.crops.values());
  }

  /**
   * Count crops by type
   */
  getCropCount(cropType?: string): number {
    if (cropType) {
      return Array.from(this.crops.values())
        .filter(crop => crop.cropState.type === cropType).length;
    }
    return this.crops.size;
  }

  /**
   * Count ready crops
   */
  getReadyCropCount(): number {
    return Array.from(this.crops.values())
      .filter(crop => crop.isReadyForHarvest()).length;
  }

  /**
   * Cleanup when scene is destroyed
   */
  destroy() {
    for (const crop of this.crops.values()) {
      crop.destroy();
    }
    this.crops.clear();

    for (const indicator of this.plotIndicators.values()) {
      indicator.destroy();
    }
    this.plotIndicators.clear();
  }
}