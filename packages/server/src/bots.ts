import { ClientToServerEvents, MAP_WIDTH, ServerToClientEvents } from '@awesome-game/shared';
import { Server } from 'socket.io';
import { BulletSystem } from './bullets.js';
import { addBot, getAllBots, getSettings, removeBot, setBotHeading, setBotHealth, setBotPosition } from './state.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export class BotSystem {
  private io: TypedServer;
  private bullets: BulletSystem;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(io: TypedServer, bullets: BulletSystem) {
    this.io = io;
    this.bullets = bullets;
  }

  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.tick(), 60); // faster ticks for more motion
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  private tick(): void {
    const s = getSettings();
    let bots = getAllBots();

    // Maintain bot count from settings
    while (bots.length < s.botCount) {
      addBot(s.botHealth);
      bots = getAllBots();
    }
    while (bots.length > s.botCount) {
      const latest = getAllBots();
      removeBot(latest[latest.length - 1].id);
      bots = getAllBots();
    }

    // Movement params - use centered coordinates like players
    const padding = 50;
    const halfWidth = MAP_WIDTH / 2;
    const halfHeight = MAP_WIDTH / 2; // Note: MAP_HEIGHT would be better but keeping MAP_WIDTH for now
    const minX = -halfWidth + padding;
    const maxX = halfWidth - padding;
    const minY = -halfHeight + padding;
    const maxY = halfHeight - padding;
    const baseSpeed = s.botSpeed; // admin-controlled

      bots.forEach(bot => {
        // If bot is dead, schedule respawn and skip rendering/acting until then
        if (bot.health <= 0) {
          const anyBot = bot as any;
          if (!anyBot.respawnAt) {
            anyBot.respawnAt = Date.now() + 3000; // 3s respawn delay
          } else if (Date.now() >= anyBot.respawnAt) {
            setBotHealth(bot.id, s.botHealth);
            // Reposition safely within map on respawn (centered coordinates)
            const rx = (Math.random() - 0.5) * (MAP_WIDTH - padding * 2);
            const ry = (Math.random() - 0.5) * (MAP_WIDTH - padding * 2);
            setBotPosition(bot.id, rx, ry);
            anyBot.respawnAt = null;
          }
          // Do not move/shoot/emit while dead
          return;
        }
      // Randomize speed a bit per tick
      const speedJitter = baseSpeed * (1.0 + Math.random() * 1.2); // 1.0x–2.2x
      // Occasionally change heading
      if (Math.random() < 0.25) {
        const newHeading = bot.heading + (Math.random() - 0.5) * 0.8; // stronger turn
        setBotHeading(bot.id, newHeading);
      }
      // Clamp current position defensively inside map before moving (centered coordinates)
      let cx = Math.min(Math.max(bot.x, minX), maxX);
      let cy = Math.min(Math.max(bot.y, minY), maxY);
      let nx = cx + Math.cos(bot.heading) * speedJitter;
      let ny = cy + Math.sin(bot.heading) * speedJitter;
      // Bounce from walls (centered coordinates)
      if (nx < minX || nx > maxX) {
        setBotHeading(bot.id, Math.PI - bot.heading);
        nx = Math.min(Math.max(nx, minX), maxX);
      }
      if (ny < minY || ny > maxY) {
        setBotHeading(bot.id, -bot.heading);
        ny = Math.min(Math.max(ny, minY), maxY);
      }
      setBotPosition(bot.id, nx, ny);

        // Emit cursor update for bot (typed)
        this.io.emit('cursor:update', {
          userId: bot.id,
          x: nx,
          y: ny,
          color: '#00aaff',
          label: bot.label,
          health: bot.health,
          type: 'bot',
        });

      // Random shooting
        if (Math.random() < 0.06) {
        const userId = bot.id;
        const bulletId = `${userId}-${Date.now()}-${Math.random()}`;
        const angle = bot.heading + (Math.random() - 0.5) * 0.6; // fire roughly forward
        const x = nx, y = ny;
        this.bullets.addBullet(bulletId, userId, x, y, angle);
        const bulletSpeed = 12;
        const vx = Math.cos(angle) * bulletSpeed;
        const vy = Math.sin(angle) * bulletSpeed;
        this.io.emit('bullet:spawn', { bulletId, userId, x, y, vx, vy, color: '#FF00FF' });
      }
    });
  }
}
