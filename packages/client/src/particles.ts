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
   * Pre-render particle texture (called once)
   */
  private renderTexture(): void {
    const ctx = this.textureCtx;
    const centerX = 10;
    const centerY = 10;

    // Draw smaller glowing line texture
    ctx.clearRect(0, 0, 20, 20);

    // Outer glow
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FF6600';
    ctx.strokeStyle = '#FF6600';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(centerX - 8, centerY);
    ctx.lineTo(centerX + 8, centerY);
    ctx.stroke();

    // Bright core
    ctx.shadowBlur = 4;
    ctx.strokeStyle = '#FFaa44';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(centerX - 8, centerY);
    ctx.lineTo(centerX + 8, centerY);
    ctx.stroke();
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

      // Fade out
      particle.life -= 0.02;
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

      // Reset transforms
      ctx.setTransform(1, 0, 0, 1, 0, 0);
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
