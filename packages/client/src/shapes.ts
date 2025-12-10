/**
 * Ship shape definitions - easily customizable!
 *
 * Each shape is defined as vertices relative to center (0, 0)
 * Positive X = right (front of ship)
 * Positive Y = down
 */

export interface ShipShape {
  name: string;
  // Outer hull vertices (will be filled and stroked)
  outerVertices: { x: number; y: number }[];
  // Inner detail vertices (will be stroked only for glow effect)
  innerVertices: { x: number; y: number }[];
  // Size multiplier
  scale: number;
}

/**
 * Default diamond ship (current design)
 */
export const DIAMOND_SHIP: ShipShape = {
  name: 'Diamond',
  scale: 1.0,
  outerVertices: [
    { x: 20, y: 0 },      // Right point (front)
    { x: 0, y: 20 },      // Bottom
    { x: -20, y: 0 },     // Left point (back)
    { x: 0, y: -20 }      // Top
  ],
  innerVertices: [
    { x: 10, y: 0 },      // Smaller diamond inside
    { x: 0, y: 10 },
    { x: -10, y: 0 },
    { x: 0, y: -10 }
  ]
};

/**
 * Arrow/fighter ship design
 */
export const ARROW_SHIP: ShipShape = {
  name: 'Arrow',
  scale: 1.0,
  outerVertices: [
    { x: 25, y: 0 },      // Front point
    { x: 10, y: 8 },      // Right wing
    { x: -8, y: 8 },      // Right rear
    { x: -8, y: 3 },      // Right engine
    { x: -15, y: 3 },     // Right thruster
    { x: -15, y: -3 },    // Left thruster
    { x: -8, y: -3 },     // Left engine
    { x: -8, y: -8 },     // Left rear
    { x: 10, y: -8 }      // Left wing
  ],
  innerVertices: [
    { x: 15, y: 0 },      // Inner cockpit
    { x: 5, y: 4 },
    { x: -5, y: 4 },
    { x: -5, y: -4 },
    { x: 5, y: -4 }
  ]
};

/**
 * Triangle/delta wing ship
 */
export const TRIANGLE_SHIP: ShipShape = {
  name: 'Triangle',
  scale: 1.0,
  outerVertices: [
    { x: 22, y: 0 },      // Front point
    { x: -15, y: 15 },    // Bottom back
    { x: -10, y: 0 },     // Back center
    { x: -15, y: -15 }    // Top back
  ],
  innerVertices: [
    { x: 12, y: 0 },      // Inner triangle
    { x: -8, y: 8 },
    { x: -8, y: -8 }
  ]
};

/**
 * Hexagon ship
 */
export const HEXAGON_SHIP: ShipShape = {
  name: 'Hexagon',
  scale: 1.0,
  outerVertices: [
    { x: 15, y: 0 },      // Right
    { x: 7.5, y: 13 },    // Bottom right
    { x: -7.5, y: 13 },   // Bottom left
    { x: -15, y: 0 },     // Left
    { x: -7.5, y: -13 },  // Top left
    { x: 7.5, y: -13 }    // Top right
  ],
  innerVertices: [
    { x: 8, y: 0 },       // Inner hexagon
    { x: 4, y: 7 },
    { x: -4, y: 7 },
    { x: -8, y: 0 },
    { x: -4, y: -7 },
    { x: 4, y: -7 }
  ]
};

/**
 * Available ship shapes
 */
export const SHIP_SHAPES = {
  diamond: DIAMOND_SHIP,
  arrow: ARROW_SHIP,
  triangle: TRIANGLE_SHIP,
  hexagon: HEXAGON_SHIP
};

/**
 * Default ship shape (can be changed here to swap all ships)
 */
export const DEFAULT_SHIP_SHAPE = DIAMOND_SHIP;

/**
 * Draw a ship shape on canvas context
 */
export function drawShipShape(
  ctx: CanvasRenderingContext2D,
  shape: ShipShape,
  x: number,
  y: number,
  rotation: number,
  color: string
): void {
  ctx.save();

  // Position and rotate
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(shape.scale, shape.scale);

  // Outer glow
  ctx.shadowBlur = 30;
  ctx.shadowColor = color;

  // Draw outer hull
  ctx.strokeStyle = color;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'miter';

  ctx.beginPath();
  shape.outerVertices.forEach((vertex, index) => {
    if (index === 0) {
      ctx.moveTo(vertex.x, vertex.y);
    } else {
      ctx.lineTo(vertex.x, vertex.y);
    }
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Draw inner details (secondary glow)
  ctx.shadowBlur = 15;
  ctx.beginPath();
  shape.innerVertices.forEach((vertex, index) => {
    if (index === 0) {
      ctx.moveTo(vertex.x, vertex.y);
    } else {
      ctx.lineTo(vertex.x, vertex.y);
    }
  });
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}
