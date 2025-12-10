/**
 * Power-up system (Client-side rendering only)
 */

import { PowerUpData, WeaponType } from '@awesome-game/shared';
import { WEAPONS } from './weapons.js';

interface ClientPowerUp extends PowerUpData {
  pulsePhase: number;
  collisionRadius: number; // Keep for rendering size calculations
}

export class PowerUpSystem {
  private powerups: ClientPowerUp[] = [];

  /**
   * Update power-up animations
   */
  update(_currentTime: number): void {
    // Update pulse animation
    this.powerups.forEach(powerup => {
      powerup.pulsePhase += 0.08;
    });
  }

  /**
   * Sync powerups from server
   */
  syncPowerUps(serverPowerUps: PowerUpData[]): void {
    const newPowerUps: ClientPowerUp[] = [];

    serverPowerUps.forEach(serverPowerUp => {
      const existing = this.powerups.find(p => p.id === serverPowerUp.id);
      if (existing) {
        existing.x = serverPowerUp.x;
        existing.y = serverPowerUp.y;
        newPowerUps.push(existing);
      } else {
        newPowerUps.push({
          ...serverPowerUp,
          pulsePhase: Math.random() * Math.PI * 2,
          collisionRadius: 30
        });
      }
    });

    this.powerups = newPowerUps;
    console.log(`💎 Synced ${this.powerups.length} powerups`);
  }

  /**
   * Add a single powerup from server
   */
  addPowerUp(powerUpData: PowerUpData): void {
    this.powerups.push({
      ...powerUpData,
      pulsePhase: 0,
      collisionRadius: 30
    });
    console.log(`💎 Power-up spawned: ${WEAPONS[powerUpData.weaponType].name}`);
  }

  /**
   * Remove a powerup (collected)
   */
  removePowerUp(id: string): void {
    this.powerups = this.powerups.filter(p => p.id !== id);
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
   * Clear all power-ups
   */
  clear(): void {
    this.powerups = [];
  }
}
