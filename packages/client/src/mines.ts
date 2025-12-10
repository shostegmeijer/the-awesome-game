/**
 * Mine system - explosive hazards that can be triggered by players or bullets
 */

interface Mine {
  id: string;
  x: number;
  y: number;
  radius: number;
  damageRadius: number;
  damage: number;
  pulsePhase: number;
  blinkPhase: number;
}

export class MineSystem {
  private mines: Mine[] = [];
  private nextId = 0;
  private spawnInterval = 10000; // Spawn every 10 seconds
  private lastSpawnTime = 0;
  private maxMines = 5;
  private mineRadius = 20;
  private damageRadius = 120;
  private mineDamage = 40;

  /**
   * Update mines and spawn new ones
   */
  update(currentTime: number): void {
    // Update animations
    this.mines.forEach(mine => {
      mine.pulsePhase += 0.08;
      mine.blinkPhase += 0.15;
    });

    // Spawn new mines
    if (currentTime - this.lastSpawnTime > this.spawnInterval && this.mines.length < this.maxMines) {
      this.spawn();
      this.lastSpawnTime = currentTime;
    }
  }

  /**
   * Spawn a mine at random location
   */
  spawn(): void {
    const padding = 100;
    const x = padding + Math.random() * (window.innerWidth - padding * 2);
    const y = padding + Math.random() * (window.innerHeight - padding * 2);

    this.mines.push({
      id: `mine-${this.nextId++}`,
      x,
      y,
      radius: this.mineRadius,
      damageRadius: this.damageRadius,
      damage: this.mineDamage,
      pulsePhase: 0,
      blinkPhase: 0
    });

    console.log('💣 Mine spawned!');
  }

  /**
   * Check if bullet hits a mine
   * Returns the mine that was hit, or null
   */
  checkBulletCollision(bulletX: number, bulletY: number): Mine | null {
    for (let i = 0; i < this.mines.length; i++) {
      const mine = this.mines[i];
      const dx = bulletX - mine.x;
      const dy = bulletY - mine.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < mine.radius) {
        // Hit! Remove mine and return it
        const hitMine = this.mines[i];
        this.mines.splice(i, 1);
        return hitMine;
      }
    }
    return null;
  }

  /**
   * Check if player collides with a mine
   * Returns the mine that was hit, or null
   */
  checkPlayerCollision(playerX: number, playerY: number, playerRadius: number): Mine | null {
    for (let i = 0; i < this.mines.length; i++) {
      const mine = this.mines[i];
      const dx = playerX - mine.x;
      const dy = playerY - mine.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < mine.radius + playerRadius) {
        // Hit! Remove mine and return it
        const hitMine = this.mines[i];
        this.mines.splice(i, 1);
        return hitMine;
      }
    }
    return null;
  }

  /**
   * Get all players/entities within explosion radius
   */
  getExplosionTargets(mineX: number, mineY: number, radius: number, targets: Array<{ x: number; y: number; id: string }>): string[] {
    const hitTargets: string[] = [];

    targets.forEach(target => {
      const dx = target.x - mineX;
      const dy = target.y - mineY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < radius) {
        hitTargets.push(target.id);
      }
    });

    return hitTargets;
  }

  /**
   * Check if explosion hits other mines (for chain reactions)
   * Returns array of mines that were hit
   */
  checkExplosionHitsMines(explosionX: number, explosionY: number, explosionRadius: number): Mine[] {
    const hitMines: Mine[] = [];

    for (let i = this.mines.length - 1; i >= 0; i--) {
      const mine = this.mines[i];
      const dx = mine.x - explosionX;
      const dy = mine.y - explosionY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < explosionRadius) {
        hitMines.push(mine);
        this.mines.splice(i, 1); // Remove the mine
      }
    }

    return hitMines;
  }

  /**
   * Render all mines
   */
  render(ctx: CanvasRenderingContext2D): void {
    this.mines.forEach(mine => {
      ctx.save();

      const pulse = 1 + Math.sin(mine.pulsePhase) * 0.2;
      const blink = 0.7 + Math.sin(mine.blinkPhase) * 0.3; // 0.4 to 1.0

      // Outer glow layer
      ctx.globalAlpha = 0.4 * blink;
      ctx.shadowBlur = 40;
      ctx.shadowColor = '#FF1493';
      ctx.strokeStyle = '#FF1493';
      ctx.lineWidth = 8;

      ctx.beginPath();
      ctx.arc(mine.x, mine.y, mine.radius * pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Middle glow layer
      ctx.globalAlpha = 0.6 * blink;
      ctx.shadowBlur = 30;
      ctx.strokeStyle = '#FF69B4';
      ctx.lineWidth = 5;

      ctx.beginPath();
      ctx.arc(mine.x, mine.y, mine.radius * pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Inner bright circle
      ctx.globalAlpha = 1 * blink;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#FFFFFF';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(mine.x, mine.y, mine.radius * pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    });
  }

  /**
   * Get all mines
   */
  getMines(): Mine[] {
    return this.mines;
  }

  /**
   * Remove a specific mine by ID
   */
  removeMine(id: string): void {
    this.mines = this.mines.filter(m => m.id !== id);
  }

  /**
   * Clear all mines
   */
  clear(): void {
    this.mines = [];
  }
}
