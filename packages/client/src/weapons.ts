/**
 * Weapon system for different shooting types
 */

export enum WeaponType {
  MACHINE_GUN = 'machineGun',
  TRIPLE_SHOT = 'tripleShot',
  SNIPER = 'sniper',
  SHOTGUN = 'shotgun',
  ROCKET = 'rocket',
  LASER = 'laser'
}

export interface WeaponConfig {
  type: WeaponType;
  name: string;
  color: string;
  cooldown: number;
  damage: number;
  bulletSpeed: number;
  bulletCount: number;
  spread: number;
  bulletLifetime: number;
  icon: string;
}

export const WEAPONS: Record<WeaponType, WeaponConfig> = {
  [WeaponType.MACHINE_GUN]: {
    type: WeaponType.MACHINE_GUN,
    name: 'Machine Gun',
    color: '#00FFFF',
    cooldown: 150,
    damage: 15,
    bulletSpeed: 15,
    bulletCount: 1,
    spread: 0,
    bulletLifetime: 120,
    icon: '🔫'
  },
  [WeaponType.TRIPLE_SHOT]: {
    type: WeaponType.TRIPLE_SHOT,
    name: 'Triple Shot',
    color: '#FF00FF',
    cooldown: 250,
    damage: 12,
    bulletSpeed: 14,
    bulletCount: 3,
    spread: 0.3,
    bulletLifetime: 120,
    icon: '⚡'
  },
  [WeaponType.SNIPER]: {
    type: WeaponType.SNIPER,
    name: 'Sniper',
    color: '#FFFF00',
    cooldown: 800,
    damage: 50,
    bulletSpeed: 30,
    bulletCount: 1,
    spread: 0,
    bulletLifetime: 80,
    icon: '🎯'
  },
  [WeaponType.SHOTGUN]: {
    type: WeaponType.SHOTGUN,
    name: 'Shotgun',
    color: '#FF6600',
    cooldown: 500,
    damage: 10,
    bulletSpeed: 12,
    bulletCount: 5,
    spread: 0.5,
    bulletLifetime: 60,
    icon: '💥'
  },
  [WeaponType.ROCKET]: {
    type: WeaponType.ROCKET,
    name: 'Rocket',
    color: '#FF0000',
    cooldown: 1000,
    damage: 40,
    bulletSpeed: 10,
    bulletCount: 1,
    spread: 0,
    bulletLifetime: 150,
    icon: '🚀'
  },
  [WeaponType.LASER]: {
    type: WeaponType.LASER,
    name: 'Laser',
    color: '#00FF00',
    cooldown: 100,
    damage: 8,
    bulletSpeed: 25,
    bulletCount: 1,
    spread: 0,
    bulletLifetime: 100,
    icon: '⚡'
  }
};

export class WeaponManager {
  private currentWeapon: WeaponType = WeaponType.MACHINE_GUN;
  private weaponTimer: number | null = null;

  /**
   * Get current weapon config
   */
  getCurrentWeapon(): WeaponConfig {
    return WEAPONS[this.currentWeapon];
  }

  /**
   * Set weapon (with optional duration for temporary power-ups)
   */
  setWeapon(type: WeaponType, duration?: number): void {
    this.currentWeapon = type;

    // Clear existing timer
    if (this.weaponTimer !== null) {
      clearTimeout(this.weaponTimer);
      this.weaponTimer = null;
    }

    // Set timer to revert to machine gun
    if (duration) {
      this.weaponTimer = setTimeout(() => {
        this.currentWeapon = WeaponType.MACHINE_GUN;
        this.weaponTimer = null;
      }, duration) as unknown as number;
    }
  }

  /**
   * Get bullets to spawn based on current weapon
   */
  getBulletData(x: number, y: number, angle: number): Array<{ angle: number; speed: number }> {
    const weapon = this.getCurrentWeapon();
    const bullets: Array<{ angle: number; speed: number }> = [];

    if (weapon.bulletCount === 1) {
      bullets.push({ angle, speed: weapon.bulletSpeed });
    } else {
      // Multiple bullets with spread
      const startAngle = angle - (weapon.spread * (weapon.bulletCount - 1)) / 2;
      for (let i = 0; i < weapon.bulletCount; i++) {
        bullets.push({
          angle: startAngle + weapon.spread * i,
          speed: weapon.bulletSpeed
        });
      }
    }

    return bullets;
  }

  /**
   * Clear weapon timer on cleanup
   */
  destroy(): void {
    if (this.weaponTimer !== null) {
      clearTimeout(this.weaponTimer);
      this.weaponTimer = null;
    }
  }
}
