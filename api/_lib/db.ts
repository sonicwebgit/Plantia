import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import type { User, Session, UserKey } from '../../types';

// Create per-request database connections for serverless environment
export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  // Create a new pool for each request to avoid serverless connection issues
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });
  
  const client = await pool.connect();
  try {
    const res = await client.query<T>(text, params);
    return { rows: res.rows as T[] };
  } finally {
    client.release();
    await pool.end();
  }
}

// Authentication Functions
export const authDb = {
  // User Functions
  async createUser(email: string, name?: string, image?: string): Promise<User> {
    const id = uuidv4();
    const { rows } = await query<User>(
      'INSERT INTO users (id, email, name, image) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, email, name, image]
    );
    return rows[0];
  },

  async getUserById(id: string): Promise<User | null> {
    const { rows } = await query<User>('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async getUserByEmail(email: string): Promise<User | null> {
    const { rows } = await query<User>('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] || null;
  },

  async updateUser(id: string, updates: Partial<Pick<User, 'name' | 'image'>>): Promise<User | null> {
    const setParts = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setParts.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.image !== undefined) {
      setParts.push(`image = $${paramIndex++}`);
      values.push(updates.image);
    }

    if (setParts.length === 0) return null;

    values.push(id);
    const { rows } = await query<User>(
      `UPDATE users SET ${setParts.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  // Session Functions
  async createSession(userId: string, expiresAt: Date): Promise<Session> {
    const id = uuidv4();
    const { rows } = await query<Session>(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3) RETURNING *',
      [id, userId, expiresAt.toISOString()]
    );
    return rows[0];
  },

  async getSession(sessionId: string): Promise<Session | null> {
    const { rows } = await query<Session>(
      'SELECT * FROM sessions WHERE id = $1 AND expires_at > NOW()',
      [sessionId]
    );
    return rows[0] || null;
  },

  async deleteSession(sessionId: string): Promise<void> {
    await query('DELETE FROM sessions WHERE id = $1', [sessionId]);
  },

  async deleteUserSessions(userId: string): Promise<void> {
    await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  },

  // User Key Functions (for password auth and OAuth)
  async createUserKey(userId: string, providerId: string, providerUserId: string, hashedPassword?: string): Promise<UserKey> {
    const id = uuidv4();
    const { rows } = await query<UserKey>(
      'INSERT INTO user_keys (id, user_id, hashed_password, provider_id, provider_user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, userId, hashedPassword, providerId, providerUserId]
    );
    return rows[0];
  },

  async getUserKey(providerId: string, providerUserId: string): Promise<UserKey | null> {
    const { rows } = await query<UserKey>(
      'SELECT * FROM user_keys WHERE provider_id = $1 AND provider_user_id = $2',
      [providerId, providerUserId]
    );
    return rows[0] || null;
  },

  async updateUserKeyPassword(userId: string, providerId: string, hashedPassword: string): Promise<void> {
    await query(
      'UPDATE user_keys SET hashed_password = $1 WHERE user_id = $2 AND provider_id = $3',
      [hashedPassword, userId, providerId]
    );
  },

  // Helper Functions
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  },

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  },

  // Authentication Methods
  async createEmailUser(email: string, password: string, name: string): Promise<{ user: User; userKey: UserKey }> {
    const user = await this.createUser(email, name);
    const hashedPassword = await this.hashPassword(password);
    const userKey = await this.createUserKey(user.id, 'email', email, hashedPassword);
    return { user, userKey };
  },

  async authenticateEmailUser(email: string, password: string): Promise<User | null> {
    const userKey = await this.getUserKey('email', email);
    if (!userKey || !userKey.hashedPassword) return null;
    
    const isValidPassword = await this.verifyPassword(password, userKey.hashedPassword);
    if (!isValidPassword) return null;
    
    return this.getUserById(userKey.userId);
  },

  async createOrUpdateGoogleUser(googleId: string, email: string, name?: string, image?: string): Promise<User> {
    // Check if user already exists with this Google ID
    const existingUserKey = await this.getUserKey('google', googleId);
    if (existingUserKey) {
      const user = await this.getUserById(existingUserKey.userId);
      if (user) {
        // Update user info if provided
        if (name || image) {
          const updates: any = {};
          if (name && name !== user.name) updates.name = name;
          if (image && image !== user.image) updates.image = image;
          if (Object.keys(updates).length > 0) {
            return (await this.updateUser(user.id, updates)) || user;
          }
        }
        return user;
      }
    }
    
    // Check if user exists with this email (from password auth)
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      // Link Google account to existing user
      await this.createUserKey(existingUser.id, 'google', googleId);
      return existingUser;
    }
    
    // Create new user
    const user = await this.createUser(email, name, image);
    await this.createUserKey(user.id, 'google', googleId);
    return user;
  }
};
