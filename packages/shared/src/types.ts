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
export interface ServerToClientEvents {
  'user:joined': (data: UserJoinedPayload) => void;
  'user:left': (data: UserLeftPayload) => void;
  'cursors:sync': (data: CursorsSyncPayload) => void;
  'cursor:update': (data: CursorUpdatePayload) => void;
  'bullet:spawn': (data: BulletUpdatePayload) => void;
  'health:update': (data: HealthUpdatePayload) => void;
}

export interface ClientToServerEvents {
  'cursor:move': (data: CursorMovePayload) => void;
  'bullet:shoot': (data: BulletShootPayload) => void;
  'health:damage': (data: HealthUpdatePayload) => void;
}
