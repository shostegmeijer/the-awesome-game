// User state management

export interface UserState {
  id: string;
  color: string;
  label: string;
  x: number;
  y: number;
  rotation: number;
  health: number;
  points: number;
  lastUpdate: number;
  weaponType: string; // Track current weapon
  radius: number; // Collision radius
  kills: number;
  deaths: number;
  playerKey?: string; // INNSPIRE hub player key
  scoreSubmitted: boolean; // Track if score has been submitted to hub
  vx: number; // Velocity X for physics
  vy: number; // Velocity Y for physics
}

import { MAP_HEIGHT, MAP_WIDTH } from '@awesome-game/shared';

const users = new Map<string, UserState>();

/**
 * Add a new user to the state
 */
export function addUser(id: string, playerKey?: string): UserState {
  const color = generateColor();
  const label = playerKey ? `Player ${users.size + 1}` : `User ${users.size + 1}`;
  const user: UserState = {
    id,
    color,
    label,
    x: 0,
    y: 0,
    rotation: 0,
    health: 100,
    points: 0,
    lastUpdate: Date.now(),
    weaponType: 'machineGun',
    radius: 25, // Standard ship radius
    kills: 0,
    deaths: 0,
    playerKey,
    scoreSubmitted: false,
    vx: 0, // Start with no velocity
    vy: 0
  };
  users.set(id, user);
  console.log(`✅ User added: ${label} (${id}) ${playerKey ? `[${playerKey}]` : ''} - ${color}`);
  return user;
}

/**
 * Remove a user from the state
 */
export function removeUser(id: string): void {
  const user = users.get(id);
  if (user) {
    users.delete(id);
    console.log(`❌ User removed: ${user.label} (${id})`);
  }
}

/**
 * Update cursor position for a user
 */
export function updateCursor(id: string, x: number, y: number, rotation: number): void {
  const user = users.get(id);
  if (user) {
    user.x = x;
    user.y = y;
    user.rotation = rotation;
    user.lastUpdate = Date.now();
  }
}

/**
 * Get all users
 */
export function getAllUsers(): Map<string, UserState> {
  return users;
}

/**
 * Update user health
 */
export function updateHealth(id: string, health: number): number | null {
  const user = users.get(id);
  if (user) {
    user.health = Math.max(0, Math.min(100, health));
    console.log(`💥 ${user.label} health: ${user.health}`);
    return user.health;
  }
  return null;
}

/**
 * Update user points
 */
export function updatePoints(id: string, pointsDelta: number): number | null {
  const user = users.get(id);
  if (user) {
    user.points = Math.max(0, user.points + pointsDelta);
    return user.points;
  }
  return null;
}
/**
 * Respawn a user
 */
export function respawnUser(id: string): UserState | null {
  const user = users.get(id);
  if (user) {
    user.health = 100;
    user.health = 100;
    // Respawn at random position (centered coordinates)
    user.x = (Math.random() - 0.5) * MAP_WIDTH;
    user.y = (Math.random() - 0.5) * MAP_HEIGHT;
    user.weaponType = 'machineGun'; // Reset weapon
    console.log(`✨ ${user.label} respawned at ${Math.round(user.x)}, ${Math.round(user.y)}`);
    return user;
  }
  return null;
}

// --- Bot management (simple in-memory placeholders) ---
export interface BotState {
  id: string;
  label: string;
  x: number;
  y: number;
  health: number;
  heading: number; // radians
}

const bots = new Map<string, BotState>();
let botLabelCounter = 0;

