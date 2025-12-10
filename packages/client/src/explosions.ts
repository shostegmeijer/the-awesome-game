/**
 * Explosion effects system for death animations
 */

interface ExplosionRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number; // 0 to 1
  color: string;
  speed: number;
}

export class ExplosionSystem {
  private rings: ExplosionRing[] = [];
  private ringTextures: Map<string, HTMLCanvasElement> = new Map();

  constructor() {
    // Prerender ring textures for common colors
    this.prerenderRingTexture('#FF6600'); // Orange
    this.prerenderRingTexture('#00FFFF'); // Cyan
    this.prerenderRingTexture('#FF00FF'); // Magenta
    this.prerenderRingTexture('#FFFF00'); // Yellow
    this.prerenderRingTexture('#00FF00'); // Green
  }

  /**
   * Prerender a ring texture with glow (called once per color - still fast!)
   */
  private prerenderRingTexture(color: string): void {
    const size = 600; // Large texture we can scale down
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 60; // Leave room for glow

    // Outer ring with massive glow (baked into texture!)
    ctx.shadowBlur = 30;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Bright white inner ring
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#FFFFFF';
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#FFFFFF';

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    this.ringTextures.set(color, canvas);
  }

  /**
   * Get or create texture for a color
   */
  private getRingTexture(color: string): HTMLCanvasElement {
    if (!this.ringTextures.has(color)) {
      this.prerenderRingTexture(color);
    }
    return this.ringTextures.get(color)!;
  }

  /**
   * Create explosion with expanding rings
   */
  explode(x: number, y: number, color: string = '#FF6600', ringCount: number = 4): void {
    for (let i = 0; i < ringCount; i++) {
      this.rings.push({
        x,
        y,
        radius: 0,
        maxRadius: 250 + i * 150, // Big but fewer - up to 700px
        life: 1,
        color,
        speed: 4 + i * 1.5 // MUCH faster - 4-8.5 px/frame
      });
    }
  }

  /**
   * Update all explosion rings
   */
  update(): void {
    this.rings.forEach(ring => {
      // Expand ring
      ring.radius += ring.speed;

      // Fade out as it reaches max size
      const progress = ring.radius / ring.maxRadius;
      ring.life = 1 - progress;
    });

    // Remove dead rings
    this.rings = this.rings.filter(ring => ring.radius < ring.maxRadius);
  }

  /**
   * Render all explosion rings using prerendered textures
   */
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    this.rings.forEach(ring => {
      // Blinking effect - fade in and out rapidly
      const blink = Math.sin(ring.radius * 0.3) * 0.5 + 0.5;
      const alpha = ring.life * blink;

      // Get prerendered texture
      const texture = this.getRingTexture(ring.color);
      const textureSize = texture.width;

      // Calculate scale to match desired radius
      // Texture has radius of (size/2 - 40), we want ring.radius
      const textureRadius = textureSize / 2 - 40;
      const scale = ring.radius / textureRadius;

      // Draw scaled texture
      ctx.globalAlpha = alpha;
      ctx.translate(ring.x, ring.y);
      ctx.scale(scale, scale);
      ctx.drawImage(texture, -textureSize / 2, -textureSize / 2);

      // Reset transforms
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    });

    ctx.restore();
  }

  /**
   * Get ring count (for debugging)
   */
  getCount(): number {
    return this.rings.length;
  }

  /**
   * Clear all rings
   */
  clear(): void {
    this.rings = [];
  }
}
