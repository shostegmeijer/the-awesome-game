import { io, Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  UserJoinedPayload,
  UserLeftPayload,
  CursorsSyncPayload,
  CursorUpdatePayload,
  BulletUpdatePayload,
  HealthUpdatePayload,
  PlayerRespawnPayload
} from '@awesome-game/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Socket.io client manager with type safety
 */
export class SocketManager {
  private socket: TypedSocket;

  constructor(serverUrl: string) {
    this.socket = io(serverUrl) as TypedSocket;

    // Connection event listeners
    this.socket.on('connect', () => {
      console.log('✅ Connected to server');
      this.updateStatus('Connected', 'connected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      this.updateStatus('Connection Error', 'disconnected');
    });

    this.socket.on('disconnect', () => {
      console.log('⚠️ Disconnected from server');
      this.updateStatus('Disconnected', 'disconnected');
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts');
      this.updateStatus('Reconnected', 'connected');
    });

    this.socket.on('reconnect_attempt', () => {
      console.log('🔄 Attempting to reconnect...');
      this.updateStatus('Reconnecting...', 'disconnected');
    });
  }

  /**
   * Emit cursor movement to server
   */
  emitCursorMove(x: number, y: number, rotation: number): void {
    this.socket.emit('cursor:move', { x, y, rotation });
  }

  /**
   * Emit bullet shoot to server
   */
  emitBulletShoot(x: number, y: number, angle: number, isRocket?: boolean): void {
    this.socket.emit('bullet:shoot', { x, y, angle, isRocket });
  }

  /**
   * Emit laser shoot to server
   */
  emitLaserShoot(x: number, y: number, angle: number): void {
    this.socket.emit('laser:shoot', { x, y, angle });
  }

  /**
   * Emit health damage to server
   */
  emitHealthDamage(health: number, attackerId?: string): void {
    this.socket.emit('health:damage', { userId: this.socket.id, health, attackerId });
  }

  /**
   * Get the socket ID
   */
  getSocketId(): string | undefined {
    return this.socket.id;
  }

  /**
   * Listen for user joined events
   */
  onUserJoined(callback: (data: UserJoinedPayload) => void): void {
    this.socket.on('user:joined', callback);
  }

  /**
   * Listen for user left events
   */
  onUserLeft(callback: (data: UserLeftPayload) => void): void {
    this.socket.on('user:left', callback);
  }

  /**
   * Listen for cursors sync events
   */
  onCursorsSync(callback: (data: CursorsSyncPayload) => void): void {
    this.socket.on('cursors:sync', callback);
  }

  /**
   * Listen for cursor update events
   */
  onCursorUpdate(callback: (data: CursorUpdatePayload) => void): void {
    this.socket.on('cursor:update', callback);
  }

  /**
   * Listen for bullet spawn events
   */
  onBulletSpawn(callback: (data: BulletUpdatePayload) => void): void {
    this.socket.on('bullet:spawn', callback);
  }

  /**
   * Listen for health update events
   */
  /**
   * Listen for health update events
   */
  onHealthUpdate(callback: (data: HealthUpdatePayload) => void): void {
    this.socket.on('health:update', callback);
  }

  /**
   * Listen for player respawn events
   */
  onPlayerRespawn(callback: (data: PlayerRespawnPayload) => void): void {
    this.socket.on('player:respawn', callback);
  }

  /**
   * Generic event listener
   */
  on<Ev extends keyof ServerToClientEvents>(event: Ev, callback: ServerToClientEvents[Ev]): void {
    this.socket.on(event, callback as any);
  }

  /**
   * Update connection status UI
   */
  private updateStatus(text: string, className: string): void {
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = text;
      statusElement.className = `status ${className}`;
    }
  }
}
