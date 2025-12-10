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
 * Generate a random color for a user
 */
function generateColor(): string {
  const colors = [
    '#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#F5FF33',
    '#33FFF5', '#FF8C33', '#8C33FF', '#33FF8C', '#FF3333',
    '#33FFFF', '#FFFF33', '#FF33CC', '#33CCFF', '#CCFF33'
  ];
  return colors[users.size % colors.length];
}
