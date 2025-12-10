import { getAllUsers } from './state.js';
import { MineSystem } from './mines.js';

interface ActiveLaser {
    userId: string;
    angle: number;
    duration: number; // Frames remaining
}

export class LaserSystem {
    private lasers: ActiveLaser[] = [];
    private mineSystem: MineSystem;

    constructor(mineSystem: MineSystem) {
        this.mineSystem = mineSystem;
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
     * Update lasers and check collisions
     */
    update(): void {
        const users = getAllUsers();

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
            // Beam origin is user position
            const hitMineIds = this.mineSystem.checkLaserCollision(user.x, user.y, laser.angle, 2000);

            hitMineIds.forEach(mineId => {
                this.mineSystem.explodeMine(mineId, laser.userId);
            });

            // Decrease duration
            laser.duration--;
            if (laser.duration <= 0) {
                this.lasers.splice(i, 1);
            }
        }
    }
}