export function addBot(initialHealth: number = 50): BotState {
  const id = `bot-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  const padding = 100;
  // Use centered coordinates like players (-MAP_WIDTH/2 to MAP_WIDTH/2)
  const x = (Math.random() - 0.5) * (MAP_WIDTH - padding * 2);
  const y = (Math.random() - 0.5) * (MAP_HEIGHT - padding * 2);
  const bot: BotState = { id, label: `Bot ${++botLabelCounter}`, x, y, health: initialHealth, heading: Math.random() * Math.PI * 2 };
  bots.set(id, bot);
  console.log(`🤖 Bot added: ${bot.label} (${bot.id}) at (${Math.round(x)}, ${Math.round(y)})`);
  return bot;
}

export function removeBot(id: string): boolean {
  const existed = bots.delete(id);
  if (existed) console.log(`🗑️ Bot removed: ${id}`);
  return existed;
}

export function getAllBots(): BotState[] {
  return Array.from(bots.values());
}

export function setBotPosition(id: string, x: number, y: number) {
  const bot = bots.get(id);
  if (bot) { bot.x = x; bot.y = y; }
}

export function setBotHealth(id: string, health: number) {
  const bot = bots.get(id);
  if (bot) { bot.health = Math.max(0, Math.min(100, health)); }
}

export function setBotHeading(id: string, heading: number) {
  const bot = bots.get(id);
  if (bot) { bot.heading = heading; }
}

// Admin-configurable settings
export interface GameSettings {
  botSpeed: number; // pixels per tick
  botCount: number;
  botHealth: number;
  playerStartingHealth: number;
}

let settings: GameSettings = {
  botSpeed: 4.0,
  botCount: 5,
  botHealth: 30,
  playerStartingHealth: 100
};

export function getSettings(): GameSettings { return settings; }
export function updateSettings(partial: Partial<GameSettings>): GameSettings {
  settings = { ...settings, ...partial };
  return settings;
}

/**
 * Increment user kills
 */
export function addKill(id: string): number {
  const user = users.get(id);
  if (user) {
    user.kills++;
    return user.kills;
  }
  return 0;
}

/**
 * Increment user deaths
 */
export function addDeath(id: string): number {
  const user = users.get(id);
  if (user) {
    user.deaths++;
    return user.deaths;
  }
  return 0;
}

/**
 * Get leaderboard sorted by score (kills - deaths)
 */
export function getLeaderboard(): Array<{ userId: string; score: number; user: UserState }> {
  const leaderboard = Array.from(users.entries())
    .map(([userId, user]) => ({
      userId,
      score: user.kills * 100 - user.deaths * 50, // Same scoring as client
      user
    }))
    .sort((a, b) => b.score - a.score);

  return leaderboard;
}

/**
 * Get user rank (1-based)
 */
export function getUserRank(userId: string): number {
  const leaderboard = getLeaderboard();
  const index = leaderboard.findIndex(entry => entry.userId === userId);
  return index >= 0 ? index + 1 : 0;
}

/**
 * Mark score as submitted for a user
 */
export function markScoreSubmitted(id: string): void {
  const user = users.get(id);
  if (user) {
    user.scoreSubmitted = true;
  }
}

/**
 * Apply knockback to a player
 * Note: This only updates server state. The server must emit 'knockback' event separately.
 */
export function applyKnockback(id: string, forceX: number, forceY: number): void {
  const user = users.get(id);
  if (user) {
    user.vx += forceX;
    user.vy += forceY;
  }
}

/**
 * Get player velocity (for broadcasting knockback)
 */
export function getPlayerVelocity(id: string): { vx: number; vy: number } | null {
  const user = users.get(id);
  return user ? { vx: user.vx, vy: user.vy } : null;
}

/**
 * Update physics for all players (apply velocity and friction)
 */
export function updatePhysics(): void {
  const friction = 0.92; // Higher = less friction (0.92 = gradual slowdown)
  const maxSpeed = 15; // Cap maximum velocity

  users.forEach(user => {
    // Apply velocity to position
    user.x += user.vx;
    user.y += user.vy;

    // Apply friction (gradual slowdown)
    user.vx *= friction;
    user.vy *= friction;

    // Stop if velocity is very small (prevents endless tiny movements)
    if (Math.abs(user.vx) < 0.01) user.vx = 0;
    if (Math.abs(user.vy) < 0.01) user.vy = 0;

    // Cap max speed
    const speed = Math.sqrt(user.vx * user.vx + user.vy * user.vy);
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      user.vx *= scale;
      user.vy *= scale;
    }

    // Keep within map bounds
    const halfW = MAP_WIDTH / 2;
    const halfH = MAP_HEIGHT / 2;
    user.x = Math.max(-halfW, Math.min(user.x, halfW));
    user.y = Math.max(-halfH, Math.min(user.y, halfH));

    // Bounce off walls (reverse velocity if hit boundary)
    if (user.x <= -halfW || user.x >= halfW) {
      user.vx *= -0.5; // Reverse and dampen
    }
    if (user.y <= -halfH || user.y >= halfH) {
      user.vy *= -0.5; // Reverse and dampen
    }
  });
}

/**
 * Generate a random neon color for a user (Geometry Wars style)
 */
function generateColor(): string {
  const colors = [
    '#00FFFF', // Cyan
    '#FF00FF', // Magenta
    '#FFFF00', // Yellow
    '#00FF00', // Lime green
    '#FF0099', // Hot pink
    '#00FFAA', // Aqua
    '#FF6600', // Orange
    '#9900FF', // Purple
    '#00FF66', // Spring green
    '#FF3366', // Red-pink
    '#66FF00', // Chartreuse
    '#0099FF', // Sky blue
    '#FF9900', // Gold
    '#CC00FF', // Violet
    '#00FFCC'  // Turquoise
  ];
  return colors[users.size % colors.length];
}
