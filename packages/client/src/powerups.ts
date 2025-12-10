/**
 * Power-up spawning and collection system
 */

import { WeaponType, WEAPONS } from './weapons.js';

interface PowerUp {
  id: string;
  x: number;
  y: number;
  weaponType: WeaponType;
  pulsePhase: number;
  collisionRadius: number;
}

export class PowerUpSystem {
  private powerups: PowerUp[] = [];
  private nextId = 0;
  private spawnInterval = 8000; // Spawn every 8 seconds
  private lastSpawnTime = 0;
  private maxPowerUps = 3;

  /**
   * Update power-ups and spawn new ones
   */
  update(currentTime: number): void {
    // Update pulse animation
    this.powerups.forEach(powerup => {
      powerup.pulsePhase += 0.08;
    });

    // Spawn new power-ups
    if (currentTime - this.lastSpawnTime > this.spawnInterval && this.powerups.length < this.maxPowerUps) {
      this.spawn();
      this.lastSpawnTime = currentTime;
    }
  }

  /**
   * Spawn a random power-up at a random location
   */
  spawn(): void {
    const padding = 100;
    const x = padding + Math.random() * (window.innerWidth - padding * 2);
    const y = padding + Math.random() * (window.innerHeight - padding * 2);

    // Random weapon type (exclude machine gun)
    const weaponTypes = [
      WeaponType.TRIPLE_SHOT,
      WeaponType.SNIPER,
      WeaponType.SHOTGUN,
      WeaponType.ROCKET,
      WeaponType.LASER
    ];
    const weaponType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];

    this.powerups.push({
      id: `powerup-${this.nextId++}`,
      x,
      y,
      weaponType,
      pulsePhase: 0,
      collisionRadius: 30
    });

    console.log(`💎 Power-up spawned: ${WEAPONS[weaponType].name}`);
  }

  /**
   * Check if player collects a power-up
   */
  checkCollection(playerX: number, playerY: number): WeaponType | null {
    for (let i = 0; i < this.powerups.length; i++) {
      const powerup = this.powerups[i];
      const dx = playerX - powerup.x;
      const dy = playerY - powerup.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < powerup.collisionRadius + 25) {
        // Collected!
        const weaponType = powerup.weaponType;
        this.powerups.splice(i, 1);
        console.log(`✨ Collected: ${WEAPONS[weaponType].name}`);
        return weaponType;
      }
    }
    return null;
  }

  /**
   * Render all power-ups
   */
  render(ctx: CanvasRenderingContext2D): void {
    this.powerups.forEach(powerup => {
      const weapon = WEAPONS[powerup.weaponType];

      // Pulsing scale
      const scale = 1 + Math.sin(powerup.pulsePhase) * 0.2;
      const size = 30 * scale;

      // Outer glow ring
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.shadowBlur = 20;
      ctx.shadowColor = weapon.color;
      ctx.strokeStyle = weapon.color;
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.arc(powerup.x, powerup.y, size, 0, Math.PI * 2);
      ctx.stroke();

      // Inner bright circle
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = weapon.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#FFFFFF';

      ctx.beginPath();
      ctx.arc(powerup.x, powerup.y, size * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Icon/text
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(weapon.icon, powerup.x, powerup.y);

      // Weapon name below
      ctx.fillStyle = weapon.color;
      ctx.font = 'bold 12px Arial';
      ctx.shadowBlur = 5;
      ctx.shadowColor = '#000000';
      ctx.fillText(weapon.name, powerup.x, powerup.y + size + 15);

      ctx.restore();
    });
  }

  /**
   * Get all power-ups
   */
  getPowerUps(): PowerUp[] {
    return this.powerups;
  }

  /**
   * Clear all power-ups
   */
  clear(): void {
    this.powerups = [];
  }
}
