import { io, Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  UserJoinedPayload,
  UserLeftPayload,
  CursorsSyncPayload,
  CursorUpdatePayload
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
  emitCursorMove(x: number, y: number): void {
    this.socket.emit('cursor:move', { x, y });
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
