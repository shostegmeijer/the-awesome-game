/**
 * Weapon system for different shooting types
 */

export enum WeaponType {
  MACHINE_GUN = 'machineGun',
  TRIPLE_SHOT = 'tripleShot',
  SHOTGUN = 'shotgun',
  ROCKET = 'rocket',
  LASER = 'laser',
  HOMING_MISSILES = 'homingMissiles'
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
  maxAmmo: number; // 0 for infinite
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
    icon: '🔫',
    maxAmmo: 0 // Infinite
  },
  [WeaponType.TRIPLE_SHOT]: {
    type: WeaponType.TRIPLE_SHOT,
    name: 'Triple Shot',
    color: '#FF00FF',
    cooldown: 0, // One-time use
    damage: 30,
    bulletSpeed: 14,
    bulletCount: 3,
    spread: 0.2,
    bulletLifetime: 120,
    icon: '⚡',
    maxAmmo: 3
  },
  [WeaponType.SHOTGUN]: {
    type: WeaponType.SHOTGUN,
    name: 'Shotgun',
    color: '#FF6600',
    cooldown: 0, // One-time use
    damage: 20,
    bulletSpeed: 12,
    bulletCount: 20,
    spread: 0.02,
    bulletLifetime: 50,
    icon: '💥',
    maxAmmo: 3
  },
  [WeaponType.ROCKET]: {
    type: WeaponType.ROCKET,
    name: 'Rocket',
    color: '#FF0000',
    cooldown: 0, // One-time use
    damage: 100,
    bulletSpeed: 6, // Slower
    bulletCount: 1,
    spread: 0,
    bulletLifetime: 180, // Longer lifetime
    icon: '🚀',
    maxAmmo: 3
  },
  [WeaponType.LASER]: {
    type: WeaponType.LASER,
    name: 'Laser',
    color: '#00FF00',
    cooldown: 0, // One-time use, continuous beam
    damage: 5, // Damage per frame
    bulletSpeed: 0, // Not used for beam
    bulletCount: 1,
    spread: 0,
    bulletLifetime: 120, // 2 seconds at 60fps
    icon: '🔥',
    maxAmmo: 3
  },
  [WeaponType.HOMING_MISSILES]: {
    type: WeaponType.HOMING_MISSILES,
    name: 'Homing Missiles',
    color: '#FF00AA',
    cooldown: 0, // One-time use
    damage: 80,
    bulletSpeed: 8, // Medium speed
    bulletCount: 3, // Fire 3 missiles
    spread: 0.15, // Slight spread
    bulletLifetime: 240, // 4 seconds to track
    icon: '🎯',
    maxAmmo: 3
  }
};

export class WeaponManager {
  private currentWeapon: WeaponType = WeaponType.MACHINE_GUN;
  private currentAmmo: number = 0;

  /**
   * Get current weapon config
   */
  getCurrentWeapon(): WeaponConfig {
    return WEAPONS[this.currentWeapon];
  }

  /**
   * Get current ammo count
   */
  getAmmo(): number {
    return this.currentAmmo;
  }

  /**
   * Set weapon (resets ammo)
   */
  setWeapon(type: WeaponType): void {
    this.currentWeapon = type;
    this.currentAmmo = WEAPONS[type].maxAmmo;
  }

  /**
   * Use ammo - returns true if weapon should be reset
   */
  useAmmo(): boolean {
    const weapon = this.getCurrentWeapon();
    if (weapon.maxAmmo === 0) return false; // Infinite ammo

    this.currentAmmo--;
    if (this.currentAmmo <= 0) {
      this.resetToMachineGun();
      return true;
    }
    return false;
  }

  /**
   * Reset to machine gun after using special weapon
   */
  resetToMachineGun(): void {
    this.currentWeapon = WeaponType.MACHINE_GUN;
    this.currentAmmo = 0;
  }

  /**
   * Check if current weapon is machine gun
   */
  isMachineGun(): boolean {
    return this.currentWeapon === WeaponType.MACHINE_GUN;
  }

  /**
   * Get bullets to spawn based on current weapon
   */
  getBulletData(_x: number, _y: number, angle: number): Array<{ angle: number; speed: number }> {
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
}
