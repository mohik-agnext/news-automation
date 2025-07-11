/**
 * File-based Authentication System
 * Simple username/password authentication with automatic user creation
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { User, UserCredentials, UserSession, AuthResponse } from '@/types/session';

// File paths for storing data
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Directory already exists, ignore
  }
}

// Hash password
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate unique ID
function generateId(): string {
  return crypto.randomUUID();
}

// Load users from file
async function loadUsers(): Promise<User[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Save users to file
async function saveUsers(users: User[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// Load sessions from file
async function loadSessions(): Promise<UserSession[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(SESSIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Save sessions to file
async function saveSessions(sessions: UserSession[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

/**
 * Authenticate user or create new user if credentials don't exist
 */
export async function authenticateUser(credentials: UserCredentials): Promise<AuthResponse> {
  try {
    const users = await loadUsers();
    const passwordHash = hashPassword(credentials.password);
    
    // Find existing user
    let user = users.find(u => u.username === credentials.username);
    
    if (user) {
      // Existing user - check password
      if (user.passwordHash === passwordHash) {
        // Correct password - update last login
        user.lastLoginAt = new Date().toISOString();
        await saveUsers(users);
        
        console.log(`🔐 User logged in: ${credentials.username}`);
        
        return {
          success: true,
          user: {
            id: user.id,
            username: user.username
          }
        };
      } else {
        // Wrong password
        console.log(`❌ Invalid password for user: ${credentials.username}`);
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }
    } else {
      // New user - create automatically
      const newUser: User = {
        id: generateId(),
        username: credentials.username,
        passwordHash,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      
      users.push(newUser);
      await saveUsers(users);
      
      console.log(`✨ New user created: ${credentials.username}`);
      
      return {
        success: true,
        user: {
          id: newUser.id,
          username: newUser.username
        }
      };
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}

/**
 * Create user session
 */
export async function createUserSession(userId: string, username: string): Promise<UserSession> {
  const sessions = await loadSessions();
  
  // Remove any existing sessions for this user
  const filteredSessions = sessions.filter(s => s.userId !== userId);
  
  const newSession: UserSession = {
    sessionId: generateId(),
    userId,
    username,
    createdAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString()
  };
  
  filteredSessions.push(newSession);
  await saveSessions(filteredSessions);
  
  console.log(`📝 Session created for user: ${username}`);
  return newSession;
}

/**
 * Get user session by session ID
 */
export async function getUserSession(sessionId: string): Promise<UserSession | null> {
  try {
    const sessions = await loadSessions();
    const session = sessions.find(s => s.sessionId === sessionId);
    
    if (session) {
      // Update last accessed
      session.lastAccessed = new Date().toISOString();
      await saveSessions(sessions);
      return session;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Validate session and return user info
 */
export async function validateSession(sessionId: string): Promise<{ valid: boolean; user?: { id: string; username: string } }> {
  const session = await getUserSession(sessionId);
  
  if (session) {
    return {
      valid: true,
      user: {
        id: session.userId,
        username: session.username
      }
    };
  }
  
  return { valid: false };
}

/**
 * Logout user (remove session)
 */
export async function logoutUser(sessionId: string): Promise<void> {
  try {
    const sessions = await loadSessions();
    const filteredSessions = sessions.filter(s => s.sessionId !== sessionId);
    await saveSessions(filteredSessions);
    console.log(`🚪 User logged out, session removed: ${sessionId}`);
  } catch (error) {
    console.error('Error logging out user:', error);
  }
}

/**
 * Get all users (for admin purposes)
 */
export async function getAllUsers(): Promise<Omit<User, 'passwordHash'>[]> {
  const users = await loadUsers();
  return users.map(({ passwordHash, ...user }) => user);
} 