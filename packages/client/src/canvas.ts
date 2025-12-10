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
      // Clear canvas to black
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Draw grid background (Geometry Wars style)
      this.drawGrid();

      // Call render function
      renderFn();

      // Continue loop
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  /**
   * Draw Geometry Wars style grid background
   */
  private drawGrid(): void {
    const gridSize = 40;
    const lineWidth = 1;

    this.ctx.strokeStyle = 'rgba(0, 100, 150, 0.3)';
    this.ctx.lineWidth = lineWidth;

    // Vertical lines
    for (let x = 0; x < this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
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
   * Draw a cursor at the specified position (Geometry Wars style)
   */
  drawCursor(x: number, y: number, color: string, label: string, rotation: number = 0): void {
    const size = 20;

    // Save context state
    this.ctx.save();

    // Translate to cursor position and rotate
    this.ctx.translate(x, y);
    this.ctx.rotate(rotation);

    // Draw outer glow (bloom effect)
    this.ctx.shadowBlur = 30;
    this.ctx.shadowColor = color;

    // Draw geometric shape (diamond pointing in direction of movement)
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 3;
    this.ctx.lineJoin = 'miter';

    this.ctx.beginPath();
    this.ctx.moveTo(size, 0);           // Right point (front)
    this.ctx.lineTo(0, size);           // Bottom
    this.ctx.lineTo(-size, 0);          // Left point (back)
    this.ctx.lineTo(0, -size);          // Top
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Draw inner glow
    this.ctx.shadowBlur = 15;
    this.ctx.beginPath();
    this.ctx.moveTo(size * 0.5, 0);
    this.ctx.lineTo(0, size * 0.5);
    this.ctx.lineTo(-size * 0.5, 0);
    this.ctx.lineTo(0, -size * 0.5);
    this.ctx.closePath();
    this.ctx.stroke();

    // Reset translation for label (draw at original position)
    this.ctx.rotate(-rotation);
    this.ctx.translate(-x, -y);

    // Reset shadow for label
    this.ctx.shadowBlur = 10;

    // Draw label with glow
    this.ctx.font = 'bold 14px "Courier New", monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';

    const labelX = x + size + 10;
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
