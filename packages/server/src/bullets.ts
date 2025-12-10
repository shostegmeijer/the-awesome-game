interface Bullet {
    id: string;
    userId: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    lifetime: number;
}

export class BulletSystem {
    private bullets: Bullet[] = [];

    /**
     * Add a new bullet
     */
    addBullet(id: string, userId: string, x: number, y: number, angle: number): void {
        const speed = 15;
        this.bullets.push({
            id,
            userId,
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            lifetime: 120 // 2 seconds at 60fps (approx)
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
