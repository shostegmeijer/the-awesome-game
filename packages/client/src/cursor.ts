/**
 * Remote cursor state management
 */

interface RemoteCursor {
  x: number;
  y: number;
  targetX: number; // Target position from network
  targetY: number;
  prevX: number; // For velocity calculation
  prevY: number;
  rotation: number;
  health: number; // 0-100
  color: string;
  label: string;
  type?: 'player' | 'bot';
  lastSeen: number;
}

export class CursorManager {
  private cursors = new Map<string, RemoteCursor>();

  /**
   * Force set cursor position without interpolation (for syncing bullet spawns)
   */
  setCursorPosition(userId: string, x: number, y: number): void {
    const existing = this.cursors.get(userId);
    if (existing) {
      this.cursors.set(userId, {
        ...existing,
        x,
        y,
        prevX: existing.x,
        prevY: existing.y
      });
    }
  }

  /**
   * Update cursor target position from network (actual interpolation happens in update())
   */
  updateCursor(userId: string, x: number, y: number, color?: string, label?: string, health?: number, type?: 'player' | 'bot', rotation?: number): void {
    const existing = this.cursors.get(userId);

    if (existing) {
      // Just update the target position - interpolation happens in update()
      this.cursors.set(userId, {
        ...existing,
        targetX: x,
        targetY: y,
        color: color || existing.color,
        label: label || existing.label,
        health: typeof health === 'number' ? health : existing.health,
        type: typeof type !== 'undefined' ? type : existing.type,
        rotation: typeof rotation === 'number' ? rotation : existing.rotation,
        lastSeen: Date.now()
      });
    } else {
      // First update - set directly
      this.cursors.set(userId, {
        x,
        y,
        targetX: x,
        targetY: y,
        prevX: x,
        prevY: y,
        rotation: typeof rotation === 'number' ? rotation : 0,
        health: typeof health === 'number' ? health : 100, // Start with full health
        color: color || '#fff',
        label: label || 'Unknown',
        type,
        lastSeen: Date.now()
      });
      console.log(`👤 New cursor: ${label || 'Unknown'} (${userId})`);
    }
  }

  /**
   * Update all cursors (interpolate toward target, calculate rotation)
   * Call this every frame for smooth movement
   */
  update(): void {
    this.cursors.forEach((cursor) => {
      // Store previous position for velocity calculation
      const prevX = cursor.x;
      const prevY = cursor.y;

      // Smooth interpolation toward target position
      const followSpeed = 0.08; // Match local cursor follow speed
      const dx = cursor.targetX - cursor.x;
      const dy = cursor.targetY - cursor.y;

      cursor.x += dx * followSpeed;
      cursor.y += dy * followSpeed;

      // Calculate rotation based on movement direction for all cursors
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        const targetRotation = Math.atan2(dy, dx);

        // Smooth rotation interpolation
        let rotationDiff = targetRotation - cursor.rotation;

        // Normalize angle difference to [-PI, PI]
        while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
        while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;

        cursor.rotation += rotationDiff * 0.15;
      }

      // Update previous position
      cursor.prevX = prevX;
      cursor.prevY = prevY;
    });
  }

  /**
   * Damage a cursor (reduce health)
   */
  damageCursor(userId: string, damage: number): boolean {
    const cursor = this.cursors.get(userId);
    if (cursor) {
      cursor.health = Math.max(0, cursor.health - damage);
      console.log(`💥 ${cursor.label} hit! Health: ${cursor.health}`);
      return cursor.health <= 0; // Returns true if dead
    }
    return false;
  }

  /**
   * Set absolute health for a cursor
   */
  setHealth(userId: string, health: number): void {
    const cursor = this.cursors.get(userId);
    if (cursor) {
      cursor.health = health;
      console.log(`❤️ ${cursor.label} health updated: ${cursor.health}`);
    }
  }

  /**
   * Remove a cursor
   */
  removeCursor(userId: string): void {
    const cursor = this.cursors.get(userId);
    if (cursor) {
      console.log(`👋 Cursor removed: ${cursor.label} (${userId})`);
      this.cursors.delete(userId);
    }
  }

  /**
   * Get all cursors
   */
  getCursors(): Map<string, RemoteCursor> {
    return this.cursors;
  }

  /**
   * Sync cursors from initial state
   */
  syncCursors(cursorsData: Record<string, { x: number; y: number; color: string; label: string; health: number; rotation?: number; type?: 'player' | 'bot' }>): void {
    Object.entries(cursorsData).forEach(([userId, data]) => {
      this.updateCursor(userId, data.x, data.y, data.color, data.label, data.health, data.type, data.rotation);
    });
    console.log(`🔄 Synced ${Object.keys(cursorsData).length} cursors`);
  }

  /**
   * Clean up stale cursors (not seen in maxAge milliseconds)
   */
  cleanupStaleCursors(maxAge: number = 5000): void {
    const now = Date.now();
    const staleIds: string[] = [];

    this.cursors.forEach((cursor, userId) => {
      if (now - cursor.lastSeen > maxAge) {
        staleIds.push(userId);
      }
    });

    staleIds.forEach(id => {
      console.log(`🧹 Removing stale cursor: ${id}`);
      this.cursors.delete(id);
    });
  }
}
