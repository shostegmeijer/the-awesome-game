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
}

export interface CursorsSyncPayload {
  cursors: Record<string, CursorData>;
}

export interface CursorUpdatePayload {
  userId: string;
  x: number;
  y: number;
}

// Socket.io event map for type safety
export interface ServerToClientEvents {
  'user:joined': (data: UserJoinedPayload) => void;
  'user:left': (data: UserLeftPayload) => void;
  'cursors:sync': (data: CursorsSyncPayload) => void;
  'cursor:update': (data: CursorUpdatePayload) => void;
}

export interface ClientToServerEvents {
  'cursor:move': (data: CursorMovePayload) => void;
}
