import { authDb } from '../_lib/db';
import type { User } from '../../types';

export class AuthError extends Error {
  constructor(message: string, public status: number = 400) {
    super(message);
    this.name = 'AuthError';
  }
}

export const AUTH_COOKIE_NAME = 'plantia-session';
export const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(user: User): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  const session = await authDb.createSession(user.id, expiresAt);
  return session.id;
}

export async function validateSession(sessionId: string): Promise<User | null> {
  if (!sessionId) return null;
  
  const session = await authDb.getSession(sessionId);
  if (!session) return null;
  
  const user = await authDb.getUserById(session.userId);
  return user;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await authDb.deleteSession(sessionId);
}

export function createSessionCookie(sessionId: string): string {
  const expires = new Date(Date.now() + SESSION_DURATION);
  return `${AUTH_COOKIE_NAME}=${sessionId}; HttpOnly; Secure; SameSite=Strict; Path=/; Expires=${expires.toUTCString()}`;
}

export function clearSessionCookie(): string {
  return `${AUTH_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function getSessionFromCookie(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split('=');
    acc[name] = value;
    return acc;
  }, {} as Record<string, string>);
  
  return cookies[AUTH_COOKIE_NAME] || null;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' };
  }
  return { valid: true };
}