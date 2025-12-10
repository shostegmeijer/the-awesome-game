/**
 * King of the Hill zone system
 */

interface Zone {
  x: number;
  y: number;
  radius: number;
  pulsePhase: number;
  rotationPhase: number;
}

export class KingOfHillSystem {
  private zone: Zone | null = null;
  private moveInterval = 20000; // Move every 20 seconds
  private lastMoveTime = 0;
  private zoneRadius = 80;
  private pointsPerSecond = 10;
  private occupantId: string | null = null;

  /**
   * Update zone and check for occupants
   */
  update(currentTime: number, playerX: number, playerY: number, playerId: string): { points: number; isOccupying: boolean } {
    // Create initial zone
    if (!this.zone) {
      this.spawnZone();
      this.lastMoveTime = currentTime;
    }

    // Update animation
    if (this.zone) {
      this.zone.pulsePhase += 0.05;
      this.zone.rotationPhase += 0.02;
    }

    // Move zone periodically
    if (currentTime - this.lastMoveTime > this.moveInterval) {
      this.spawnZone();
      this.lastMoveTime = currentTime;
      console.log('👑 King of the Hill zone moved!');
    }

    // Check if player is in zone
    const isInZone = this.checkOccupancy(playerX, playerY, playerId);

    return {
      points: isInZone ? this.pointsPerSecond / 60 : 0, // Points per frame
      isOccupying: isInZone
    };
  }

  /**
   * Check if a player is occupying the zone
   */
  checkOccupancy(x: number, y: number, playerId: string): boolean {
    if (!this.zone) return false;

    const dx = x - this.zone.x;
    const dy = y - this.zone.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const isInZone = distance < this.zone.radius;

    if (isInZone && this.occupantId !== playerId) {
      this.occupantId = playerId;
    } else if (!isInZone && this.occupantId === playerId) {
      this.occupantId = null;
    }

    return isInZone;
  }

  /**
   * Check if any player is occupying (for remote players)
   */
  checkRemoteOccupancy(x: number, y: number): boolean {
    if (!this.zone) return false;

    const dx = x - this.zone.x;
    const dy = y - this.zone.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < this.zone.radius;
  }

  /**
   * Spawn zone at random location
   */
  private spawnZone(): void {
    const padding = 150;
    const x = padding + Math.random() * (window.innerWidth - padding * 2);
    const y = padding + Math.random() * (window.innerHeight - padding * 2);

    this.zone = {
      x,
      y,
      radius: this.zoneRadius,
      pulsePhase: 0,
      rotationPhase: 0
    };

    this.occupantId = null;
  }

  /**
   * Render the zone
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this.zone) return;

    ctx.save();

    const zone = this.zone;
    const pulse = 1 + Math.sin(zone.pulsePhase) * 0.15;

    // Rotating outer ring
    const spokes = 12;
    ctx.save();
    ctx.translate(zone.x, zone.y);
    ctx.rotate(zone.rotationPhase);

    for (let i = 0; i < spokes; i++) {
      const angle = (Math.PI * 2 * i) / spokes;
      const x1 = Math.cos(angle) * (zone.radius * pulse);
      const y1 = Math.sin(angle) * (zone.radius * pulse);
      const x2 = Math.cos(angle) * (zone.radius * pulse * 1.2);
      const y2 = Math.sin(angle) * (zone.radius * pulse * 1.2);

      ctx.strokeStyle = '#FFD700';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#FFD700';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.7;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();

    // Main glowing circle
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#FFD700';
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#FFD700';

    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Border ring
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius * pulse, 0, Math.PI * 2);
    ctx.stroke();

    // Crown icon
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👑', zone.x, zone.y);

    // Label
    ctx.shadowBlur = 5;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('KING OF THE HILL', zone.x, zone.y - zone.radius - 20);
    ctx.fillText(`+${this.pointsPerSecond}/s`, zone.x, zone.y + zone.radius + 20);

    ctx.restore();
  }

  /**
   * Get zone position (for debugging)
   */
  getZone(): Zone | null {
    return this.zone;
  }
}
