import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Hide the loading screen from HTML
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }

    // Show loading progress
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    const { width, height } = this.scale;

    progressBox.fillStyle(0x222222);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading Token Acres...', {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);

    const percentText = this.add.text(width / 2, height / 2, '0%', {
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5);

    const assetText = this.add.text(width / 2, height / 2 + 50, '', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x5cb85c);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
      percentText.setText(Math.round(value * 100) + '%');
    });

    this.load.on('fileprogress', (file: any) => {
      assetText.setText('Loading: ' + file.key);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
      assetText.destroy();
    });

    // Load placeholder assets (colored rectangles for now)
    this.loadPlaceholderAssets();
    
  }

  private loadPlaceholderAssets() {
    // Load real Tiny Swords assets

    // Terrain tile — canvas-drawn isometric diamond
    this.createTerrainTile();

    // Pawn spritesheets for each faction (192x192 per frame)
    this.load.spritesheet('pawn-blue-idle', this.getAssetUrl('sprites/pawns/blue/idle.png'), {
      frameWidth: 192,
      frameHeight: 192
    });
    this.load.spritesheet('pawn-blue-run', this.getAssetUrl('sprites/pawns/blue/run.png'), {
      frameWidth: 192,
      frameHeight: 192
    });
    this.load.spritesheet('pawn-blue-work', this.getAssetUrl('sprites/pawns/blue/work.png'), {
      frameWidth: 192,
      frameHeight: 192
    });

    this.load.spritesheet('pawn-red-idle', this.getAssetUrl('sprites/pawns/red/idle.png'), {
      frameWidth: 192,
      frameHeight: 192
    });
    this.load.spritesheet('pawn-red-run', this.getAssetUrl('sprites/pawns/red/run.png'), {
      frameWidth: 192,
      frameHeight: 192
    });
    this.load.spritesheet('pawn-red-work', this.getAssetUrl('sprites/pawns/red/work.png'), {
      frameWidth: 192,
      frameHeight: 192
    });

    this.load.spritesheet('pawn-purple-idle', this.getAssetUrl('sprites/pawns/purple/idle.png'), {
      frameWidth: 192,
      frameHeight: 192
    });
    this.load.spritesheet('pawn-purple-run', this.getAssetUrl('sprites/pawns/purple/run.png'), {
      frameWidth: 192,
      frameHeight: 192
    });
    this.load.spritesheet('pawn-purple-work', this.getAssetUrl('sprites/pawns/purple/work.png'), {
      frameWidth: 192,
      frameHeight: 192
    });

    this.load.spritesheet('pawn-yellow-idle', this.getAssetUrl('sprites/pawns/yellow/idle.png'), {
      frameWidth: 192,
      frameHeight: 192
    });
    this.load.spritesheet('pawn-yellow-run', this.getAssetUrl('sprites/pawns/yellow/run.png'), {
      frameWidth: 192,
      frameHeight: 192
    });
    this.load.spritesheet('pawn-yellow-work', this.getAssetUrl('sprites/pawns/yellow/work.png'), {
      frameWidth: 192,
      frameHeight: 192
    });

    // Use blue pawn as player character
    this.load.spritesheet('player-idle', this.getAssetUrl('sprites/pawns/blue/idle.png'), {
      frameWidth: 192,
      frameHeight: 192
    });
    this.load.spritesheet('player-run', this.getAssetUrl('sprites/pawns/blue/run.png'), {
      frameWidth: 192,
      frameHeight: 192
    });

    // Buildings
    this.load.image('house', this.getAssetUrl('sprites/buildings/house.png'));
    this.load.image('barn', this.getAssetUrl('sprites/buildings/barn.png'));

    // Decorations
    this.load.image('bush1', this.getAssetUrl('sprites/decorations/bush1.png'));
    this.load.image('bush2', this.getAssetUrl('sprites/decorations/bush2.png'));
    this.load.image('rock1', this.getAssetUrl('sprites/decorations/rock1.png'));
    this.load.image('rock2', this.getAssetUrl('sprites/decorations/rock2.png'));

    // Crop sprites (placeholder - use bushes as mature crops for now)
    this.createCropPlaceholders();

    // UI elements
    this.createUIPlaceholders();
  }

  private getAssetUrl(relativePath: string): string {
    // In VS Code webview, assets are accessed via webview URI
    // Use the base path provided by the webview provider
    const basePath = (window as any).assetsBasePath || './assets';
    return `${basePath}/${relativePath}`;
  }

  // Removed old placeholder creation methods - now using real Tiny Swords sprites

  private createCropPlaceholders() {
    const crops = [
      { key: 'crop-turnip', color: '#d4a574' },
      { key: 'crop-potato', color: '#8b7355' },
      { key: 'crop-strawberry', color: '#e74c3c' },
      { key: 'crop-tomato', color: '#e74c3c' },
    ];

    crops.forEach(crop => {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.fillStyle = crop.color;
        ctx.fillRect(4, 4, 8, 8);
        
        // Green stem/leaves
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(6, 2, 4, 6);
      }
      
      this.load.image(crop.key, canvas.toDataURL());
    });
  }

  private createUIPlaceholders() {
    // Seed icon
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(8, 8, 6, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    this.load.image('seed-icon', canvas.toDataURL());
  }

  // Removed building placeholders - now using real Tiny Swords building sprites

  private createTerrainTile() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Green grass diamond
      ctx.fillStyle = '#4a7c3f';
      ctx.beginPath();
      ctx.moveTo(32, 0);   // top
      ctx.lineTo(64, 16);  // right
      ctx.lineTo(32, 32);  // bottom
      ctx.lineTo(0, 16);   // left
      ctx.closePath();
      ctx.fill();

      // Slight highlight on top-left edge
      ctx.strokeStyle = '#5a9c4f';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(32, 1);
      ctx.lineTo(63, 16);
      ctx.stroke();
    }
    this.textures.addCanvas('terrain-tile', canvas);
  }

  create() {
    // Initialize game settings
    this.registry.set('gridSize', 8);
    
    // Start main game scene
    this.scene.start('MapScene', { mapId: 'farm' });
  }
}