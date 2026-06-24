import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import connectDB from './db';
import User from '@/models/User';

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');
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
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { clockTolerance: 30 });
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
