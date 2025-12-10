import {
    MAP_WIDTH,
    MAP_HEIGHT,
    PowerUpData,
    ServerToClientEvents,
    WeaponType,
    PowerUpType
} from '@awesome-game/shared';
import { Server } from 'socket.io';

interface PowerUp extends PowerUpData {
    collisionRadius: number;
}

export class PowerUpSystem {
    private powerups: PowerUp[] = [];
    private nextId = 0;
    private spawnInterval = 3000; // Spawn every 8 seconds
    private lastSpawnTime = 0;
    private maxPowerUps = 5;
    private io: Server<ClientToServerEvents, ServerToClientEvents>;

    constructor(io: Server<ClientToServerEvents, ServerToClientEvents>) {
        this.io = io;
    }

    /**
     * Update powerups and spawn new ones
     */
    update(): void {
        const currentTime = Date.now();

        // Spawn new powerups
        if (currentTime - this.lastSpawnTime > this.spawnInterval && this.powerups.length < this.maxPowerUps) {
            this.spawn();
            this.lastSpawnTime = currentTime;
        }
    }

    /**
     * Spawn a random powerup
     */
    spawn(): void {
        const x = (Math.random() - 0.5) * MAP_WIDTH;
        const y = (Math.random() - 0.5) * MAP_HEIGHT;

        // Weighted powerup type selection
        // Weapons: 70%, Health: 20%, Shield: 10%
        const random = Math.random();
        let type: PowerUpType;
        if (random < 0.70) {
            type = PowerUpType.WEAPON;
        } else if (random < 0.90) {
            type = PowerUpType.HEALTH;
        } else {
            type = PowerUpType.SHIELD;
        }

        let powerup: PowerUp;

        if (type === PowerUpType.WEAPON) {
            // Random weapon type (exclude machine gun)
            const weaponTypes = [
                WeaponType.TRIPLE_SHOT,
                WeaponType.SHOTGUN,
                WeaponType.ROCKET,
                WeaponType.LASER,
                WeaponType.HOMING_MISSILES
            ];
            const weaponType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];

            powerup = {
                id: `powerup-${this.nextId++}-${Date.now()}`,
                x,
                y,
                type,
                weaponType,
                collisionRadius: 30
            };
            console.log(`💎 Powerup spawned: ${weaponType}`);
        } else if (type === PowerUpType.HEALTH) {
            powerup = {
                id: `powerup-${this.nextId++}-${Date.now()}`,
                x,
                y,
                type,
                collisionRadius: 30
            };
            console.log(`💎 Powerup spawned: HEALTH PACK`);
        } else {
            // SHIELD
            powerup = {
                id: `powerup-${this.nextId++}-${Date.now()}`,
                x,
                y,
                type,
                collisionRadius: 30
            };
            console.log(`💎 Powerup spawned: SHIELD`);
        }

        this.powerups.push(powerup);

        // Broadcast new powerup
        this.io.emit('powerup:spawn', powerup);
    }

    /**
     * Check if player collects a powerup
     */
    checkCollection(playerX: number, playerY: number, playerRadius: number): PowerUp | null {
        for (let i = 0; i < this.powerups.length; i++) {
            const powerup = this.powerups[i];
            const dx = playerX - powerup.x;
            const dy = playerY - powerup.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < powerup.collisionRadius + playerRadius) {
                return powerup;
            }
        }
        return null;
    }

    /**
     * Collect a powerup
     */
    collectPowerUp(powerUpId: string, userId: string): PowerUp | null {
        const index = this.powerups.findIndex(p => p.id === powerUpId);
        if (index === -1) return null;

        const powerup = this.powerups[index];
        this.powerups.splice(index, 1);

        // Broadcast collection
        this.io.emit('powerup:collect', {
            powerUpId: powerup.id,
            userId,
            type: powerup.type,
            weaponType: powerup.weaponType
        });

        return powerup;
    }

    /**
     * Get all powerups
     */
    getPowerUps(): PowerUpData[] {
        return this.powerups.map(p => ({
            id: p.id,
            x: p.x,
            y: p.y,
            type: p.type,
            weaponType: p.weaponType
        }));
    }
}