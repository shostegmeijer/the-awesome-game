import { DEFAULT_SHIP_SHAPE, drawShipShape, type ShipShape } from './shapes.js';
import { ReactiveGrid } from './grid.js';
import { MAP_WIDTH, MAP_HEIGHT } from '@awesome-game/shared';

/**
 * Canvas manager for rendering cursors
 */
export class CanvasManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number = 0;
  private shipShape: ShipShape = DEFAULT_SHIP_SHAPE;
  private grid: ReactiveGrid;

  constructor(canvasId: string) {
    const element = document.getElementById(canvasId);
    if (!element || !(element instanceof HTMLCanvasElement)) {
      throw new Error(`Canvas element with id "${canvasId}" not found`);
    }

    this.canvas = element;
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = context;

    // Initialize reactive grid
    this.grid = new ReactiveGrid(MAP_WIDTH, MAP_HEIGHT);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /**
   * Resize canvas to fill viewport
   */
  private resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * Start the render loop
   */
  startRenderLoop(renderFn: () => void): void {
    const loop = () => {
      // Clear canvas to black
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Grid update/render moved to main loop for camera support

      // Call render function
      renderFn();

      // Continue loop
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  /**
   * Get the reactive grid instance
   */
  getGrid(): ReactiveGrid {
    return this.grid;
  }

  /**
   * Draw grid overlay that picks up glow from particles/cursors
   */
  drawGridOverlay(): void {
    this.grid.renderOverlay(this.ctx);
  }

  /**
   * Stop the render loop
   */
  stopRenderLoop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  /**
   * Set the ship shape to use for rendering
   */
  setShipShape(shape: ShipShape): void {
    this.shipShape = shape;
  }

  private shipCache: Map<string, HTMLCanvasElement> = new Map();

  /**
   * Draw a cursor at the specified position (Geometry Wars style)
   */
  drawCursor(x: number, y: number, color: string, label: string, rotation: number = 0, health: number = 100): void {
    // Check cache for this color
    let shipCanvas = this.shipCache.get(color);

    if (!shipCanvas) {
      // Create new cached ship sprite
      shipCanvas = document.createElement('canvas');
      const size = 100; // Enough for glow
      shipCanvas.width = size;
      shipCanvas.height = size;
      const ctx = shipCanvas.getContext('2d')!;

      // Draw centered in cache canvas
      drawShipShape(ctx, this.shipShape, size / 2, size / 2, 0, color); // Draw upright
      this.shipCache.set(color, shipCanvas);
    }

    // Draw ship from cache
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(rotation);
    this.ctx.drawImage(shipCanvas, -50, -50); // Offset by half size
    this.ctx.restore();

    // Save context for UI elements
    this.ctx.save();

    // Draw health bar (below ship)
    const barWidth = 50;
    const barHeight = 6;
    const barY = y + 28; // Adjusted for shape size

    // Health bar background
    this.ctx.shadowBlur = 5;
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(x - barWidth / 2, barY, barWidth, barHeight);

    // Health bar fill (gradient from green to red based on health)
    const healthPercent = Math.max(0, Math.min(100, health)) / 100;
    const healthWidth = barWidth * healthPercent;

    // Color based on health percentage
    let healthColor;
    if (healthPercent > 0.6) {
      healthColor = '#00ff00'; // Green
    } else if (healthPercent > 0.3) {
      healthColor = '#ffff00'; // Yellow
    } else {
      healthColor = '#ff0000'; // Red
    }

    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = healthColor;
    this.ctx.fillStyle = healthColor;
    this.ctx.fillRect(x - barWidth / 2 + 1, barY + 1, healthWidth - 2, barHeight - 2);

    // Draw label with glow (below health bar)
    this.ctx.shadowBlur = 10;
    this.ctx.font = 'bold 14px "Courier New", monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';

    const labelX = x + 25; // Offset to the right of ship
    const labelY = y;

    // Label glow
    this.ctx.fillStyle = color;
    this.ctx.fillText(label, labelX, labelY);

    // Label text (brighter)
    this.ctx.shadowBlur = 5;
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText(label, labelX, labelY);

    // Restore context state
    this.ctx.restore();
  }

  /**
   * Get canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
