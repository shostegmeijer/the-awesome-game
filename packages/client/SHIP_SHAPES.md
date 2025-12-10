# Ship Shape Customization Guide

All ship shapes are defined in `src/shapes.ts` - easily edit them without touching any game logic!

## Changing the Default Ship

Edit `src/shapes.ts` and change this line:

```typescript
export const DEFAULT_SHIP_SHAPE = DIAMOND_SHIP;
```

To use a different built-in shape:

```typescript
export const DEFAULT_SHIP_SHAPE = ARROW_SHIP;     // Fighter style
export const DEFAULT_SHIP_SHAPE = TRIANGLE_SHIP;  // Delta wing
export const DEFAULT_SHIP_SHAPE = HEXAGON_SHIP;   // Hexagonal
```

## Creating Your Own Ship Shape

Add a new shape to `shapes.ts`:

```typescript
export const MY_CUSTOM_SHIP: ShipShape = {
  name: 'MyShip',
  scale: 1.0,  // Size multiplier

  // Outer hull (filled and outlined)
  outerVertices: [
    { x: 20, y: 0 },    // Coordinates relative to center
    { x: 0, y: 15 },    // Positive X = right (front)
    { x: -15, y: 0 },   // Positive Y = down
    { x: 0, y: -15 }
  ],

  // Inner details (outlined only, for glow effect)
  innerVertices: [
    { x: 10, y: 0 },
    { x: 0, y: 8 },
    { x: -8, y: 0 },
    { x: 0, y: -8 }
  ]
};
```

Then set it as default:

```typescript
export const DEFAULT_SHIP_SHAPE = MY_CUSTOM_SHIP;
```

## Coordinate System

```
        Y-
         |
    X-  (0,0)  X+  ← Center of ship
         |
        Y+
```

- **X+** (right) = Front of ship (points in movement direction)
- **X-** (left) = Back of ship
- **Y+** (down) = Bottom
- **Y-** (up) = Top

## Tips

1. **Start with front point on X axis** - Makes rotation look natural
2. **Keep shapes centered** - Balance vertices around (0, 0)
3. **Use scale property** - Adjust overall size without redrawing
4. **Inner vertices** - Optional, but adds depth with glow effect
5. **Close paths** - Make sure first and last vertices connect

## Examples in Action

**Diamond (default):**
- Simple, classic shape
- Great visibility
- 4 vertices for outer, 4 for inner

**Arrow:**
- More detailed (9 vertices)
- Fighter jet style
- Shows how to make complex shapes

**Triangle:**
- Minimalist (4 vertices)
- Delta wing style
- Good for high-speed feel

**Hexagon:**
- Symmetrical (6 vertices)
- Balanced shape
- Good for tank/heavy ship

## Future: SVG Import

Want to design in a vector editor? You could:
1. Create an SVG in Inkscape/Illustrator
2. Extract the path coordinates
3. Convert to vertex format
4. Add to shapes.ts

Or we can implement SVG loading later if you want!
