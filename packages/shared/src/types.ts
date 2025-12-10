// Socket.io event interfaces for type-safe communication

// Client → Server events
export interface CursorMovePayload {
  x: number;
  y: number;
  rotation: number;
}

// Server → Client events
export interface UserJoinedPayload {
  userId: string;
  cursors: CursorData[];
  color: string;
  label: string;
}

export interface UserLeftPayload {
  userId: string;
}

export interface CursorData {
  x: number;
  y: number;
  rotation: number;
  color: string;
  label: string;
  health: number;
  type: CursorType;
  activeWeapon?: WeaponType;
  shield?: number;
}

export interface CursorsSyncPayload {
  cursors: Record<string, CursorData>;
}

export interface CursorUpdatePayload {
  userId: string;
  x: number;
  y: number;
  rotation: number;
  color: string;
  label: string;
  health: number;
  type: CursorType;
  activeWeapon?: WeaponType;
  shield?: number;
}

export type CursorType = 'player' | 'bot';

// Payload for bullet shoot
export interface BulletShootPayload {
  x: number;
  y: number;
  angle: number;
  isRocket?: boolean;
}

// Payload for bullet update
export interface BulletUpdatePayload {
  bulletId: string;
  userId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  isRocket?: boolean;
}

// Payload for health update
export interface HealthUpdatePayload {
  userId: string;
  health: number;
  shield?: number;
  attackerId?: string;
}

// Socket.io event map for type safety
// Weapon Types
export enum WeaponType {
  MACHINE_GUN = 'machineGun',
  TRIPLE_SHOT = 'tripleShot',
  SHOTGUN = 'shotgun',
  ROCKET = 'rocket',
  LASER = 'laser',
  HOMING_MISSILES = 'homingMissiles'
}

// PowerUp Types
export enum PowerUpType {
  WEAPON = 'weapon',
  HEALTH = 'health',
  SHIELD = 'shield'
}

// Mine Data
export interface MineData {
  id: string;
  x: number;
  y: number;
  radius: number;
}

// PowerUp Data
export interface PowerUpData {
  id: string;
  x: number;
  y: number;
  type: PowerUpType;
  weaponType?: WeaponType; // Only for weapon powerups
}

// Event Payloads
export interface MineExplodePayload {
  mineId: string;
  x: number;
  y: number;
  triggeredBy?: string;
}

export interface PowerUpCollectPayload {
  powerUpId: string;
  userId: string;
  type: PowerUpType;
  weaponType?: WeaponType;
}

export interface WeaponExplodePayload {
  x: number;
  y: number;
  weaponType: WeaponType;
  triggeredBy: string;
}

export interface MinesSyncPayload {
  mines: MineData[];
}

export interface PowerUpsSyncPayload {
  powerups: PowerUpData[];
}

// Payload for laser shoot
export interface LaserShootPayload {
  x: number;
  y: number;
  angle: number;
}

// Payload for laser spawn (broadcast)
export interface LaserSpawnPayload {
  userId: string;
  x: number;
  y: number;
  angle: number;
  color: string;
}

// Payload for knockback
export interface KnockbackPayload {
  userId: string;
  vx: number;
  vy: number;
}

// Payload for kill event
export interface KillPayload {
  killerId: string;
  killerName: string;
  victimId: string;
  victimName: string;
  points: number;
}

// Socket.io event map for type safety
export interface ServerToClientEvents {
  'reconnect': (attemptNumber: number) => void;
  'reconnect_attempt': () => void;
  'user:joined': (data: UserJoinedPayload) => void;
  'user:left': (data: UserLeftPayload) => void;
  'cursors:sync': (data: CursorsSyncPayload) => void;
  'cursor:update': (data: CursorUpdatePayload) => void;
  'bullet:spawn': (data: BulletUpdatePayload) => void;
  'health:update': (data: HealthUpdatePayload) => void;
  'kill': (data: KillPayload) => void;
  'stats:update': (data: StatsUpdatePayload) => void;

