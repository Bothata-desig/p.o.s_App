import { User, AuthSession } from '../types';

// Simple password hashing using SHA-256 (client-side)
// In production, use bcrypt on the backend
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify password by comparing hashes
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Generate a secure session token
function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Load users from localStorage
function loadUsers(): User[] {
  const saved = localStorage.getItem('pos_users');
  return saved ? JSON.parse(saved) : [];
}

// Save users to localStorage
function saveUsers(users: User[]): void {
  localStorage.setItem('pos_users', JSON.stringify(users));
}

// Register a new user
export async function registerUser(
  username: string,
  email: string,
  password: string,
  role: 'admin' | 'cashier' | 'manager' = 'cashier'
): Promise<{ success: boolean; message: string; user?: User }> {
  // Validation
  if (!username || username.length < 3) {
    return { success: false, message: 'Username must be at least 3 characters' };
  }
  if (!email || !email.includes('@')) {
    return { success: false, message: 'Invalid email address' };
  }
  if (!password || password.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters' };
  }

  const users = loadUsers();
  
  // Check if user already exists
  if (users.some(u => u.username === username || u.email === email)) {
    return { success: false, message: 'Username or email already exists' };
  }

  const passwordHash = await hashPassword(password);
  const newUser: User = {
    id: `user_${Date.now()}`,
    username,
    email,
    passwordHash,
    role,
    createdAt: Date.now(),
  };

  users.push(newUser);
  saveUsers(users);

  return { success: true, message: 'User registered successfully', user: newUser };
}

// Login user
export async function loginUser(
  username: string,
  password: string
): Promise<{ success: boolean; message: string; session?: AuthSession }> {
  const users = loadUsers();
  const user = users.find(u => u.username === username);

  if (!user) {
    return { success: false, message: 'Invalid username or password' };
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    return { success: false, message: 'Invalid username or password' };
  }

  // Update last login
  user.lastLogin = Date.now();
  saveUsers(users);

  // Create session
  const sessionToken = generateSessionToken();
  const session: AuthSession = {
    userId: user.id,
    username: user.username,
    role: user.role,
    loginTime: Date.now(),
    sessionToken,
  };

  // Store session
  localStorage.setItem('pos_session', JSON.stringify(session));
  
  return { success: true, message: 'Login successful', session };
}

// Logout user
export function logoutUser(): void {
  localStorage.removeItem('pos_session');
}

// Get current session
export function getCurrentSession(): AuthSession | null {
  const saved = localStorage.getItem('pos_session');
  if (!saved) return null;

  const session = JSON.parse(saved) as AuthSession;
  
  // Check if session is still valid (24 hours)
  const sessionAge = Date.now() - session.loginTime;
  if (sessionAge > 24 * 60 * 60 * 1000) {
    logoutUser();
    return null;
  }

  return session;
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return getCurrentSession() !== null;
}

// Create default admin user if none exists
export async function initializeDefaultUsers(): Promise<void> {
  const users = loadUsers();
  if (users.length === 0) {
    await registerUser('admin', 'admin@cloudpos.com', 'admin123', 'admin');
  }
}
