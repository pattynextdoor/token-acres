import Phaser from 'phaser';

interface AssetDef {
  key: string;
  path: string;
  type: 'image' | 'spritesheet';
  frameWidth?: number;
  frameHeight?: number;
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // All loading happens in create() with timeouts
  }

  async create() {
    // Hide HTML loading overlay
    const loadingElement = document.getElementById('loading');
    if (loadingElement) loadingElement.style.display = 'none';

    // Show progress UI
    const { width, height } = this.scale;
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const progressBar = this.add.graphics();
    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading Token Acres...', {
      fontSize: '20px', color: '#ffffff',
    }).setOrigin(0.5);
    const percentText = this.add.text(width / 2, height / 2, '0%', {
      fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5);
    const assetText = this.add.text(width / 2, height / 2 + 50, '', {
      fontSize: '14px', color: '#ffffff',
    }).setOrigin(0.5);

    const updateProgress = (loaded: number, total: number, currentKey: string) => {
      const pct = total > 0 ? loaded / total : 0;
      progressBar.clear();
      progressBar.fillStyle(0x5cb85c);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * pct, 30);
      percentText.setText(Math.round(pct * 100) + '%');
      assetText.setText('Loading: ' + currentKey);
    };

    const assets = this.getAssetList();
    let loaded = 0;

    const loadAll = async () => {
      for (const asset of assets) {
        updateProgress(loaded, assets.length, asset.key);
        // Race each asset against a 3s timeout — if Image hangs, skip it
        await Promise.race([
          this.loadAsset(asset),
          new Promise<void>(resolve => setTimeout(resolve, 3000)),
        ]);
        loaded++;
      }
    };

    // Race entire loading against an 8s global timeout
    await Promise.race([
      loadAll(),
      new Promise<void>(resolve => setTimeout(resolve, 8000)),
    ]);

    // Canvas-generated textures (instant, no network)
    this.createCropPlaceholders();
    this.createUIPlaceholders();

    // Clean up progress UI
    progressBar.destroy();
    progressBox.destroy();
    loadingText.destroy();
    percentText.destroy();
    assetText.destroy();

    // Start game
    this.registry.set('gridSize', 16);
    this.createAnimations();
    this.scene.start('MapScene', { mapId: 'farm' });
  }

  /** Load a single asset via Image element with a 3-second timeout */
  private async loadAsset(asset: AssetDef): Promise<void> {
    const url = this.getAssetUrl(asset.path);

    try {
      const img = await this.loadImageWithTimeout(url, 3000);

      if (asset.type === 'spritesheet' && asset.frameWidth && asset.frameHeight) {
        const tex = this.textures.addImage(asset.key, img);
        const cols = Math.floor(img.width / asset.frameWidth);
        const rows = Math.floor(img.height / asset.frameHeight);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            tex.add(r * cols + c, 0, c * asset.frameWidth, r * asset.frameHeight, asset.frameWidth, asset.frameHeight);
          }
        }
      } else {
        this.textures.addImage(asset.key, img);
      }
    } catch (err: any) {
      console.warn(`Skipping ${asset.key}: ${err.message}`);
    }
  }

  /** Load an image directly from URL with a timeout (no fetch, no blob) */
  private loadImageWithTimeout(url: string, ms: number): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const timeoutId = setTimeout(() => {
        img.src = '';  // cancel the load
        reject(new Error('timeout'));
      }, ms);
      img.onload = () => {
        clearTimeout(timeoutId);
        resolve(img);
      };
      img.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error('decode error'));
      };
      img.src = url;
    });
  }

  private getAssetUrl(relativePath: string): string {
    const basePath = (window as any).assetsBasePath || './assets';
    return `${basePath}/${relativePath}`;
  }

  private getAssetList(): AssetDef[] {
    const ss = (key: string, path: string, fw: number, fh: number): AssetDef =>
      ({ key, path, type: 'spritesheet', frameWidth: fw, frameHeight: fh });
    const img = (key: string, path: string): AssetDef =>
      ({ key, path, type: 'image' });

    return [
      // Essential — terrain & water
      img('terrain-elevated', 'tilesets/terrain-elevated.png'),
      img('water-bg', 'tilesets/water-bg.png'),

      // Essential — player & blue pawn
      ss('pawn-blue-idle', 'sprites/pawns/blue/idle.png', 192, 192),
      ss('pawn-blue-run', 'sprites/pawns/blue/run.png', 192, 192),
      ss('pawn-blue-work', 'sprites/pawns/blue/work.png', 192, 192),
      ss('player-idle', 'sprites/pawns/blue/idle.png', 192, 192),
      ss('player-run', 'sprites/pawns/blue/run.png', 192, 192),

      // Buildings
      img('house', 'sprites/buildings/house.png'),
      img('barn', 'sprites/buildings/barn.png'),

      // Other factions
      ss('pawn-red-idle', 'sprites/pawns/red/idle.png', 192, 192),
      ss('pawn-red-run', 'sprites/pawns/red/run.png', 192, 192),
      ss('pawn-red-work', 'sprites/pawns/red/work.png', 192, 192),
      ss('pawn-purple-idle', 'sprites/pawns/purple/idle.png', 192, 192),
      ss('pawn-purple-run', 'sprites/pawns/purple/run.png', 192, 192),
      ss('pawn-purple-work', 'sprites/pawns/purple/work.png', 192, 192),
      ss('pawn-yellow-idle', 'sprites/pawns/yellow/idle.png', 192, 192),
      ss('pawn-yellow-run', 'sprites/pawns/yellow/run.png', 192, 192),
      ss('pawn-yellow-work', 'sprites/pawns/yellow/work.png', 192, 192),

      // Crop sprites (16x16 frames, 80x32 or 80x48 spritesheets)
      ss('crop-carrot', 'sprites/crops/carrot.png', 16, 16),
      ss('crop-parsnip', 'sprites/crops/parsnip.png', 16, 16),
      ss('crop-potato', 'sprites/crops/potato.png', 16, 16),
      ss('crop-pepper', 'sprites/crops/pepper.png', 16, 16),
      ss('crop-tomato', 'sprites/crops/tomato.png', 16, 16),
      ss('crop-pumpkin', 'sprites/crops/pumpkin.png', 16, 16),
      ss('crop-sunflower', 'sprites/crops/sunflower.png', 16, 16),
      ss('crop-appletree', 'sprites/crops/appletree.png', 16, 16),
      ss('crop-lemontree', 'sprites/crops/lemontree.png', 16, 16),
      ss('crop-dead', 'sprites/crops/dead.png', 16, 16),

      // UI Icons spritesheet
      ss('ui-icons', 'ui/icons.png', 16, 16),

      // Decorations
      img('rock1', 'sprites/decorations/rock1.png'),
      img('rock2', 'sprites/decorations/rock2.png'),
      ss('water-foam', 'sprites/water-foam.png', 192, 192),
      ss('tree1', 'sprites/decorations/tree1.png', 192, 256),
      ss('tree2', 'sprites/decorations/tree2.png', 192, 256),
      ss('tree3', 'sprites/decorations/tree3.png', 192, 192),
      ss('tree4', 'sprites/decorations/tree4.png', 192, 192),
      img('bush1', 'sprites/decorations/bush1.png'),
      img('bush2', 'sprites/decorations/bush2.png'),
      img('water-rock1', 'sprites/decorations/water-rock1.png'),
      img('water-rock2', 'sprites/decorations/water-rock2.png'),
      img('water-rock3', 'sprites/decorations/water-rock3.png'),
      img('water-rock4', 'sprites/decorations/water-rock4.png'),
      img('rubber-duck', 'sprites/decorations/rubber-duck.png'),
    ];
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

  private createAnimations() {
    if (this.textures.exists('water-foam')) {
      this.anims.create({
        key: 'water-foam-anim',
        frames: this.anims.generateFrameNumbers('water-foam', { start: 0, end: 15 }),
        frameRate: 8,
        repeat: -1
      });
    }

    const trees = [
      { key: 'tree1', anim: 'tree1-sway', frames: 7 },
      { key: 'tree2', anim: 'tree2-sway', frames: 7 },
      { key: 'tree3', anim: 'tree3-sway', frames: 7 },
      { key: 'tree4', anim: 'tree4-sway', frames: 7 },
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