  // New events
  'mine:spawn': (data: MineData) => void;
  'mine:explode': (data: MineExplodePayload) => void;
  'mine:sync': (data: MinesSyncPayload) => void;

  'powerup:spawn': (data: PowerUpData) => void;
  'powerup:collect': (data: PowerUpCollectPayload) => void;
  'powerup:sync': (data: PowerUpsSyncPayload) => void;

  'weapon:explode': (data: WeaponExplodePayload) => void;
  'laser:spawn': (data: LaserSpawnPayload) => void;

  // Admin events (usable on admin namespace or default)
  'admin:login:ok': (data: AdminLoginOkPayload) => void;
  'admin:login:error': (data: AdminErrorPayload) => void;
  'admin:error': (data: AdminErrorPayload) => void;
  'admin:players': (data: AdminPlayersPayload) => void;
  'admin:bots': (data: AdminBotsPayload) => void;
  'admin:addBot:ok': (data: { bot: { id: string; label: string } }) => void;
  'admin:removeBot:error': (data: AdminErrorPayload) => void;
  'admin:removeBot:ok': (data: { removed: string }) => void;
  'admin:removeAllBots:ok': (data: { removed: boolean }) => void;
  'admin:kickPlayer:ok': (data: { kicked: string }) => void;
  'admin:kickPlayer:error': (data: AdminErrorPayload) => void;
  'admin:settings': (data: AdminSettingsPayload) => void;
  'admin:endGame:ok': (data: AdminEndGamePayload) => void;
  'admin:endGame:error': (data: AdminErrorPayload) => void;
  'player:respawn': (data: PlayerRespawnPayload) => void;
  'player:killed': (data: PlayerKilledPayload) => void;
  'player:info': (data: PlayerInfoPayload) => void;
  'knockback': (data: KnockbackPayload) => void;
  'score:update': (data: { scores: Array<PlayerScore> }) => void;
}

export interface PlayerKilledPayload {
  victimId: string;
  victimName: string;
  attackerId: string;
  attackerName: string;
}

export interface PlayerRespawnPayload {
  userId: string;
  x: number;
  y: number;
  respawnTime: number; // Timestamp when respawn happens
}

export interface PlayerInfoPayload {
  userId: string;
  label: string;
  color: string;
  kills: number;
  deaths: number;
  health: number;
}

export interface StatsUpdatePayload {
  userId: string;
  kills: number;
  deaths: number;
}

export interface ClientToServerEvents {
  'cursor:move': (data: CursorMovePayload) => void;
  'bullet:shoot': (data: BulletShootPayload) => void;
  'laser:shoot': (data: LaserShootPayload) => void;
  'health:damage': (data: HealthUpdatePayload) => void;
  'admin:kickAll': () => void;

  // Admin events
  'admin:login': (data: { password: string }) => void;
  'admin:getPlayers': (data: { token: string }) => void;
  'admin:getBots': (data: { token: string }) => void;
  'admin:addBot': (data: { token: string }) => void;
  'admin:removeBot': (data: { token: string, id: string }) => void;
  'admin:removeAllBots': (data: { token: string }) => void;
  'admin:kickPlayer': (data: { token: string, id: string }) => void;
  'admin:getSettings': (data: { token: string }) => void;
  'admin:updateSettings': (data: { token: string, settings: Partial<AdminSettingsPayload> }) => void;
  'admin:endGame': (data: { token: string }) => void;
}

// --- Admin channel event maps ---
export interface AdminLoginOkPayload { token: string }
export interface AdminErrorPayload { error: string, id?: string }
export interface AdminPlayersPayload {
  players: Array<PlayerScore>
}
export interface AdminBotsPayload {
  bots: Array<{ id: string; label: string; x: number; y: number; health: number }>
}

export interface AdminSettingsPayload {
  botSpeed: number;
  botCount: number;
  botHealth: number;
  playerStartingHealth: number;
}

export interface AdminEndGamePayload {
  submitted: number;
  failed: number;
  total: number;
}

export interface PlayerScore {
  playerId: string;
  playerName: string;
  score: number;
  kills: number;
  deaths: number;
  botKills?: number;
}
