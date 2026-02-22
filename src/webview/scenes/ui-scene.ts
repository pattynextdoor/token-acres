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

    // Background panel for HUD
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x000000, 0.7);
    hudBg.fillRoundedRect(10, 10, 300, 120, 8);
    this.hudContainer.add(hudBg);

    // Title
    const title = this.add.text(20, 20, '🌾 Token Acres', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    this.hudContainer.add(title);

    // Seeds counter
    this.seedsText = this.add.text(20, 50, '🌱 Seeds: --', {
      fontSize: '14px',
      color: '#f1c40f'
    });
    this.hudContainer.add(this.seedsText);

    // Pawns counter
    this.pawnsText = this.add.text(20, 70, '👥 Pawns: --', {
      fontSize: '14px',
      color: '#3498db'
    });
    this.hudContainer.add(this.pawnsText);

    // Season indicator
    this.seasonText = this.add.text(20, 90, '🌿 Season: Spring', {
      fontSize: '14px',
      color: '#27ae60'
    });
    this.hudContainer.add(this.seasonText);

    // Efficiency meter
    this.efficiencyText = this.add.text(20, 110, '📊 Efficiency: --%', {
      fontSize: '14px',
      color: '#e67e22'
    });
    this.hudContainer.add(this.efficiencyText);

    // Controls hint (bottom right)
    const controlsText = this.add.text(width - 10, height - 40, 
      'WASD: Move • Click: Move • E: Interact', {
      fontSize: '12px',
      color: '#bdc3c7',
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
      this.seedsText.setText(`🌱 Seeds: ${farmState.economy.seeds}`);
    }

    // Update pawns
    if (this.pawnsText && farmState.pawns) {
      const activePawns = farmState.pawns.filter((p: any) => p.agentSessionId).length;
      const totalPawns = farmState.pawns.length;
      this.pawnsText.setText(`👥 Pawns: ${activePawns}/${totalPawns}`);
    }

    // Update season
    if (this.seasonText && farmState.stats) {
      const season = farmState.stats.currentSeason;
      const emoji = this.getSeasonEmoji(season);
      this.seasonText.setText(`${emoji} Season: ${this.capitalizeFirst(season)}`);
    }

    // Update efficiency
    if (this.efficiencyText && farmState.stats) {
      const efficiency = farmState.stats.lifetimeEfficiency || 0;
      this.efficiencyText.setText(`📊 Efficiency: ${efficiency}%`);
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