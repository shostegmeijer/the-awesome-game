import { MAP_WIDTH, MAP_HEIGHT } from '@awesome-game/shared';

export class Camera {
    x: number = 0;
    y: number = 0;
    width: number;
    height: number;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    /**
     * Update camera to follow a target position
     */
    follow(targetX: number, targetY: number): void {
        // Center the camera on the target
        this.x = targetX - this.width / 2;
        this.y = targetY - this.height / 2;

        // Clamp to map bounds (centered coordinates)
        const halfMapW = MAP_WIDTH / 2;
        const halfMapH = MAP_HEIGHT / 2;

        // Calculate min/max camera positions
        const minX = -halfMapW;
        const maxX = halfMapW - this.width;
        const minY = -halfMapH;
        const maxY = halfMapH - this.height;

        // If map is smaller than screen, center it
        if (this.width > MAP_WIDTH) {
            this.x = -this.width / 2;
        } else {
            this.x = Math.max(minX, Math.min(this.x, halfMapW - this.width));
        }

        if (this.height > MAP_HEIGHT) {
            this.y = -this.height / 2;
        } else {
            this.y = Math.max(minY, Math.min(this.y, halfMapH - this.height));
        }
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenX: number, screenY: number): { x: number, y: number } {
        return {
            x: screenX + this.x,
            y: screenY + this.y
        };
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(worldX: number, worldY: number): { x: number, y: number } {
        return {
            x: worldX - this.x,
            y: worldY - this.y
        };
    }

    /**
     * Apply camera transform to context
     */
    apply(ctx: CanvasRenderingContext2D): void {
        ctx.translate(-this.x, -this.y);
    }

    /**
     * Reset camera transform
     */
    reset(ctx: CanvasRenderingContext2D): void {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    /**
     * Update viewport size
     */
    resize(width: number, height: number): void {
        this.width = width;
        this.height = height;
    }
}
