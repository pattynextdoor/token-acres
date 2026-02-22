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
    
    // Load map data
    this.loadMapData();
  }

  private loadPlaceholderAssets() {
    // Load real Tiny Swords assets
    
    // Terrain tilesets (64x64 tiles)
    this.load.image('terrain-tileset', this.getAssetUrl('tilesets/terrain.png'));
    this.load.image('terrain-elevated', this.getAssetUrl('tilesets/terrain-elevated.png'));
    
    // Water assets
    this.load.image('water-bg', this.getAssetUrl('tilesets/water-bg.png'));
    this.load.spritesheet('water-foam', this.getAssetUrl('sprites/water-foam.png'), {
      frameWidth: 192,
      frameHeight: 192
    });

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
    
    // Animated trees (spritesheets)
    this.load.spritesheet('tree1', this.getAssetUrl('sprites/decorations/tree1.png'), {
      frameWidth: 256,
      frameHeight: 256
    });
    this.load.spritesheet('tree2', this.getAssetUrl('sprites/decorations/tree2.png'), {
      frameWidth: 256,
      frameHeight: 256
    });
    this.load.spritesheet('tree3', this.getAssetUrl('sprites/decorations/tree3.png'), {
      frameWidth: 256,
      frameHeight: 192
    });
    this.load.spritesheet('tree4', this.getAssetUrl('sprites/decorations/tree4.png'), {
      frameWidth: 256,
      frameHeight: 192
    });
    
    // Water decorations
    this.load.image('water-rock1', this.getAssetUrl('sprites/decorations/water-rock1.png'));
    this.load.image('water-rock2', this.getAssetUrl('sprites/decorations/water-rock2.png'));
    this.load.image('water-rock3', this.getAssetUrl('sprites/decorations/water-rock3.png'));
    this.load.image('water-rock4', this.getAssetUrl('sprites/decorations/water-rock4.png'));
    this.load.image('rubber-duck', this.getAssetUrl('sprites/decorations/rubber-duck.png'));

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

  private loadMapData() {
    // Generate a simple 8x8 farm map as JSON
    const farmMap = this.generateFarmMap();
    
    // Store map data in cache for MapScene to use
    this.cache.json.add('farm-map', farmMap);
  }

  private generateFarmMap() {
    // Simple 8x8 isometric farm map data
    const gridSize = 8;
    const tileData = [];
    
    // Create base layer (grass)
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        tileData.push(1); // Grass tile ID
      }
    }

    return {
      width: gridSize,
      height: gridSize,
      tilewidth: 64,
      tileheight: 32,
      orientation: 'isometric',
      layers: [
        {
          name: 'Ground',
          width: gridSize,
          height: gridSize,
          data: tileData,
          visible: true,
          opacity: 1,
        }
      ],
      tilesets: [
        {
          firstgid: 1,
          name: 'terrain',
          tilewidth: 64,
          tileheight: 32,
          tilecount: 1,
          image: 'terrain-grass',
        }
      ]
    };
  }

  create() {
    // Initialize game settings
    this.registry.set('gridSize', 16); // Larger world for island + water
    
    // Create animations for new assets
    this.createAnimations();
    
    // Start main game scene
    this.scene.start('MapScene', { mapId: 'farm' });
  }

  private createAnimations() {
    // Water foam animation (16 frames)
    this.anims.create({
      key: 'water-foam-anim',
      frames: this.anims.generateFrameNumbers('water-foam', { start: 0, end: 15 }),
      frameRate: 8,
      repeat: -1
    });

    // Tree animations (gentle swaying)
    // Tree1 & Tree2 have 6 frames each (256x256)
    this.anims.create({
      key: 'tree1-sway',
      frames: this.anims.generateFrameNumbers('tree1', { start: 0, end: 5 }),
      frameRate: 3,
      repeat: -1
    });
    
    this.anims.create({
      key: 'tree2-sway',
      frames: this.anims.generateFrameNumbers('tree2', { start: 0, end: 5 }),
      frameRate: 3,
      repeat: -1
    });

    // Tree3 & Tree4 have 6 frames each (256x192)
    this.anims.create({
      key: 'tree3-sway',
      frames: this.anims.generateFrameNumbers('tree3', { start: 0, end: 5 }),
      frameRate: 3,
      repeat: -1
    });
    
    this.anims.create({
      key: 'tree4-sway',
      frames: this.anims.generateFrameNumbers('tree4', { start: 0, end: 5 }),
      frameRate: 3,
      repeat: -1
    });
  }
}