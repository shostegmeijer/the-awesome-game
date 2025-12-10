import { Server } from 'socket.io';
import {
    ClientToServerEvents,
    ServerToClientEvents,
    MineData,
    MAP_WIDTH,
    MAP_HEIGHT
} from '@awesome-game/shared';
import { getAllUsers, updateHealth } from './state.js';

interface Mine extends MineData {
    damage: number;
    damageRadius: number;
}

export class MineSystem {
    private mines: Mine[] = [];
    private nextId = 0;
    private spawnInterval = 2000; // Spawn every 5 seconds
    private lastSpawnTime = 0;
    private maxMines = 10;
    private mineRadius = 20;
    private damageRadius = 240;
    private mineDamage = 40;
    private io: Server<ClientToServerEvents, ServerToClientEvents>;
    private onDeath: (userId: string, attackerId?: string) => void;

    constructor(io: Server<ClientToServerEvents, ServerToClientEvents>, onDeath: (userId: string, attackerId?: string) => void) {
        this.io = io;
        this.onDeath = onDeath;
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
        // Spawn mine at random location (centered coordinates)
        const x = (Math.random() - 0.5) * MAP_WIDTH;
        const y = (Math.random() - 0.5) * MAP_HEIGHT;

        const mine: Mine = {
            id: `mine - ${this.nextId++} -${Date.now()} `,
            x,
            y,
            radius: this.mineRadius,
            damageRadius: this.damageRadius,
            damage: this.mineDamage
        };

        this.mines.push(mine);

        // Broadcast new mine to all clients
        this.io.emit('mine:spawn', mine);

        console.log(`💣 Mine spawned at ${Math.round(x)}, ${Math.round(y)} `);
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
     * Check collisions with lasers
     */
    checkLaserCollision(x1: number, y1: number, angle: number, length: number): string[] {
        const hitMines: string[] = [];
        const x2 = x1 + Math.cos(angle) * length;
        const y2 = y1 + Math.sin(angle) * length;

        for (let i = 0; i < this.mines.length; i++) {
            const mine = this.mines[i];

            // Point to line distance
            const A = mine.x - x1;
            const B = mine.y - y1;
            const C = x2 - x1;
            const D = y2 - y1;

            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            let param = -1;

            if (lenSq !== 0) {
                param = dot / lenSq;
            }

            let xx, yy;

            if (param < 0) {
                xx = x1;
                yy = y1;
            } else if (param > 1) {
                xx = x2;
                yy = y2;
            } else {
                xx = x1 + param * C;
                yy = y1 + param * D;
            }

            const dx = mine.x - xx;
            const dy = mine.y - yy;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < mine.radius + 10) { // +10 for laser width
                hitMines.push(mine.id);
            }
        }
        return hitMines;
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
                const oldHealth = user.health;
                const newHealth = Math.max(0, user.health - mine.damage);
                updateHealth(user.id, newHealth);

                this.io.emit('health:update', {
                    userId: user.id,
                    health: newHealth
                });

                if (oldHealth > 0 && newHealth <= 0) {
                    this.onDeath(user.id, triggeredByUserId);
                }

                if (triggeredByUserId && newHealth <= 0 && user.health > 0) {
                    // Handle kill credit if needed
                }
            }
        });

        // Check for chain reactions
        this.checkChainReactions(mine.x, mine.y, mine.damageRadius, triggeredByUserId);
    }

    /**
     * Check if explosion hits other mines
     */
    private checkChainReactions(explosionX: number, explosionY: number, explosionRadius: number, triggeredByUserId?: string): void {
        // Use a timeout to create a cascading effect
        setTimeout(() => {
            for (let i = this.mines.length - 1; i >= 0; i--) {
                const mine = this.mines[i];
                const dx = mine.x - explosionX;
                const dy = mine.y - explosionY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Check if explosion reaches the mine (accounting for mine radius)
                if (distance < explosionRadius + mine.radius) {
                    this.explodeMine(mine.id, triggeredByUserId);
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
