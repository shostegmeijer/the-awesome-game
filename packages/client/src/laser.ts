/**
 * Laser beam system for continuous laser weapon
 */

interface LaserBeam {
  getPosition: () => { x: number; y: number }; // Function to get current position
  angle: number;
  lifetime: number;
  maxLifetime: number;
  ownerId: string;
  color: string;
  texture?: HTMLCanvasElement; // Prerendered texture
}

export class LaserSystem {
  private beams: LaserBeam[] = [];
  private beamRange = 2000; // Max beam length
  private laserTextures: Map<string, HTMLCanvasElement> = new Map();

  constructor() {
    // Prerender common laser colors
    this.prerenderLaserTexture('#00FF00'); // Green
    this.prerenderLaserTexture('#00FFFF'); // Cyan
    this.prerenderLaserTexture('#FF00FF'); // Magenta
  }

  /**
   * Prerender a laser beam texture
   */
  private prerenderLaserTexture(color: string): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 60;
    const ctx = canvas.getContext('2d')!;

    const centerY = 30;

    // Outer glow layer
    ctx.globalAlpha = 0.3;
    ctx.shadowBlur = 40;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 20;

    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(2000, centerY);
    ctx.stroke();

    // Middle layer
    ctx.globalAlpha = 0.6;
    ctx.shadowBlur = 25;
    ctx.lineWidth = 12;

    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(2000, centerY);
    ctx.stroke();

    // Core beam
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#FFFFFF';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(2000, centerY);
    ctx.stroke();

    this.laserTextures.set(color, canvas);
  }

  /**
   * Get or create texture for a color
   */
  private getLaserTexture(color: string): HTMLCanvasElement {
    if (!this.laserTextures.has(color)) {
      this.prerenderLaserTexture(color);
    }
    return this.laserTextures.get(color)!;
  }

  /**
   * Fire a laser beam that follows the player
   */
  fire(getPosition: () => { x: number; y: number; rotation: number }, lifetime: number, ownerId: string, color: string): void {
    const posFunc = getPosition;
    const beam: LaserBeam = {
      getPosition: () => {
        const pos = posFunc();
        return { x: pos.x, y: pos.y };
      },
      angle: posFunc().rotation, // Will be updated each frame
      lifetime,
      maxLifetime: lifetime,
      ownerId,
      color,
      texture: this.getLaserTexture(color)
    };

    // Store the position function so we can update angle
    (beam as any).posFunc = posFunc;

    this.beams.push(beam);
  }

  /**
   * Update all beams
   */
  update(): void {
    this.beams.forEach(beam => {
      beam.lifetime--;

      // Update angle from position function
      const posFunc = (beam as any).posFunc;
      if (posFunc) {
        beam.angle = posFunc().rotation;
      }
    });

    // Remove expired beams
    this.beams = this.beams.filter(beam => beam.lifetime > 0);
  }

  /**
   * Check if a target is hit by any beam
   */
  checkCollision(targetX: number, targetY: number, targetRadius: number, targetId: string): boolean {
    for (const beam of this.beams) {
      // Don't hit yourself
      if (beam.ownerId === targetId) continue;

      const pos = beam.getPosition();

      // Calculate beam endpoint
      const endX = pos.x + Math.cos(beam.angle) * this.beamRange;
      const endY = pos.y + Math.sin(beam.angle) * this.beamRange;

      // Check distance from point to line segment
      const distance = this.pointToLineDistance(
        targetX, targetY,
        pos.x, pos.y,
        endX, endY
      );

      if (distance < targetRadius + 5) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calculate distance from point to line segment
   */
  private pointToLineDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Render all beams using prerendered texture
   */
  render(ctx: CanvasRenderingContext2D): void {
    this.beams.forEach(beam => {
      if (!beam.texture) return;

      ctx.save();

      const pos = beam.getPosition();
      const fadeProgress = 1 - (beam.lifetime / beam.maxLifetime);
      const alpha = 1 - fadeProgress * 0.5; // Fade to 50%

      ctx.globalAlpha = alpha;
      ctx.translate(pos.x, pos.y);
      ctx.rotate(beam.angle);

      // Draw prerendered texture
      ctx.drawImage(beam.texture, 0, -30);

      ctx.restore();
    });
  }

  /**
   * Get all active beams
   */
  getBeams(): LaserBeam[] {
    return this.beams;
  }

  /**
   * Clear all beams
   */
  clear(): void {
    this.beams = [];
  }
}
