/**
 * Remote cursor state management
 */

interface RemoteCursor {
  x: number;
  y: number;
  color: string;
  label: string;
  lastSeen: number;
}

export class CursorManager {
  private cursors = new Map<string, RemoteCursor>();

  /**
   * Update cursor position for a user
   */
  updateCursor(userId: string, x: number, y: number, color?: string, label?: string): void {
    const existing = this.cursors.get(userId);

    if (existing) {
      // Update existing cursor with smooth interpolation
      const lerpFactor = 0.3; // Smooth transition
      const newX = existing.x + (x - existing.x) * lerpFactor;
      const newY = existing.y + (y - existing.y) * lerpFactor;

      this.cursors.set(userId, {
        x: newX,
        y: newY,
        color: color || existing.color,
        label: label || existing.label,
        lastSeen: Date.now()
      });
    } else {
      // First update - set directly
      this.cursors.set(userId, {
        x,
        y,
        color: color || '#fff',
        label: label || 'Unknown',
        lastSeen: Date.now()
      });
      console.log(`👤 New cursor: ${label || 'Unknown'} (${userId})`);
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
  syncCursors(cursorsData: Record<string, { x: number; y: number; color: string; label: string }>): void {
    Object.entries(cursorsData).forEach(([userId, data]) => {
      this.updateCursor(userId, data.x, data.y, data.color, data.label);
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
