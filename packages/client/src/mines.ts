/**
 * Mine system - explosive hazards (Client-side rendering only)
 */

import { MineData } from '@awesome-game/shared';

interface ClientMine extends MineData {
  pulsePhase: number;
  blinkPhase: number;
}

export class MineSystem {
  private mines: ClientMine[] = [];

  // Visual properties
  private damageRadius = 120; // For visualization only

  /**
   * Update mine animations
   */
  update(_currentTime: number): void {
    // Update animations
    this.mines.forEach(mine => {
      mine.pulsePhase += 0.08;
      mine.blinkPhase += 0.15;
    });
  }

  /**
   * Sync mines from server
   */
  syncMines(serverMines: MineData[]): void {
    // Replace current mines but try to preserve animation phases if possible
    const newMines: ClientMine[] = [];

    serverMines.forEach(serverMine => {
      const existing = this.mines.find(m => m.id === serverMine.id);
      if (existing) {
        // Update position if needed, keep phases
        existing.x = serverMine.x;
        existing.y = serverMine.y;
        newMines.push(existing);
      } else {
        // New mine
        newMines.push({
          ...serverMine,
          pulsePhase: Math.random() * Math.PI * 2,
          blinkPhase: Math.random() * Math.PI * 2
        });
      }
    });

    this.mines = newMines;
    console.log(`💣 Synced ${this.mines.length} mines`);
  }

  /**
   * Add a single mine from server
   */
  addMine(mineData: MineData): void {
    this.mines.push({
      ...mineData,
      pulsePhase: 0,
      blinkPhase: 0
    });
    console.log('💣 Mine spawned!');
  }

  /**
   * Remove a mine (exploded)
   */
  removeMine(id: string): void {
    this.mines = this.mines.filter(m => m.id !== id);
  }

  /**
   * Render all mines
   */
  render(ctx: CanvasRenderingContext2D): void {
    this.mines.forEach(mine => {
      ctx.save();

      const pulse = 1 + Math.sin(mine.pulsePhase) * 0.2;
      const blink = 0.7 + Math.sin(mine.blinkPhase) * 0.3; // 0.4 to 1.0

      // Outer glow layer
      ctx.globalAlpha = 0.4 * blink;
      ctx.shadowBlur = 40;
      ctx.shadowColor = '#FF1493';
      ctx.strokeStyle = '#FF1493';
      ctx.lineWidth = 8;

      ctx.beginPath();
      ctx.arc(mine.x, mine.y, mine.radius * pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Middle glow layer
      ctx.globalAlpha = 0.6 * blink;
      ctx.shadowBlur = 30;
      ctx.strokeStyle = '#FF69B4';
      ctx.lineWidth = 5;

      ctx.beginPath();
      ctx.arc(mine.x, mine.y, mine.radius * pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Inner bright circle
      ctx.globalAlpha = 1 * blink;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#FFFFFF';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(mine.x, mine.y, mine.radius * pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    });
  }

  /**
   * Get all mines (for reference if needed)
   */
  getMines(): ClientMine[] {
    return this.mines;
  }

  /**
   * Clear all mines
   */
  clear(): void {
    this.mines = [];
  }
}
