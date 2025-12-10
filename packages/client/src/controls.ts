/**
 * Input control system with configurable key bindings
 */

export type Action =
  | 'shoot'
  | 'moveUp'
  | 'moveDown'
  | 'moveLeft'
  | 'moveRight'
  | 'boost'
  | 'special';

export interface KeyBinding {
  key: string;
  action: Action;
}

/**
 * Default key bindings (easily customizable!)
 */
export const DEFAULT_KEY_BINDINGS: KeyBinding[] = [
  { key: ' ', action: 'shoot' },        // Spacebar
  { key: 'w', action: 'moveUp' },
  { key: 's', action: 'moveDown' },
  { key: 'a', action: 'moveLeft' },
  { key: 'd', action: 'moveRight' },
  { key: 'Shift', action: 'boost' },
  { key: 'e', action: 'special' }
];

export class ControlsManager {
  private keyBindings: Map<string, Action> = new Map();
  private keyStates: Map<Action, boolean> = new Map();
  private actionCallbacks: Map<Action, () => void> = new Map();
  private continuousCallbacks: Map<Action, () => void> = new Map();

  constructor(bindings: KeyBinding[] = DEFAULT_KEY_BINDINGS) {
    // Initialize key bindings
    bindings.forEach(binding => {
      this.keyBindings.set(binding.key.toLowerCase(), binding.action);
    });

    // Initialize all action states to false
    const allActions: Action[] = ['shoot', 'moveUp', 'moveDown', 'moveLeft', 'moveRight', 'boost', 'special'];
    allActions.forEach(action => {
      this.keyStates.set(action, false);
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set up keyboard event listeners
   */
  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  /**
   * Handle key down events
   */
  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    const action = this.keyBindings.get(key);

    if (action) {
      // Prevent default browser behavior (like scrolling on spacebar)
      e.preventDefault();

      // Only trigger if not already pressed (prevents key repeat)
      if (!this.keyStates.get(action)) {
        this.keyStates.set(action, true);

        // Trigger one-time callback
        const callback = this.actionCallbacks.get(action);
        if (callback) {
          callback();
        }
      }
    }
  }

  /**
   * Handle key up events
   */
  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    const action = this.keyBindings.get(key);

    if (action) {
      e.preventDefault();
      this.keyStates.set(action, false);
    }
  }

  /**
   * Register a callback for when an action key is pressed (one-time trigger)
   */
  onAction(action: Action, callback: () => void): void {
    this.actionCallbacks.set(action, callback);
  }

  /**
   * Register a callback for continuous action (called every frame while key is held)
   */
  onContinuous(action: Action, callback: () => void): void {
    this.continuousCallbacks.set(action, callback);
  }

  /**
   * Check if an action is currently active
   */
  isActionActive(action: Action): boolean {
    return this.keyStates.get(action) || false;
  }

  /**
   * Update continuous actions (call this in your game loop)
   */
  update(): void {
    this.continuousCallbacks.forEach((callback, action) => {
      if (this.keyStates.get(action)) {
        callback();
      }
    });
  }

  /**
   * Change a key binding
   */
  rebindKey(oldKey: string, newKey: string): void {
    const action = this.keyBindings.get(oldKey.toLowerCase());
    if (action) {
      this.keyBindings.delete(oldKey.toLowerCase());
      this.keyBindings.set(newKey.toLowerCase(), action);
    }
  }

  /**
   * Get current key for an action
   */
  getKeyForAction(action: Action): string | undefined {
    for (const [key, boundAction] of this.keyBindings.entries()) {
      if (boundAction === action) {
        return key;
      }
    }
    return undefined;
  }

  /**
   * Get all key bindings as a readable object
   */
  getBindings(): Record<Action, string> {
    const bindings: Partial<Record<Action, string>> = {};
    this.keyBindings.forEach((action, key) => {
      bindings[action] = key === ' ' ? 'Space' : key.toUpperCase();
    });
    return bindings as Record<Action, string>;
  }
}
