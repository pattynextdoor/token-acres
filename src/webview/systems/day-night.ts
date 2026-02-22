import Phaser from 'phaser';

export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export interface TimeState {
  hour: number;        // 0-23
  minute: number;      // 0-59
  day: number;         // Day of season
  season: Season;
}

export class DayNightSystem {
  private overlay: Phaser.GameObjects.Rectangle;
  private currentHour = 6;  // Start at 6 AM (dawn)
  private dayLength = 120_000; // 2 minutes = 1 full day
  private timer = 0;
  private season: Season = 'spring';
  
  // Lighting configuration per season
  private readonly seasonConfig = {
    spring: {
      dayColor: { r: 1.0, g: 1.0, b: 1.0 },      // Bright white
      nightColor: { r: 0.2, g: 0.3, b: 0.6 },    // Cool blue night
      dawnColor: { r: 1.0, g: 0.8, b: 0.6 },     // Warm orange dawn
      duskColor: { r: 0.8, g: 0.5, b: 0.3 },     // Orange dusk
    },
    summer: {
      dayColor: { r: 1.0, g: 1.0, b: 0.9 },      // Slightly warm white
      nightColor: { r: 0.1, g: 0.2, b: 0.4 },    // Darker night
      dawnColor: { r: 1.0, g: 0.9, b: 0.7 },     // Golden dawn
      duskColor: { r: 0.9, g: 0.6, b: 0.4 },     // Golden dusk
    },
    fall: {
      dayColor: { r: 0.9, g: 0.9, b: 0.8 },      // Slightly muted
      nightColor: { r: 0.2, g: 0.2, b: 0.4 },    // Purple-ish night
      dawnColor: { r: 0.9, g: 0.7, b: 0.5 },     // Amber dawn
      duskColor: { r: 0.8, g: 0.4, b: 0.2 },     // Deep orange dusk
    },
    winter: {
      dayColor: { r: 0.8, g: 0.9, b: 1.0 },      // Cool white
      nightColor: { r: 0.1, g: 0.1, b: 0.3 },    // Deep blue night
      dawnColor: { r: 0.8, g: 0.8, b: 0.9 },     // Cool dawn
      duskColor: { r: 0.6, g: 0.6, b: 0.8 },     // Cool dusk
    },
  };

  constructor(private scene: Phaser.Scene) {
    this.createOverlay();
    this.updateLighting();
  }

  private createOverlay() {
    // Create a fullscreen rectangle for lighting overlay
    const { width, height } = this.scene.cameras.main;
    
    this.overlay = this.scene.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.0);
    this.overlay.setOrigin(0.5, 0.5);
    this.overlay.setScrollFactor(0); // Stay fixed to camera
    this.overlay.setDepth(1000); // Above everything
    this.overlay.setBlendMode(Phaser.BlendModes.MULTIPLY);
    
