import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  private loadingTimedOut = false;

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

    const cleanupUI = () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
      assetText.destroy();
    };

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
      cleanupUI();
    });

    this.load.on('loaderror', (file: any) => {
      console.error(`Failed to load asset: ${file.key} (${file.url})`);
    });

    // Safety timeout: if loading stalls, force-start the game with whatever loaded
    setTimeout(() => {
      if (!this.loadingTimedOut && this.scene.isActive('BootScene')) {
        console.warn('Asset loading timed out after 10s — starting game with partial assets');
        this.loadingTimedOut = true;
        cleanupUI();
        this.startGame();
      }
    }, 10000);

    // Load game assets
    this.loadGameAssets();
  }

  private loadGameAssets() {
    // Essential: terrain and water
    this.load.image('terrain-elevated', this.getAssetUrl('tilesets/terrain-elevated.png'));
    this.load.image('water-bg', this.getAssetUrl('tilesets/water-bg.png'));

    // Essential: player pawn
    this.load.spritesheet('pawn-blue-idle', this.getAssetUrl('sprites/pawns/blue/idle.png'), {
      frameWidth: 192, frameHeight: 192
    });
    this.load.spritesheet('pawn-blue-run', this.getAssetUrl('sprites/pawns/blue/run.png'), {
      frameWidth: 192, frameHeight: 192
    });
    this.load.spritesheet('pawn-blue-work', this.getAssetUrl('sprites/pawns/blue/work.png'), {
      frameWidth: 192, frameHeight: 192
    });

    // Player character (same as blue pawn)
    this.load.spritesheet('player-idle', this.getAssetUrl('sprites/pawns/blue/idle.png'), {
      frameWidth: 192, frameHeight: 192
    });
    this.load.spritesheet('player-run', this.getAssetUrl('sprites/pawns/blue/run.png'), {
      frameWidth: 192, frameHeight: 192
    });

    // Buildings
    this.load.image('house', this.getAssetUrl('sprites/buildings/house.png'));
    this.load.image('barn', this.getAssetUrl('sprites/buildings/barn.png'));

    // Other pawn factions
    this.load.spritesheet('pawn-red-idle', this.getAssetUrl('sprites/pawns/red/idle.png'), {
      frameWidth: 192, frameHeight: 192
    });
    this.load.spritesheet('pawn-red-run', this.getAssetUrl('sprites/pawns/red/run.png'), {
      frameWidth: 192, frameHeight: 192
    });
    this.load.spritesheet('pawn-red-work', this.getAssetUrl('sprites/pawns/red/work.png'), {
      frameWidth: 192, frameHeight: 192
    });
    this.load.spritesheet('pawn-purple-idle', this.getAssetUrl('sprites/pawns/purple/idle.png'), {
      frameWidth: 192, frameHeight: 192
    });
    this.load.spritesheet('pawn-purple-run', this.getAssetUrl('sprites/pawns/purple/run.png'), {
      frameWidth: 192, frameHeight: 192
    });
    this.load.spritesheet('pawn-purple-work', this.getAssetUrl('sprites/pawns/purple/work.png'), {
      frameWidth: 192, frameHeight: 192
    });
    this.load.spritesheet('pawn-yellow-idle', this.getAssetUrl('sprites/pawns/yellow/idle.png'), {
      frameWidth: 192, frameHeight: 192
    });
    this.load.spritesheet('pawn-yellow-run', this.getAssetUrl('sprites/pawns/yellow/run.png'), {
      frameWidth: 192, frameHeight: 192
    });
    this.load.spritesheet('pawn-yellow-work', this.getAssetUrl('sprites/pawns/yellow/work.png'), {
      frameWidth: 192, frameHeight: 192
    });

    // Decorations (non-essential — game works without these)
    this.load.image('rock1', this.getAssetUrl('sprites/decorations/rock1.png'));
    this.load.image('rock2', this.getAssetUrl('sprites/decorations/rock2.png'));
    this.load.spritesheet('water-foam', this.getAssetUrl('sprites/water-foam.png'), {
      frameWidth: 192, frameHeight: 192
    });
    this.load.spritesheet('tree1', this.getAssetUrl('sprites/decorations/tree1.png'), {
      frameWidth: 256, frameHeight: 256
    });
    this.load.spritesheet('tree2', this.getAssetUrl('sprites/decorations/tree2.png'), {
      frameWidth: 256, frameHeight: 256
    });
    this.load.spritesheet('tree3', this.getAssetUrl('sprites/decorations/tree3.png'), {
      frameWidth: 256, frameHeight: 192
    });
    this.load.spritesheet('tree4', this.getAssetUrl('sprites/decorations/tree4.png'), {
      frameWidth: 256, frameHeight: 192
    });
    this.load.image('bush1', this.getAssetUrl('sprites/decorations/bush1.png'));
    this.load.image('bush2', this.getAssetUrl('sprites/decorations/bush2.png'));
    this.load.image('water-rock1', this.getAssetUrl('sprites/decorations/water-rock1.png'));
    this.load.image('water-rock2', this.getAssetUrl('sprites/decorations/water-rock2.png'));
    this.load.image('water-rock3', this.getAssetUrl('sprites/decorations/water-rock3.png'));
    this.load.image('water-rock4', this.getAssetUrl('sprites/decorations/water-rock4.png'));
    this.load.image('rubber-duck', this.getAssetUrl('sprites/decorations/rubber-duck.png'));

    // Canvas-generated textures (no network load)
    this.createCropPlaceholders();
    this.createUIPlaceholders();
  }

  private getAssetUrl(relativePath: string): string {
    const basePath = (window as any).assetsBasePath || './assets';
    return `${basePath}/${relativePath}`;
  }

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
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(6, 2, 4, 6);
      }
      this.textures.addCanvas(crop.key, canvas);
    });
  }

  private createUIPlaceholders() {
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
    this.textures.addCanvas('seed-icon', canvas);
  }

  create() {
    if (this.loadingTimedOut) return; // Already started via timeout
    this.startGame();
  }

  private startGame() {
    this.registry.set('gridSize', 16);
    this.createAnimations();
    this.scene.start('MapScene', { mapId: 'farm' });
  }

  private createAnimations() {
    // Only create animations for textures that actually loaded
    if (this.textures.exists('water-foam')) {
      this.anims.create({
        key: 'water-foam-anim',
        frames: this.anims.generateFrameNumbers('water-foam', { start: 0, end: 15 }),
        frameRate: 8,
        repeat: -1
      });
    }

    const trees = [
      { key: 'tree1', anim: 'tree1-sway', frames: 5 },
      { key: 'tree2', anim: 'tree2-sway', frames: 5 },
      { key: 'tree3', anim: 'tree3-sway', frames: 5 },
      { key: 'tree4', anim: 'tree4-sway', frames: 5 },
    ];

    trees.forEach(tree => {
      if (this.textures.exists(tree.key)) {
        this.anims.create({
          key: tree.anim,
          frames: this.anims.generateFrameNumbers(tree.key, { start: 0, end: tree.frames }),
          frameRate: 3,
          repeat: -1
        });
      }
    });
  }
}
