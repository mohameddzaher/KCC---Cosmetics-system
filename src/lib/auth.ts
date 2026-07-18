import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import connectDB from './db';
import User from '@/models/User';

/**
 * Never fall back to a hardcoded secret in production — that would let anyone
 * forge an admin JWT. Missing secret throws at request time (caught by route
 * try/catch → 500) rather than at build time.
 */
function getJwtSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXTAUTH_SECRET is not set — refusing to sign/verify tokens.');
    }
    return new TextEncoder().encode('dev-only-insecure-secret-do-not-use-in-prod');
  }
  return new TextEncoder().encode(secret);
}

export const AUTH_COOKIE_NAME = 'auth-token';
export const AUTH_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'CUSTOMER';
  company?: string;
  languagePref?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(password, hashed);
}

export async function createToken(user: SessionUser): Promise<string> {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${AUTH_MAX_AGE_SECONDS}s`)
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { clockTolerance: 30 });
    return (payload as { user: SessionUser }).user;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(roles?: string[]): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  if (roles && !roles.includes(session.role)) throw new Error('Forbidden');
  return session;
}

export function isAdmin(role: string): boolean {
  return ['SUPER_ADMIN', 'ADMIN'].includes(role);
}

export function isStaff(role: string): boolean {
  return ['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(role);
}

export class AccountDisabledError extends Error {
  constructor() {
    super('Account disabled');
    this.name = 'AccountDisabledError';
  }
}

export async function authenticateUser(email: string, password: string) {
  await connectDB();
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return null;

  const valid = await verifyPassword(password, user.password);
  if (!valid) return null;

  if (user.isActive === false) throw new AccountDisabledError();

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    company: user.company,
    languagePref: user.languagePref,
  } as SessionUser;
}
