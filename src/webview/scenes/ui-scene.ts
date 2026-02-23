import Phaser from 'phaser';
import { MessageBridge } from '../message-bridge';

export class UIScene extends Phaser.Scene {
  private seedsText?: Phaser.GameObjects.Text;
  private pawnsText?: Phaser.GameObjects.Text;
  private seasonText?: Phaser.GameObjects.Text;
  private efficiencyText?: Phaser.GameObjects.Text;
  private tooltip?: Phaser.GameObjects.Container;
  private hudContainer?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    console.log('UI Scene created');

    // Create HUD container
    this.createHUD();

    // Setup message handling for UI updates
    this.setupMessageHandling();

    // Handle screen resize
    this.scale.on('resize', this.handleResize, this);
  }

  private createHUD() {
    const { width, height } = this.scale;

    // Main HUD container
    this.hudContainer = this.add.container(0, 0);
    this.hudContainer.setScrollFactor(0); // Fixed to camera
    this.hudContainer.setDepth(1000); // Always on top

    // Left panel - compact and minimal
    const leftPanel = this.add.graphics();
    leftPanel.fillStyle(0x2c3e50, 0.9);
    leftPanel.fillRoundedRect(10, 10, 180, 80, 6);
    leftPanel.lineStyle(1, 0x34495e);
    leftPanel.strokeRoundedRect(10, 10, 180, 80, 6);
    this.hudContainer.add(leftPanel);

    // Seeds counter (top priority)
    this.seedsText = this.add.text(20, 25, '🌱 --', {
      fontSize: '16px',
      color: '#f1c40f',
      fontStyle: 'bold'
    });
    this.hudContainer.add(this.seedsText);

    // Pawns counter (below seeds)
    this.pawnsText = this.add.text(20, 45, '👥 -- active', {
      fontSize: '14px',
      color: '#3498db'
    });
    this.hudContainer.add(this.pawnsText);

    // Pending harvests indicator (flashing when ready)
    const harvestsContainer = this.add.container(20, 65);
    const harvestIcon = this.add.text(0, 0, '🌾', { fontSize: '14px' });
    const harvestText = this.add.text(20, 0, 'No harvests ready', {
      fontSize: '12px',
      color: '#95a5a6'
    });
    harvestsContainer.add([harvestIcon, harvestText]);
    this.hudContainer.add(harvestsContainer);
    
    // Store reference for harvest indicator updates
    this.setData('harvestContainer', harvestsContainer);
    this.setData('harvestText', harvestText);

    // Right panel - season and efficiency
    const rightPanel = this.add.graphics();
    rightPanel.fillStyle(0x2c3e50, 0.9);
    rightPanel.fillRoundedRect(width - 160, 10, 150, 60, 6);
    rightPanel.lineStyle(1, 0x34495e);
    rightPanel.strokeRoundedRect(width - 160, 10, 150, 60, 6);
    this.hudContainer.add(rightPanel);

    // Season indicator (top right)
    this.seasonText = this.add.text(width - 150, 25, '🌸 Spring', {
      fontSize: '14px',
      color: '#e74c3c',
      fontStyle: 'bold'
    }).setOrigin(0, 0);
    this.hudContainer.add(this.seasonText);

    // Efficiency meter (below season)
    this.efficiencyText = this.add.text(width - 150, 45, '⚡ --%', {
      fontSize: '12px',
      color: '#f39c12'
    }).setOrigin(0, 0);
    this.hudContainer.add(this.efficiencyText);

    // Controls hint (bottom right, smaller and less intrusive)
    const controlsText = this.add.text(width - 10, height - 20, 
      'WASD/Click: Move', {
      fontSize: '10px',
      color: '#7f8c8d',
      align: 'right'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(1000);

    // Create tooltip container (initially hidden)
    this.createTooltip();
  }

  private createTooltip() {
    this.tooltip = this.add.container(0, 0);
    this.tooltip.setScrollFactor(0);
    this.tooltip.setDepth(2000);
    this.tooltip.setVisible(false);

    // Tooltip background
    const tooltipBg = this.add.graphics();
    tooltipBg.fillStyle(0x2c3e50, 0.95);
    tooltipBg.lineStyle(2, 0x34495e);
    tooltipBg.fillRoundedRect(-80, -40, 160, 80, 6);
    tooltipBg.strokeRoundedRect(-80, -40, 160, 80, 6);
    this.tooltip.add(tooltipBg);

    // Tooltip text (will be updated dynamically)
    const tooltipText = this.add.text(0, 0, '', {
      fontSize: '12px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 150 }
    }).setOrigin(0.5);
    this.tooltip.add(tooltipText);
    
    // Store reference for updates
    this.tooltip.setData('text', tooltipText);
    this.tooltip.setData('background', tooltipBg);
  }

  private setupMessageHandling() {
    // Handle state updates
    MessageBridge.on('state-update', (farmState) => {
      this.updateHUD(farmState);
    });

    // Handle inspect results for tooltip
    MessageBridge.on('inspect-result', (data) => {
      this.showTooltip(data);
    });

    // Handle season changes
    MessageBridge.on('season-change', (data) => {
      this.updateSeason(data.season);
    });
  }

  private updateHUD(farmState: any) {
    if (!farmState) return;

    // Update seeds
    if (this.seedsText && farmState.economy) {
      this.seedsText.setText(`🌱 ${farmState.economy.seeds}`);
    }

    // Update pawns
    if (this.pawnsText && farmState.pawns) {
      const activePawns = farmState.pawns.filter((p: any) => p.agentSessionId).length;
      this.pawnsText.setText(`👥 ${activePawns} active`);
    }

    // Update season
    if (this.seasonText && farmState.stats) {
      const season = farmState.stats.currentSeason;
      const emoji = this.getSeasonEmoji(season);
      this.seasonText.setText(`${emoji} ${this.capitalizeFirst(season)}`);
    }

    // Update efficiency
    if (this.efficiencyText && farmState.stats) {
      const efficiency = Math.round(farmState.stats.lifetimeEfficiency || 0);
      this.efficiencyText.setText(`⚡ ${efficiency}%`);
    }

    // Update harvest indicator
    this.updateHarvestIndicator(farmState);
  }

  private updateHarvestIndicator(farmState: any) {
    const harvestText = this.getData('harvestText');
    if (!harvestText || !farmState.farm) return;

    // Count ready crops
    const readyCrops = farmState.farm.plots.filter((plot: any) => 
      plot.crop && plot.crop.stage >= plot.crop.maxStages
    ).length;

    if (readyCrops > 0) {
      harvestText.setText(`${readyCrops} ready to harvest`);
      harvestText.setColor('#e74c3c');
      
      // Add pulsing animation for urgency
      if (!harvestText.getData('pulsing')) {
        harvestText.setData('pulsing', true);
        this.tweens.add({
          targets: harvestText,
          alpha: 0.5,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    } else {
      harvestText.setText('No harvests ready');
      harvestText.setColor('#95a5a6');
      harvestText.setAlpha(1);
      
      // Stop pulsing animation
      if (harvestText.getData('pulsing')) {
        harvestText.setData('pulsing', false);
        this.tweens.killTweensOf(harvestText);
      }
    }
  }

  private updateSeason(season: string) {
    if (this.seasonText) {
      const emoji = this.getSeasonEmoji(season);
      this.seasonText.setText(`${emoji} Season: ${this.capitalizeFirst(season)}`);
    }
  }

  private showTooltip(data: any) {
    if (!this.tooltip) return;

    const tooltipText = this.tooltip.getData('text') as Phaser.GameObjects.Text;
    const tooltipBg = this.tooltip.getData('background') as Phaser.GameObjects.Graphics;

    let text = '';

    if (data.type === 'crop' && data.data) {
      const crop = data.data;
      text = `${this.capitalizeFirst(crop.cropType)}\n`;
      text += `Stage: ${crop.stage}/${crop.maxStages}\n`;
      text += `Quality: ${crop.quality}`;
      
      if (crop.isGolden) {
        text += ' ✨GOLDEN✨';
      }
      
      if (crop.sellValue) {
        text += `\nValue: ${crop.sellValue} seeds`;
      } else if (crop.tasksUntilNext > 0) {
        text += `\nGrowth: ${crop.tasksUntilNext} tasks`;
      }
    } else if (data.type === 'plot' && data.data) {
      const plot = data.data;
      text = `Plot (${data.position.x}, ${data.position.y})\n`;
      text += `Type: ${this.capitalizeFirst(plot.plotType)}\n`;
      text += `Soil: ${plot.soilHealth}%`;
    }

    if (text) {
      tooltipText.setText(text);
      
      // Resize background to fit text
      const bounds = tooltipText.getBounds();
      const padding = 10;
      tooltipBg.clear();
      tooltipBg.fillStyle(0x2c3e50, 0.95);
      tooltipBg.lineStyle(2, 0x34495e);
      tooltipBg.fillRoundedRect(
        -bounds.width / 2 - padding,
        -bounds.height / 2 - padding,
        bounds.width + padding * 2,
        bounds.height + padding * 2,
        6
      );
      tooltipBg.strokeRoundedRect(
        -bounds.width / 2 - padding,
        -bounds.height / 2 - padding,
        bounds.width + padding * 2,
        bounds.height + padding * 2,
        6
      );

      // Position tooltip near mouse/pointer
      const pointer = this.input.activePointer;
      this.tooltip.setPosition(pointer.x + 100, pointer.y);
      this.tooltip.setVisible(true);

      // Auto-hide after 3 seconds
      this.time.delayedCall(3000, () => {
        this.tooltip?.setVisible(false);
      });
    }
  }

  public hideTooltip() {
    if (this.tooltip) {
      this.tooltip.setVisible(false);
    }
  }

  private handleResize(gameSize: any) {
    const { width, height } = gameSize;

    // Reposition controls hint
    const controlsHint = this.children.list.find(child => 
      child instanceof Phaser.GameObjects.Text && 
      child.text.includes('WASD')
    ) as Phaser.GameObjects.Text;

    if (controlsHint) {
      controlsHint.setPosition(width - 10, height - 40);
    }
  }

  private getSeasonEmoji(season: string): string {
    switch (season) {
      case 'spring': return '🌸';
      case 'summer': return '☀️';
      case 'fall': return '🍂';
      case 'winter': return '❄️';
      default: return '🌿';
    }
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}