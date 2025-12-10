import { Server } from 'socket.io';
import {
    ClientToServerEvents,
    ServerToClientEvents,
    PowerUpData,
    WeaponType
} from '@awesome-game/shared';

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
        const padding = 100;
        const mapWidth = 4000;
        const mapHeight = 1000;
        // Using window fallback for now, ideally should use map config
        const x = padding + Math.random() * (mapWidth - padding * 2);
        const y = padding + Math.random() * (mapHeight - padding * 2);

        // Random weapon type (exclude machine gun)
        const weaponTypes = [
            WeaponType.TRIPLE_SHOT,
            WeaponType.SHOTGUN,
            WeaponType.ROCKET,
            WeaponType.LASER
        ];
        const weaponType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];

        const powerup: PowerUp = {
            id: `powerup-${this.nextId++}-${Date.now()}`,
            x,
            y,
            weaponType,
            collisionRadius: 30
        };

        this.powerups.push(powerup);

        // Broadcast new powerup
        this.io.emit('powerup:spawn', powerup);

        console.log(`💎 Powerup spawned: ${weaponType}`);
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
    collectPowerUp(powerUpId: string, userId: string): WeaponType | null {
        const index = this.powerups.findIndex(p => p.id === powerUpId);
        if (index === -1) return null;

        const powerup = this.powerups[index];
        this.powerups.splice(index, 1);

        // Broadcast collection
        this.io.emit('powerup:collect', {
            powerUpId: powerup.id,
            userId,
            weaponType: powerup.weaponType
        });

        return powerup.weaponType;
    }

    /**
     * Get all powerups
     */
    getPowerUps(): PowerUpData[] {
        return this.powerups.map(p => ({
            id: p.id,
            x: p.x,
            y: p.y,
            weaponType: p.weaponType
        }));
    }
}
