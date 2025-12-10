import { Server } from 'socket.io';
import {
    ClientToServerEvents,
    ServerToClientEvents,
    MineData
} from '@awesome-game/shared';
import { getAllUsers, updateHealth } from './state.js';

interface Mine extends MineData {
    damage: number;
    damageRadius: number;
}

export class MineSystem {
    private mines: Mine[] = [];
    private nextId = 0;
    private spawnInterval = 10000; // Spawn every 10 seconds
    private lastSpawnTime = 0;
    private maxMines = 10;
    private mineRadius = 20;
    private damageRadius = 120;
    private mineDamage = 40;
    private io: Server<ClientToServerEvents, ServerToClientEvents>;

    constructor(io: Server<ClientToServerEvents, ServerToClientEvents>) {
        this.io = io;
    }

    /**
     * Update mines and spawn new ones
     */
    update(): void {
        const currentTime = Date.now();

        // Spawn new mines
        if (currentTime - this.lastSpawnTime > this.spawnInterval && this.mines.length < this.maxMines) {
            this.spawn();
            this.lastSpawnTime = currentTime;
        }
    }

    /**
     * Spawn a mine at random location
     */
    spawn(): void {
        const padding = 100;
        // Assuming a fixed map size for now, or we could pass map dimensions
        const mapWidth = 2000; // Default large map
        const mapHeight = 2000;

        // For now, let's use a smaller area that matches typical screen size to ensure visibility during testing
        // In a real game, this should be the full map size
        const x = padding + Math.random() * (mapWidth - padding * 2);
        const y = padding + Math.random() * (mapHeight - padding * 2);

        const mine: Mine = {
            id: `mine-${this.nextId++}-${Date.now()}`,
            x,
            y,
            radius: this.mineRadius,
            damageRadius: this.damageRadius,
            damage: this.mineDamage
        };

        this.mines.push(mine);

        // Broadcast new mine to all clients
        this.io.emit('mine:spawn', mine);

        console.log(`💣 Mine spawned at ${Math.round(x)}, ${Math.round(y)}`);
    }

    /**
     * Check collisions with bullets
     */
    checkBulletCollision(bulletX: number, bulletY: number): string | null {
        for (let i = 0; i < this.mines.length; i++) {
            const mine = this.mines[i];
            const dx = bulletX - mine.x;
            const dy = bulletY - mine.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < mine.radius) {
                return mine.id;
            }
        }
        return null;
    }

    /**
     * Check collisions with players
     */
    checkPlayerCollision(playerX: number, playerY: number, playerRadius: number): string | null {
        for (let i = 0; i < this.mines.length; i++) {
            const mine = this.mines[i];
            const dx = playerX - mine.x;
            const dy = playerY - mine.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < mine.radius + playerRadius) {
                return mine.id;
            }
        }
        return null;
    }

    /**
     * Trigger mine explosion
     */
    explodeMine(mineId: string, triggeredByUserId?: string): void {
        const mineIndex = this.mines.findIndex(m => m.id === mineId);
        if (mineIndex === -1) return;

        const mine = this.mines[mineIndex];
        this.mines.splice(mineIndex, 1);

        // Broadcast explosion
        this.io.emit('mine:explode', {
            mineId: mine.id,
            x: mine.x,
            y: mine.y,
            triggeredBy: triggeredByUserId
        });

        // Apply damage to players
        getAllUsers().forEach((user) => {
            const dx = user.x - mine.x;
            const dy = user.y - mine.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < mine.damageRadius) {
                const newHealth = Math.max(0, user.health - mine.damage);
                updateHealth(user.id, newHealth);

                this.io.emit('health:update', {
                    userId: user.id,
                    health: newHealth
                });

                if (triggeredByUserId && newHealth <= 0 && user.health > 0) {
                    // Handle kill credit if needed
                }
            }
        });

        // Check for chain reactions
        this.checkChainReactions(mine.x, mine.y, mine.damageRadius);
    }

    /**
     * Check if explosion hits other mines
     */
    private checkChainReactions(explosionX: number, explosionY: number, explosionRadius: number): void {
        // Use a timeout to create a cascading effect
        setTimeout(() => {
            for (let i = this.mines.length - 1; i >= 0; i--) {
                const mine = this.mines[i];
                const dx = mine.x - explosionX;
                const dy = mine.y - explosionY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < explosionRadius) {
                    this.explodeMine(mine.id);
                }
            }
        }, 100);
    }

    /**
     * Get all mines
     */
    getMines(): MineData[] {
        return this.mines.map(m => ({
            id: m.id,
            x: m.x,
            y: m.y,
            radius: m.radius
        }));
    }
}
