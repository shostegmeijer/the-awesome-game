/**
 * Reactive grid system with physics (Geometry Wars style)
 */

interface GridVertex {
  restX: number;  // Original position
  restY: number;
  x: number;      // Current position
  y: number;
  vx: number;     // Velocity
  vy: number;
}

export class ReactiveGrid {
  private vertices: GridVertex[][] = [];
  private gridSpacing = 80; // Increased to 80 for better performance
  private cols = 0;
  private rows = 0;
  private width = 0;
  private height = 0;
  private updateCounter = 0; // For skipping updates

  // Physics parameters (highly optimized)
  private readonly springStiffness = 0.028;  // Slightly increased for faster return
  private readonly damping = 0.95;          // Higher damping for faster settling
  private readonly forceRadius = 90;        // Further reduced
  private readonly forceMagnitude = 0.35;   // Reduced magnitude
  private readonly minDisplacement = 0.02;  // Higher threshold

  constructor(width: number, height: number) {
    this.resize(width, height);
  }

  /**
   * Resize grid (call when canvas resizes)
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.cols = Math.ceil(width / this.gridSpacing) + 1;
    this.rows = Math.ceil(height / this.gridSpacing) + 1;

    // Initialize grid vertices
    this.vertices = [];
    for (let y = 0; y < this.rows; y++) {
      const row: GridVertex[] = [];
      for (let x = 0; x < this.cols; x++) {
        const restX = x * this.gridSpacing - width / 2;
        const restY = y * this.gridSpacing - height / 2;
        row.push({
          restX,
          restY,
          x: restX,
          y: restY,
          vx: 0,
          vy: 0
        });
      }
      this.vertices.push(row);
    }
  }

  /**
   * Apply force to grid from a moving object
   */
  applyForce(objectX: number, objectY: number, velocityX: number = 0, velocityY: number = 0): void {
    // Calculate which grid cells might be affected (convert world coords to grid index)
    const gridX = objectX + this.width / 2;
    const gridY = objectY + this.height / 2;

    const minCol = Math.max(0, Math.floor((gridX - this.forceRadius) / this.gridSpacing));
    const maxCol = Math.min(this.cols - 1, Math.ceil((gridX + this.forceRadius) / this.gridSpacing));
    const minRow = Math.max(0, Math.floor((gridY - this.forceRadius) / this.gridSpacing));
    const maxRow = Math.min(this.rows - 1, Math.ceil((gridY + this.forceRadius) / this.gridSpacing));

    // Apply force to nearby vertices
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const vertex = this.vertices[row][col];

        // Calculate distance from object to vertex
        const dx = vertex.x - objectX;
        const dy = vertex.y - objectY;
        const distanceSquared = dx * dx + dy * dy;
        const radiusSquared = this.forceRadius * this.forceRadius;

        if (distanceSquared < radiusSquared && distanceSquared > 0) {
          const distance = Math.sqrt(distanceSquared);

          // Force falls off with distance (inverse square-ish)
          const forceFactor = (1 - distance / this.forceRadius) * this.forceMagnitude;

          // Push vertex away from object
          const forceX = (dx / distance) * forceFactor;
          const forceY = (dy / distance) * forceFactor;

          // Add velocity component (objects moving fast push harder)
          const velocityFactor = Math.sqrt(velocityX * velocityX + velocityY * velocityY) * 0.1;

          vertex.vx += forceX * (1 + velocityFactor);
          vertex.vy += forceY * (1 + velocityFactor);
        }
      }
    }
  }

  /**
   * Update grid physics (highly optimized - only update every other frame)
   */
  update(): void {
    // Only update every other frame for 2x performance boost
    this.updateCounter++;
    if (this.updateCounter % 2 !== 0) return;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const vertex = this.vertices[row][col];

        // Skip if vertex is nearly at rest (optimization)
        const displacement = Math.abs(vertex.x - vertex.restX) + Math.abs(vertex.y - vertex.restY);
        if (displacement < this.minDisplacement && Math.abs(vertex.vx) < 0.02 && Math.abs(vertex.vy) < 0.02) {
          vertex.x = vertex.restX;
          vertex.y = vertex.restY;
          vertex.vx = 0;
          vertex.vy = 0;
          continue;
        }

        // Spring force pulling vertex back to rest position
        const springForceX = (vertex.restX - vertex.x) * this.springStiffness;
        const springForceY = (vertex.restY - vertex.y) * this.springStiffness;

        vertex.vx += springForceX;
        vertex.vy += springForceY;

        // Apply damping
        vertex.vx *= this.damping;
        vertex.vy *= this.damping;

        // Update position
        vertex.x += vertex.vx;
        vertex.y += vertex.vy;
      }
    }
  }

  /**
   * Render the reactive grid
   */
  render(ctx: CanvasRenderingContext2D, baseAlpha: number = 0.15, overlayAlpha: number = 0.25): void {
    ctx.save();

    // Draw base grid (subtle)
    ctx.strokeStyle = `rgba(0, 100, 150, ${baseAlpha})`;
    ctx.lineWidth = 1;

    // Vertical lines
    for (let col = 0; col < this.cols; col++) {
      ctx.beginPath();
      for (let row = 0; row < this.rows; row++) {
        const vertex = this.vertices[row][col];
        if (row === 0) {
          ctx.moveTo(vertex.x, vertex.y);
        } else {
          ctx.lineTo(vertex.x, vertex.y);
        }
      }
      ctx.stroke();
    }

    // Horizontal lines
    for (let row = 0; row < this.rows; row++) {
      ctx.beginPath();
      for (let col = 0; col < this.cols; col++) {
        const vertex = this.vertices[row][col];
        if (col === 0) {
          ctx.moveTo(vertex.x, vertex.y);
        } else {
          ctx.lineTo(vertex.x, vertex.y);
        }
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Render overlay grid with additive blending (picks up glow)
   */
  renderOverlay(ctx: CanvasRenderingContext2D, alpha: number = 0.25): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(0, 100, 150, ${alpha})`;
    ctx.lineWidth = 1;

    // Vertical lines
    for (let col = 0; col < this.cols; col++) {
      ctx.beginPath();
      for (let row = 0; row < this.rows; row++) {
        const vertex = this.vertices[row][col];
        if (row === 0) {
          ctx.moveTo(vertex.x, vertex.y);
        } else {
          ctx.lineTo(vertex.x, vertex.y);
        }
      }
      ctx.stroke();
    }

    // Horizontal lines
    for (let row = 0; row < this.rows; row++) {
      ctx.beginPath();
      for (let col = 0; col < this.cols; col++) {
        const vertex = this.vertices[row][col];
        if (col === 0) {
          ctx.moveTo(vertex.x, vertex.y);
        } else {
          ctx.lineTo(vertex.x, vertex.y);
        }
      }
      ctx.stroke();
    }

    ctx.restore();
  }
}
