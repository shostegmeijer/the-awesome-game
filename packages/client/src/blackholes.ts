/**
 * Black hole physics system - pulls players and bullets
 */

interface BlackHole {
  id: string;
  x: number;
  y: number;
  radius: number;
  pullRadius: number;
  strength: number;
  rotationPhase: number;
  pulsePhase: number;
}

export class BlackHoleSystem {
  private blackHoles: BlackHole[] = [];
  private nextId = 0;
  private spawnInterval = 15000; // Spawn every 15 seconds
  private lastSpawnTime = 0;
  private maxBlackHoles = 2;

  /**
   * Update black holes and spawn new ones
   */
  update(currentTime: number): void {
    // Update animations
    this.blackHoles.forEach(hole => {
      hole.rotationPhase += 0.05;
      hole.pulsePhase += 0.08;
    });

    // Spawn new black holes
    if (currentTime - this.lastSpawnTime > this.spawnInterval && this.blackHoles.length < this.maxBlackHoles) {
      this.spawn();
      this.lastSpawnTime = currentTime;
    }
  }

  /**
   * Spawn a black hole at random location
   */
  spawn(): void {
    const padding = 150;
    const x = padding + Math.random() * (window.innerWidth - padding * 2);
    const y = padding + Math.random() * (window.innerHeight - padding * 2);

    this.blackHoles.push({
      id: `blackhole-${this.nextId++}`,
      x,
      y,
      radius: 40,
      pullRadius: 300,
      strength: 0.3,
      rotationPhase: 0,
      pulsePhase: 0
    });

    console.log('🌀 Black hole spawned!');
  }

  /**
   * Apply gravitational pull to a position
   * Returns the force vector to apply
   */
  applyGravity(x: number, y: number): { fx: number; fy: number } {
    let totalFx = 0;
    let totalFy = 0;

    this.blackHoles.forEach(hole => {
      const dx = hole.x - x;
      const dy = hole.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Only pull if within pull radius
      if (distance < hole.pullRadius && distance > 5) {
        // Gravity falls off with distance (inverse square law)
        const force = (hole.strength * hole.pullRadius) / (distance * distance);

        // Direction toward black hole
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        totalFx += fx;
        totalFy += fy;
      }
    });

    return { fx: totalFx, fy: totalFy };
  }

  /**
   * Render all black holes
   */
  render(ctx: CanvasRenderingContext2D): void {
    this.blackHoles.forEach(hole => {
      ctx.save();

      // Outer pull radius (faint)
      const gradient = ctx.createRadialGradient(hole.x, hole.y, hole.radius, hole.x, hole.y, hole.pullRadius);
      gradient.addColorStop(0, 'rgba(138, 43, 226, 0.3)');
      gradient.addColorStop(0.5, 'rgba(138, 43, 226, 0.1)');
      gradient.addColorStop(1, 'rgba(138, 43, 226, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, hole.pullRadius, 0, Math.PI * 2);
      ctx.fill();

      // Rotating spiral effect
      ctx.save();
      ctx.translate(hole.x, hole.y);
      ctx.rotate(hole.rotationPhase);

      const spiralArms = 3;
      for (let arm = 0; arm < spiralArms; arm++) {
        const baseAngle = (Math.PI * 2 * arm) / spiralArms;

        ctx.strokeStyle = 'rgba(138, 43, 226, 0.6)';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#8A2BE2';

        ctx.beginPath();
        for (let i = 0; i < 50; i++) {
          const t = i / 50;
          const angle = baseAngle + t * Math.PI * 2;
          const r = hole.radius + t * (hole.pullRadius - hole.radius);
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();

      // Central black hole
      const pulse = 1 + Math.sin(hole.pulsePhase) * 0.1;

      // Event horizon glow
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#8A2BE2';
      ctx.fillStyle = '#8A2BE2';
      ctx.globalAlpha = 0.8;

      ctx.beginPath();
      ctx.arc(hole.x, hole.y, hole.radius * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Inner black core
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#000000';
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.arc(hole.x, hole.y, hole.radius * 0.7 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Singularity point
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = 0.8;

      ctx.beginPath();
      ctx.arc(hole.x, hole.y, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  /**
   * Get all black holes
   */
  getBlackHoles(): BlackHole[] {
    return this.blackHoles;
  }

  /**
   * Clear all black holes
   */
  clear(): void {
    this.blackHoles = [];
  }
}
