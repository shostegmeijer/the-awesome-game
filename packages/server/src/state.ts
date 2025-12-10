// User state management

export interface UserState {
  id: string;
  color: string;
  label: string;
  x: number;
  y: number;
  lastUpdate: number;
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
    lastUpdate: Date.now()
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
export function updateCursor(id: string, x: number, y: number): void {
  const user = users.get(id);
  if (user) {
    user.x = x;
    user.y = y;
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
