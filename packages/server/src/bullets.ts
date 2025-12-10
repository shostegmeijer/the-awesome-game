import { MAP_WIDTH, MAP_HEIGHT } from '@awesome-game/shared';

interface Bullet {
    id: string;
    userId: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    lifetime: number;
    isRocket: boolean;
}

export class BulletSystem {
    private bullets: Bullet[] = [];

    /**
     * Add a new bullet
     */
    addBullet(id: string, userId: string, x: number, y: number, angle: number, isRocket: boolean = false): void {
        const speed = isRocket ? 6 : 15; // Rockets slower
        const lifetime = isRocket ? 180 : 120; // Rockets live longer
        this.bullets.push({
            id,
            userId,
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            lifetime,
            isRocket
        });
    }

    /**
     * Update all bullets
     */
    update(): void {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];

            // Move bullet
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            bullet.lifetime--;

            // Bounce off walls
            const halfW = MAP_WIDTH / 2;
            const halfH = MAP_HEIGHT / 2;

            // Horizontal bounce
            if (bullet.x < -halfW) {
                bullet.x = -halfW;
                bullet.vx = -bullet.vx;
            } else if (bullet.x > halfW) {
                bullet.x = halfW;
                bullet.vx = -bullet.vx;
            }

            // Vertical bounce
            if (bullet.y < -halfH) {
                bullet.y = -halfH;
                bullet.vy = -bullet.vy;
            } else if (bullet.y > halfH) {
                bullet.y = halfH;
                bullet.vy = -bullet.vy;
            }

            // Remove dead bullets
            if (bullet.lifetime <= 0) {
                this.bullets.splice(i, 1);
            }
        }
    }

    /**
     * Get all bullets
     */
    getBullets(): Bullet[] {
        return this.bullets;
    }

    /**
     * Remove a specific bullet
     */
    removeBullet(id: string): void {
        const index = this.bullets.findIndex(b => b.id === id);
        if (index !== -1) {
            this.bullets.splice(index, 1);
        }
    }
}
