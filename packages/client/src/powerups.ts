/**
 * Power-up system (Client-side rendering only)
 */

import { PowerUpData } from '@awesome-game/shared';
import { WeaponType as ClientWeaponType, WEAPONS } from './weapons.js';

interface ClientPowerUp extends PowerUpData {
  pulsePhase: number;
  collisionRadius: number; // Keep for rendering size calculations
}

export class PowerUpSystem {
  private powerups: ClientPowerUp[] = [];
  private powerupCanvases: Map<string, HTMLCanvasElement> = new Map();

  constructor() {
    this.prerenderPowerUps();
  }

  private prerenderPowerUps(): void {
    Object.values(WEAPONS).forEach(weapon => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      const centerX = 50;
      const centerY = 50;

      // Setup stroke style - no fills, only outlines
      ctx.strokeStyle = weapon.color;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = weapon.color;
      ctx.lineCap = 'round';

      // Render bullet pattern preview based on weapon properties
      if (weapon.type === ClientWeaponType.MACHINE_GUN) {
        // Single line (1 bullet, no spread)
        ctx.beginPath();
        ctx.moveTo(centerX - 20, centerY);
        ctx.lineTo(centerX + 20, centerY);
        ctx.stroke();

      } else if (weapon.type === ClientWeaponType.TRIPLE_SHOT) {
        // 3 lines with spread pattern
        const bulletLength = 18;
        const spread = 0.2;
        for (let i = 0; i < 3; i++) {
          const angle = -spread + (spread * i);
          const startX = centerX - Math.cos(angle) * bulletLength;
          const startY = centerY - Math.sin(angle) * bulletLength;
          const endX = centerX + Math.cos(angle) * bulletLength;
          const endY = centerY + Math.sin(angle) * bulletLength;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }

      } else if (weapon.type === ClientWeaponType.SHOTGUN) {
        // Wide spread fan (simplified - show 7 lines instead of 20)
        const bulletLength = 20;
        const totalSpread = 0.8; // Wide spread angle
        const displayBullets = 7;
        for (let i = 0; i < displayBullets; i++) {
          const angle = -totalSpread / 2 + (totalSpread * i / (displayBullets - 1));
          const startX = centerX;
          const startY = centerY;
          const endX = centerX + Math.cos(angle) * bulletLength;
          const endY = centerY + Math.sin(angle) * bulletLength;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }

      } else if (weapon.type === ClientWeaponType.ROCKET) {
        // Large single projectile (diamond shape)
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - 18);
        ctx.lineTo(centerX + 18, centerY);
        ctx.lineTo(centerX, centerY + 18);
        ctx.lineTo(centerX - 18, centerY);
        ctx.closePath();
        ctx.stroke();

      } else if (weapon.type === ClientWeaponType.LASER) {
        // Long continuous beam
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centerX - 25, centerY);
        ctx.lineTo(centerX + 25, centerY);
        ctx.stroke();

        // Side decorative lines
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          const offset = -10 + i * 10;
          ctx.beginPath();
          ctx.moveTo(centerX - 22, centerY + offset);
          ctx.lineTo(centerX + 22, centerY + offset);
          ctx.stroke();
        }
      }

      // Universal circle frame for ALL powerups (consistent visual language)
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
      ctx.stroke();

      // Inner circle for extra depth
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 26, 0, Math.PI * 2);
      ctx.stroke();

      this.powerupCanvases.set(weapon.type, canvas);
    });
  }

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
      const canvas = this.powerupCanvases.get(powerup.weaponType);

      if (canvas) {
        // Pulsing scale
        const scale = 1 + Math.sin(powerup.pulsePhase) * 0.2;

        ctx.save();
        ctx.translate(powerup.x, powerup.y);
        ctx.scale(scale, scale);
        ctx.drawImage(canvas, -50, -50);
        ctx.restore();

        // Weapon name below (still dynamic text, but simpler)
        ctx.save();
        ctx.fillStyle = weapon.color;
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#000000';
        ctx.fillText(weapon.name, powerup.x, powerup.y + 30 * scale + 15);
        ctx.restore();
      }
    });
  }

  /**
   * Clear all power-ups
   */
  clear(): void {
    this.powerups = [];
  }
}
