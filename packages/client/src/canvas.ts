/**
 * Canvas manager for rendering cursors
 */
export class CanvasManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number = 0;

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
      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Call render function
      renderFn();

      // Continue loop
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
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
   * Draw a cursor at the specified position
   */
  drawCursor(x: number, y: number, color: string, label: string): void {
    // Draw cursor arrow
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1;

    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x + 12, y + 12);
    this.ctx.lineTo(x + 8, y + 12);
    this.ctx.lineTo(x, y + 20);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Draw label with background
    this.ctx.font = '12px sans-serif';
    const textWidth = this.ctx.measureText(label).width;
    const padding = 4;

    // Label background
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x + 15, y - 5, textWidth + padding * 2, 20);

    // Label text
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText(label, x + 15 + padding, y + 9);
  }

  /**
   * Get canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
