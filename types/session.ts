export interface Session {
  id: string;
  ip: string;
  userAgent: string;
  browserFingerprint: string;
  createdAt: string;
  lastActive: string;
  bookmarks: string[];
}

export interface BookmarkData {
  articleId: string;
  bookmarkedAt: string;
  sessionId: string;
}

export interface SessionIdentifier {
  ip: string;
  userAgent: string;
  browserFingerprint: string;
}

export interface LocalStorageBookmarks {
  [articleId: string]: {
    bookmarkedAt: string;
    title: string;
    url: string;
  };
}

export interface RealtimeUpdate {
  type: 'new_articles' | 'article_update' | 'connection_status' | 'articles_cleared';
  data: any;
  timestamp: string;
}

export interface SessionData {
  sessionId: string;
  ipAddress: string;
  createdAt: string;
  lastAccessed: string;
  userId?: string;
  username?: string;
  isAuthenticated?: boolean;
}

export interface UserCredentials {
  username: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface UserSession {
  sessionId: string;
  userId: string;
  username: string;
  createdAt: string;
  lastAccessed: string;
}

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    username: string;
  };
  session?: UserSession;
  error?: string;
} 