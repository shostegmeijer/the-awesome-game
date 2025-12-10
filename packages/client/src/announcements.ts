/**
 * Announcement system for big event notifications
 */

interface Announcement {
  id: number;
  text: string;
  subtext?: string;
  color: string;
  startTime: number;
  duration: number;
  scale: number;
}

export class AnnouncementSystem {
  private announcements: Announcement[] = [];
  private nextId = 0;

  /**
   * Show a kill announcement
   */
  announceKill(killerName: string, victimName: string, points: number): void {
    this.show(`${killerName} eliminated ${victimName}!`, `+${points} points`, '#FF0000', 3000);
  }

  /**
   * Show a power-up collected announcement
   */
  announcePowerUp(weaponName: string, weaponIcon: string): void {
    this.show(`${weaponIcon} ${weaponName}`, 'Power-up collected!', '#FFD700', 2000);
  }

  /**
   * Show a King of the Hill announcement
   */
  announceKingOfHill(playerName: string): void {
    this.show(`👑 ${playerName} controls the hill!`, '+10 points/sec', '#FFD700', 2500);
  }

  /**
   * Show a mine explosion announcement
   */
  announceMineExplosion(playerName: string, points: number): void {
    this.show(`💣 ${playerName} triggered a mine!`, `+${points} points`, '#FF6600', 2000);
  }

  /**
   * Show a custom announcement
   */
  show(text: string, subtext?: string, color: string = '#FFFFFF', duration: number = 3000): void {
    const announcement: Announcement = {
      id: this.nextId++,
      text,
      subtext,
      color,
      startTime: performance.now(),
      duration,
      scale: 0
    };

    this.announcements.push(announcement);

    // Auto-remove old announcements
    if (this.announcements.length > 3) {
      this.announcements.shift();
    }
  }

  /**
   * Update announcements
   */
  update(): void {
    const now = performance.now();

    this.announcements.forEach(announcement => {
      const elapsed = now - announcement.startTime;
      const progress = elapsed / announcement.duration;

      if (progress < 0.2) {
        // Scale in (0 to 1)
        announcement.scale = progress / 0.2;
      } else if (progress > 0.8) {
        // Scale out (1 to 0)
        announcement.scale = (1 - progress) / 0.2;
      } else {
        announcement.scale = 1;
      }
    });

    // Remove expired announcements
    this.announcements = this.announcements.filter(a => {
      const elapsed = now - a.startTime;
      return elapsed < a.duration;
    });
  }

  /**
   * Render all announcements
   */
  render(ctx: CanvasRenderingContext2D): void {
    const centerX = window.innerWidth / 2;
    let offsetY = window.innerHeight / 3;

    this.announcements.forEach((announcement, index) => {
      ctx.save();

      const alpha = Math.min(1, announcement.scale);
      const scale = 0.8 + announcement.scale * 0.2; // 0.8 to 1.0

      ctx.globalAlpha = alpha;
      ctx.translate(centerX, offsetY);
      ctx.scale(scale, scale);

      // Main text
      ctx.shadowBlur = 20;
      ctx.shadowColor = announcement.color;
      ctx.fillStyle = announcement.color;
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(announcement.text, 0, 0);

      // Subtext
      if (announcement.subtext) {
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Arial';
        ctx.fillText(announcement.subtext, 0, 40);
      }

      ctx.restore();

      offsetY += 100; // Spacing between announcements
    });
  }

  /**
   * Clear all announcements
   */
  clear(): void {
    this.announcements = [];
  }
}
