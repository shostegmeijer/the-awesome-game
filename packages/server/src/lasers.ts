import { getAllUsers, getAllBots, setBotHealth, updateHealth, applyKnockback, addKill } from './state.js';
import { MineSystem } from './mines.js';
import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from '@awesome-game/shared';

interface ActiveLaser {
    userId: string;
    angle: number;
    duration: number; // Frames remaining
}

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export class LaserSystem {
    private lasers: ActiveLaser[] = [];
    private mineSystem: MineSystem;
    private io: TypedServer;

    constructor(mineSystem: MineSystem, io: TypedServer) {
        this.mineSystem = mineSystem;
        this.io = io;
    }

    /**
     * Add a new laser
     */
    addLaser(userId: string, angle: number, duration: number = 120): void {
        // Remove existing laser for this user if any (one laser per user)
        this.removeLaser(userId);

        this.lasers.push({
            userId,
            angle,
            duration
        });
    }

    /**
     * Remove laser for a user
     */
    removeLaser(userId: string): void {
        const index = this.lasers.findIndex(l => l.userId === userId);
        if (index !== -1) {
            this.lasers.splice(index, 1);
        }
    }

    /**
     * Check if a point is hit by a laser beam
     */
    private checkLaserHit(beamX: number, beamY: number, beamAngle: number, beamLength: number, targetX: number, targetY: number, targetRadius: number): boolean {
        // Calculate beam end point
        const endX = beamX + Math.cos(beamAngle) * beamLength;
        const endY = beamY + Math.sin(beamAngle) * beamLength;

        // Calculate distance from point to line segment
        const dx = endX - beamX;
        const dy = endY - beamY;
        const lengthSquared = dx * dx + dy * dy;

        if (lengthSquared === 0) return false;

        const t = Math.max(0, Math.min(1, ((targetX - beamX) * dx + (targetY - beamY) * dy) / lengthSquared));

        const closestX = beamX + t * dx;
        const closestY = beamY + t * dy;

        const distSquared = (targetX - closestX) * (targetX - closestX) + (targetY - closestY) * (targetY - closestY);

        return distSquared <= targetRadius * targetRadius;
    }

    /**
     * Update lasers and check collisions
     */
    update(): void {
        const users = getAllUsers();
        const bots = getAllBots();
        const LASER_LENGTH = 2000;
        const LASER_DAMAGE = 2; // Per tick

        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            const user = users.get(laser.userId);

            // If user disconnected, remove laser
            if (!user) {
                this.lasers.splice(i, 1);
                continue;
            }

            // Update laser angle from user rotation (sweeping effect)
            laser.angle = user.rotation;

            // Check collisions with mines
            const hitMineIds = this.mineSystem.checkLaserCollision(user.x, user.y, laser.angle, LASER_LENGTH);
            hitMineIds.forEach(mineId => {
                this.mineSystem.explodeMine(mineId, laser.userId);
            });

            // Check collisions with other players
            users.forEach((target, targetId) => {
                if (targetId === laser.userId) return; // Don't hit self
                if (target.health <= 0) return; // Skip dead players

                if (this.checkLaserHit(user.x, user.y, laser.angle, LASER_LENGTH, target.x, target.y, 25)) {
                    const newHealth = Math.max(0, target.health - LASER_DAMAGE);
                    updateHealth(targetId, newHealth);
                    this.io.emit('health:update', { userId: targetId, health: newHealth });
                }
            });

            // Check collisions with bots
            bots.forEach((bot) => {
                if (bot.health <= 0) return; // Skip dead bots

                if (this.checkLaserHit(user.x, user.y, laser.angle, LASER_LENGTH, bot.x, bot.y, 25)) {
                    const newHealth = Math.max(0, bot.health - LASER_DAMAGE);
                    setBotHealth(bot.id, newHealth);
                    this.io.emit('health:update', { userId: bot.id, health: newHealth });

                    // Award kill if bot died
                    if (newHealth <= 0 && bot.health > 0) {
                        const shooter = users.get(laser.userId);
                        if (shooter) {
                            addKill(laser.userId);
                            this.io.emit('kill', {
                                killerId: laser.userId,
                                killerName: shooter.label,
                                victimId: bot.id,
                                victimName: bot.label,
                                points: 100
                            });
                            this.io.emit('stats:update', {
                                userId: laser.userId,
                                kills: shooter.kills,
                                deaths: shooter.deaths
                            });
                        }
                    }
                }
            });

            // Decrease duration
            laser.duration--;
            if (laser.duration <= 0) {
                this.lasers.splice(i, 1);
            }
        }
    }
}
