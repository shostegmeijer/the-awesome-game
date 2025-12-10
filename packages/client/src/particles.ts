/**
 * Particle system for trail effects
 */

interface Particle {
  x: number;
  y: number;
  vx: number;  // Velocity X
  vy: number;  // Velocity Y
  life: number; // 0 to 1 (1 = just spawned, 0 = dead)
  size: number;
  color: string;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 150; // Further reduced for better performance
  private particleTexture: HTMLCanvasElement;
  private textureCtx: CanvasRenderingContext2D;

  constructor() {
    // Create pre-rendered particle texture for performance
    this.particleTexture = document.createElement('canvas');
    this.particleTexture.width = 20; // Smaller texture
    this.particleTexture.height = 20;
    this.textureCtx = this.particleTexture.getContext('2d')!;

    // Pre-render glowing line texture
    this.renderTexture();
  }

  /**
   * Pre-render particle texture with glow (called once - still fast!)
   */
  private renderTexture(): void {
    const ctx = this.textureCtx;
    const centerX = 10;
    const centerY = 10;

    ctx.clearRect(0, 0, 20, 20);

    // Outer glow with shadowBlur (baked into texture, not per-frame!)
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#FF6600';
    ctx.strokeStyle = '#FF6600';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(centerX - 8, centerY);
    ctx.lineTo(centerX + 8, centerY);
    ctx.stroke();

    // Bright core
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#FFaa44';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(centerX - 8, centerY);
    ctx.lineTo(centerX + 8, centerY);
    ctx.stroke();
  }

  /**
   * Create explosion with fast AND slow particles (slow ones match ring color/speed)
   */
  explode(x: number, y: number, color: string = '#FF6600', particleCount: number = 500): void {
    // Fast particles (2/3 of total) - explosive orange burst
    const fastCount = Math.floor(particleCount * 0.66);
    for (let i = 0; i < fastCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 10 + Math.random() * 40; // 10-50 px/frame
      const spreadAngle = angle + (Math.random() - 0.5) * 0.5;

      this.particles.push({
        x,
        y,
        vx: Math.cos(spreadAngle) * speed,
        vy: Math.sin(spreadAngle) * speed,
        life: 1,
        size: 15 + Math.random() * 25, // 15-40px
        color: '#FF6600' // Orange fast particles
      });
    }

    // Slow particles (1/3 of total) - match ring color and speed
    const slowCount = particleCount - fastCount;
    for (let i = 0; i < slowCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 5; // 4-9 px/frame (match faster ring speed!)
      const spreadAngle = angle + (Math.random() - 0.5) * 0.3;

      this.particles.push({
        x,
        y,
        vx: Math.cos(spreadAngle) * speed,
        vy: Math.sin(spreadAngle) * speed,
        life: 1,
        size: 20 + Math.random() * 30, // 20-50px - larger/slower
        color // Use explosion color (cyan, magenta, etc!)
      });
    }

    // Keep particle count under control
    if (this.particles.length > this.maxParticles * 15) {
      this.particles = this.particles.slice(-this.maxParticles * 15);
    }
  }

  /**
   * Spawn new particles at a position (amount based on movement speed)
   */
  spawn(x: number, y: number, angle: number, color: string = '#FF6600', movementSpeed: number = 1): void {
    // Spawn more particles when moving faster
    // movementSpeed 0-5 pixels/frame → 0-1 particles per frame
    const spawnChance = Math.min(movementSpeed / 8, 1); // Normalize to 0-1

    if (Math.random() > spawnChance) return;

    // Calculate backward direction (opposite of movement)
    const spreadAngle = angle + Math.PI + (Math.random() - 0.5) * 0.5;
    const speed = 2 + Math.random() * 2;

    this.particles.push({
      x,
      y,
      vx: Math.cos(spreadAngle) * speed,
      vy: Math.sin(spreadAngle) * speed,
      life: 1.0,
      size: 6 + Math.random() * 4, // Smaller particles
      color
    });

    // Remove old particles if we exceed max
    if (this.particles.length > this.maxParticles) {
      this.particles = this.particles.slice(-this.maxParticles);
    }
  }

  /**
   * Update all particles
   */
  update(): void {
    this.particles.forEach(particle => {
      // Move particle
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Apply friction (slow down over time)
      particle.vx *= 0.95;
      particle.vy *= 0.95;

      // Fade out - slow particles live longer to match ring expansion
      if (particle.color !== '#FF6600') {
        // Slow colored particles: fade slower to reach same radius as rings (~80 frames)
        particle.life -= 0.0125;
      } else {
        // Fast orange particles: fade quickly (~50 frames)
        particle.life -= 0.02;
      }
    });

    // Remove dead particles
    this.particles = this.particles.filter(p => p.life > 0);
  }

  /**
   * Render all particles using pre-rendered texture (fastest!)
   */
  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    this.particles.forEach(particle => {
      ctx.save(); // Save current transform (camera)

      const alpha = particle.life;
      const scale = particle.life * 0.7;

      // Calculate angle based on velocity
      const angle = Math.atan2(particle.vy, particle.vx);

      // Use texture stamping (much faster than drawing geometry)
      ctx.globalAlpha = alpha;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(angle);
      ctx.scale(scale, scale);

      // Draw pre-rendered texture (adjusted for smaller size)
      ctx.drawImage(this.particleTexture, -10, -10);

      ctx.restore(); // Restore transform (camera)
    });

    ctx.restore();
  }

  /**
   * Get particle count
   */
  getCount(): number {
    return this.particles.length;
  }

  /**
   * Clear all particles
   */
  clear(): void {
    this.particles = [];
  }
}