    // Handle camera resize
    this.scene.scale.on('resize', this.onResize, this);
  }

  private onResize() {
    const { width, height } = this.scene.cameras.main;
    this.overlay.setSize(width * 2, height * 2);
  }

  update(time: number) {
    this.timer += this.scene.game.loop.delta;
    
    // Calculate hour progression (0-24 hours over dayLength milliseconds)
    const dayProgress = (this.timer % this.dayLength) / this.dayLength;
    this.currentHour = Math.floor(dayProgress * 24);
    
    this.updateLighting();
  }

  private updateLighting() {
    const config = this.seasonConfig[this.season];
    const hour = this.currentHour;
    
    let color: { r: number; g: number; b: number };
    let alpha: number;
    
    if (hour >= 6 && hour <= 18) {
      // Daytime (6 AM to 6 PM)
      const dayProgress = (hour - 6) / 12;
      
      if (hour <= 8) {
        // Dawn transition (6-8 AM)
        const dawnProgress = (hour - 6) / 2;
        color = this.lerpColor(config.dawnColor, config.dayColor, dawnProgress);
        alpha = 0.3 - (0.3 * dawnProgress); // 0.3 → 0
      } else if (hour >= 16) {
        // Dusk transition (4-6 PM)  
        const duskProgress = (hour - 16) / 2;
        color = this.lerpColor(config.dayColor, config.duskColor, duskProgress);
        alpha = 0.2 * duskProgress; // 0 → 0.2
      } else {
        // Full daylight (8 AM - 4 PM)
        color = config.dayColor;
        alpha = 0;
      }
    } else {
      // Nighttime
      if (hour <= 6) {
        // Late night to dawn (0-6 AM)
        const nightProgress = hour / 6;
        if (hour <= 2) {
          // Deep night (0-2 AM)
          color = config.nightColor;
          alpha = 0.6;
        } else {
          // Pre-dawn (2-6 AM)
          const preDawnProgress = (hour - 2) / 4;
          color = this.lerpColor(config.nightColor, config.dawnColor, preDawnProgress);
          alpha = 0.6 - (0.3 * preDawnProgress); // 0.6 → 0.3
        }
      } else {
        // Evening to night (6 PM - midnight)
        const eveningProgress = (hour - 18) / 6;
        if (hour <= 20) {
          // Dusk to evening (6-8 PM)
          const duskProgress = (hour - 18) / 2;
          color = this.lerpColor(config.duskColor, config.nightColor, duskProgress);
          alpha = 0.2 + (0.4 * duskProgress); // 0.2 → 0.6
        } else {
          // Deep night (8 PM - midnight)
          color = config.nightColor;
          alpha = 0.6;
        }
      }
    }
    
    // Apply lighting to overlay
    const tint = Phaser.Display.Color.GetColor(
      Math.floor(color.r * 255),
      Math.floor(color.g * 255), 
      Math.floor(color.b * 255)
    );
    
    this.overlay.setTint(tint);
    this.overlay.setAlpha(alpha);
    
    // Position overlay relative to camera
    const cam = this.scene.cameras.main;
    this.overlay.setPosition(cam.worldView.centerX, cam.worldView.centerY);
  }

  private lerpColor(
    color1: { r: number; g: number; b: number },
    color2: { r: number; g: number; b: number },
    t: number
  ): { r: number; g: number; b: number } {
    return {
      r: color1.r + (color2.r - color1.r) * t,
      g: color1.g + (color2.g - color1.g) * t,
      b: color1.b + (color2.b - color1.b) * t,
    };
  }

  // Public API
  
  updateSeason(newSeason: Season) {
    if (this.season !== newSeason) {
      this.season = newSeason;
      console.log(`Day/night system updated for ${newSeason} season`);
      
      // Could add seasonal transition effects here
      this.addSeasonTransitionEffect();
    }
  }
  
  private addSeasonTransitionEffect() {
    // Brief flash to indicate season change
    this.scene.cameras.main.flash(200, 255, 255, 255, false);
    
    // Could add particle effects, weather changes, etc.
  }

  getCurrentTime(): TimeState {
    const minutesInDay = (this.timer % this.dayLength) / this.dayLength * 1440; // 1440 minutes per day
    const hour = Math.floor(minutesInDay / 60);
    const minute = Math.floor(minutesInDay % 60);
    
    return {
      hour,
      minute,
      day: Math.floor(this.timer / this.dayLength) + 1,
      season: this.season,
    };
  }

  getTimeString(): string {
    const time = this.getCurrentTime();
    const ampm = time.hour >= 12 ? 'PM' : 'AM';
    const displayHour = time.hour === 0 ? 12 : time.hour > 12 ? time.hour - 12 : time.hour;
    return `${displayHour}:${time.minute.toString().padStart(2, '0')} ${ampm}`;
  }

  isDay(): boolean {
    return this.currentHour >= 6 && this.currentHour < 18;
  }

  isNight(): boolean {
    return !this.isDay();
  }

  // Fast-forward time for debugging/testing
  setTime(hour: number) {
    this.currentHour = Phaser.Math.Clamp(hour, 0, 23);
    this.timer = (this.currentHour / 24) * this.dayLength;
    this.updateLighting();
  }

  // Speed up/slow down time
  setTimeScale(scale: number) {
    this.dayLength = 120_000 / scale; // Normal is 2 minutes = 1 day
  }

  destroy() {
    this.scene.scale.off('resize', this.onResize, this);
    this.overlay.destroy();
  }
}