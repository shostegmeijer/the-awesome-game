// Socket.io event interfaces for type-safe communication

// Client → Server events
export interface CursorMovePayload {
  x: number;
  y: number;
}

// Server → Client events
export interface UserJoinedPayload {
  userId: string;
  color: string;
  label: string;
}

export interface UserLeftPayload {
  userId: string;
}

export interface CursorData {
  x: number;
  y: number;
  color: string;
  label: string;
  health: number;
}

export interface CursorsSyncPayload {
  cursors: Record<string, CursorData>;
}

export interface CursorUpdatePayload {
  userId: string;
  x: number;
  y: number;
}

// Payload for bullet shoot
export interface BulletShootPayload {
  x: number;
  y: number;
  angle: number;
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
}

// Payload for health update
export interface HealthUpdatePayload {
  userId: string;
  health: number;
}

// Socket.io event map for type safety
// Weapon Types
export enum WeaponType {
  MACHINE_GUN = 'machineGun',
  TRIPLE_SHOT = 'tripleShot',
  SHOTGUN = 'shotgun',
  ROCKET = 'rocket',
  LASER = 'laser'
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
  weaponType: WeaponType;
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
  weaponType: WeaponType;
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

// Socket.io event map for type safety
export interface ServerToClientEvents {
  'user:joined': (data: UserJoinedPayload) => void;
  'user:left': (data: UserLeftPayload) => void;
  'cursors:sync': (data: CursorsSyncPayload) => void;
  'cursor:update': (data: CursorUpdatePayload) => void;
  'bullet:spawn': (data: BulletUpdatePayload) => void;
  'health:update': (data: HealthUpdatePayload) => void;

  // New events
  'mine:spawn': (data: MineData) => void;
  'mine:explode': (data: MineExplodePayload) => void;
  'mine:sync': (data: MinesSyncPayload) => void;

  'powerup:spawn': (data: PowerUpData) => void;
  'powerup:collect': (data: PowerUpCollectPayload) => void;
  'powerup:sync': (data: PowerUpsSyncPayload) => void;

  'weapon:explode': (data: WeaponExplodePayload) => void;
}

export interface ClientToServerEvents {
  'cursor:move': (data: CursorMovePayload) => void;
  'bullet:shoot': (data: BulletShootPayload) => void;
  'health:damage': (data: HealthUpdatePayload) => void;

  // New events - mostly for verification/client-initiated actions if needed
  // But primarily server drives these now
}
