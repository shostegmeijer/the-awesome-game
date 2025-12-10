// User state management

export interface UserState {
  id: string;
  color: string;
  label: string;
  x: number;
  y: number;
  rotation: number;
  health: number;
  lastUpdate: number;
  weaponType: string; // Track current weapon
  radius: number; // Collision radius
}

const users = new Map<string, UserState>();

/**
 * Add a new user to the state
 */
export function addUser(id: string): UserState {
  const color = generateColor();
  const label = `User ${users.size + 1}`;
  const user: UserState = {
    id,
    color,
    label,
    x: 0,
    y: 0,
    rotation: 0,
    health: 100,
    lastUpdate: Date.now(),
    weaponType: 'machineGun',
    radius: 25 // Standard ship radius
  };
  users.set(id, user);
  console.log(`✅ User added: ${label} (${id}) - ${color}`);
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
 * Respawn a user
 */
export function respawnUser(id: string): UserState | null {
  const user = users.get(id);
  if (user) {
    user.health = 100;
    user.x = Math.random() * 2000; // Random position
    user.y = Math.random() * 2000;
    user.weaponType = 'machineGun'; // Reset weapon
    console.log(`✨ ${user.label} respawned at ${Math.round(user.x)}, ${Math.round(user.y)}`);
    return user;
  }
  return null;
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
