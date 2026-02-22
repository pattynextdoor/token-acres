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
    // Create placeholder graphics for sprites
    
    // Terrain tileset (will be replaced with Tiny Swords assets)
    this.load.image('terrain-grass', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');

    // Pawn sprites (colored rectangles for each faction)
    this.createPawnPlaceholder('pawn-blue', '#4a90e2');
    this.createPawnPlaceholder('pawn-red', '#e24a4a');
    this.createPawnPlaceholder('pawn-purple', '#9a4ae2');
    this.createPawnPlaceholder('pawn-yellow', '#e2d14a');

    // Player sprite
    this.createPlayerPlaceholder();

    // Crop sprites
    this.createCropPlaceholders();

    // UI elements
    this.createUIPlaceholders();

    // Buildings
    this.createBuildingPlaceholders();
  }

  private createPawnPlaceholder(key: string, color: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Body
      ctx.fillStyle = color;
      ctx.fillRect(8, 12, 16, 16);
      
      // Head
      ctx.fillStyle = '#ffdbac'; // Skin tone
      ctx.fillRect(10, 4, 12, 12);
      
      // Simple face
      ctx.fillStyle = '#000';
      ctx.fillRect(12, 8, 2, 2); // Left eye
      ctx.fillRect(18, 8, 2, 2); // Right eye
      ctx.fillRect(14, 12, 4, 1); // Mouth
    }

    this.load.image(key, canvas.toDataURL());
  }

  private createPlayerPlaceholder() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Body
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(8, 12, 16, 16);
      
      // Head
      ctx.fillStyle = '#ffdbac';
      ctx.fillRect(10, 4, 12, 12);
      
      // Hat (to distinguish from pawns)
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(10, 4, 12, 6);
      
      // Face
      ctx.fillStyle = '#000';
      ctx.fillRect(12, 8, 2, 2);
      ctx.fillRect(18, 8, 2, 2);
      ctx.fillRect(14, 12, 4, 1);
    }

    this.load.image('player', canvas.toDataURL());
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

  private createBuildingPlaceholders() {
    const buildings = [
      { key: 'house', color: '#8b4513', width: 48, height: 48 },
      { key: 'barn', color: '#a0522d', width: 64, height: 48 },
      { key: 'well', color: '#7f8c8d', width: 32, height: 32 },
    ];

    buildings.forEach(building => {
      const canvas = document.createElement('canvas');
      canvas.width = building.width;
      canvas.height = building.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.fillStyle = building.color;
        ctx.fillRect(0, building.height / 3, building.width, 2 * building.height / 3);
        
        // Roof
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.moveTo(0, building.height / 3);
        ctx.lineTo(building.width / 2, 0);
        ctx.lineTo(building.width, building.height / 3);
        ctx.fill();
      }
      
      this.load.image(building.key, canvas.toDataURL());
    });
  }

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
    this.registry.set('gridSize', 8);
    
    // Start main game scene
    this.scene.start('MapScene', { mapId: 'farm' });
  }
}