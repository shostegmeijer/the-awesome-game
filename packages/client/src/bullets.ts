/**
 * Bullet/projectile system for shooting mechanic
 */

interface Bullet {
  x: number;
  y: number;
  vx: number;  // Velocity X
  vy: number;  // Velocity Y
  lifetime: number; // Time alive in frames
  color: string;
  ownerId: string; // Who shot this bullet
  isRocket?: boolean; // Special rocket projectile
}

export class BulletSystem {
  private bullets: Bullet[] = [];
  private maxBullets = 200;
  private bulletSpeed = 15; // Pixels per frame
  private bulletTexture: HTMLCanvasElement;
  private textureCtx: CanvasRenderingContext2D;

  constructor() {
    // Create pre-rendered bullet texture for performance (shorter bullets)
    this.bulletTexture = document.createElement('canvas');
    this.bulletTexture.width = 18; // Reduced from 30
    this.bulletTexture.height = 10;
    this.textureCtx = this.bulletTexture.getContext('2d')!;

    // Pre-render glowing bullet line
    this.renderTexture();
  }

  /**
   * Pre-render bullet texture with glow (called once - still fast!)
   */
  private renderTexture(): void {
    const ctx = this.textureCtx;

    ctx.clearRect(0, 0, 18, 10);

    // Outer glow with shadowBlur (baked into texture!)
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#00FFFF';
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(16, 5);
    ctx.lineTo(2, 5);
    ctx.stroke();

    // Bright white core
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FFFFFF';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(16, 5);
    ctx.lineTo(2, 5);
    ctx.stroke();
  }

  /**
   * Spawn a bullet from a position in a direction
   */
  shoot(x: number, y: number, angle: number, ownerId: string = 'local', color: string = '#00FFFF', isRocket: boolean = false): void {
    // Calculate velocity from angle
    const vx = Math.cos(angle) * this.bulletSpeed;
    const vy = Math.sin(angle) * this.bulletSpeed;

    this.bullets.push({
      x,
      y,
      vx,
      vy,
      lifetime: 0,
      color,
      ownerId,
      isRocket
    });

    // Remove old bullets if we exceed max
    if (this.bullets.length > this.maxBullets) {
      this.bullets = this.bullets.slice(-this.maxBullets);
    }
  }

  /**
   * Spawn a bullet from network data (already has velocity)
   */
  spawnFromNetwork(x: number, y: number, vx: number, vy: number, ownerId: string, color: string): void {
    this.bullets.push({
      x,
      y,
      vx,
      vy,
      lifetime: 0,
      color,
      ownerId
    });

    // Remove old bullets if we exceed max
    if (this.bullets.length > this.maxBullets) {
      this.bullets = this.bullets.slice(-this.maxBullets);
    }
  }

  /**
   * Update all bullets
   */
  update(): void {
    this.bullets.forEach(bullet => {
      // Move bullet
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      // Increment lifetime
      bullet.lifetime++;
    });

    // Remove bullets that are too old (120 frames = 2 seconds at 60fps)
    // or off-screen
    this.bullets = this.bullets.filter(bullet => {
      if (bullet.lifetime > 120) return false;

      // Remove if way off screen
      if (bullet.x < -100 || bullet.x > window.innerWidth + 100) return false;
      if (bullet.y < -100 || bullet.y > window.innerHeight + 100) return false;

      return true;
    });
  }

  /**
   * Render all bullets using pre-rendered texture (fastest!)
   */
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    this.bullets.forEach(bullet => {
      // Calculate angle based on velocity
      const angle = Math.atan2(bullet.vy, bullet.vx);

      if (bullet.isRocket) {
        // Render rocket as big glowing circle
        ctx.save();
        const pulse = 1 + Math.sin(bullet.lifetime * 0.3) * 0.2;

        // Outer glow
        ctx.globalAlpha = 0.6;
        ctx.shadowBlur = 40;
        ctx.shadowColor = bullet.color;
        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 12 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright core
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#FFFFFF';
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 6 * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      } else {
        // Use texture stamping for regular bullets
        ctx.translate(bullet.x, bullet.y);
        ctx.rotate(angle);
        ctx.drawImage(this.bulletTexture, -9, -5);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    });

    ctx.restore();
  }

  /**
   * Get all bullets (for collision detection later)
   */
  getBullets(): Bullet[] {
    return this.bullets;
  }

  /**
   * Get bullet count
   */
  getCount(): number {
    return this.bullets.length;
  }

  /**
   * Check collision with a target (returns true if hit)
   */
  checkCollision(targetX: number, targetY: number, targetRadius: number, targetId: string): boolean {
    let hit = false;

    this.bullets = this.bullets.filter(bullet => {
      // Don't check collision with own bullets
      if (bullet.ownerId === targetId) {
        return true; // Keep bullet
      }

      // Calculate distance between bullet and target
      const dx = bullet.x - targetX;
      const dy = bullet.y - targetY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if collision occurred
      if (distance < targetRadius) {
        hit = true;
        return false; // Remove bullet
      }

      return true; // Keep bullet
    });

    return hit;
  }

  /**
   * Clear all bullets
   */
  clear(): void {
    this.bullets = [];
  }
}
