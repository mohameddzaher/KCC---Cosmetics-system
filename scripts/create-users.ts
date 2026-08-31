/**
 * Create/refresh a fresh set of accounts (one per role) on the kcc-bv.com
 * domain. Safe: upserts by email (never drops or wipes anything). Re-running
 * resets the passwords to the values below.
 *
 *   npx tsx scripts/create-users.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User';

const genReferral = (name: string) => {
  const clean = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() || 'USER';
  const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${clean}${rnd}`;
};

/** One account per role, so every permission set can be checked end to end. */
export const USERS = [
  { name: 'KCC Super Admin',   email: 'superadmin@kcc-bv.com', role: 'SUPER_ADMIN',     password: 'KCC-Super@2026!',     company: 'KCC', jobTitle: 'System owner',        department: 'Management' },
  { name: 'KCC Admin',         email: 'admin@kcc-bv.com',      role: 'ADMIN',           password: 'KCC-Admin@2026!',     company: 'KCC', jobTitle: 'Operations director', department: 'Management' },
  { name: 'KCC Sales',         email: 'sales@kcc-bv.com',      role: 'SALES',           password: 'KCC-Sales@2026!',     company: 'KCC', jobTitle: 'Sales executive',     department: 'Commercial' },
  { name: 'KCC Account Mgr',   email: 'accounts@kcc-bv.com',   role: 'ACCOUNT_MANAGER', password: 'KCC-Account@2026!',   company: 'KCC', jobTitle: 'Account manager',     department: 'Commercial' },
  { name: 'KCC Factory',       email: 'factory@kcc-bv.com',    role: 'FACTORY',         password: 'KCC-Factory@2026!',   company: 'KCC', jobTitle: 'Production lead',     department: 'Manufacturing' },
  { name: 'KCC Dispatch',      email: 'dispatch@kcc-bv.com',   role: 'LOGISTICS',       password: 'KCC-Dispatch@2026!',  company: 'KCC', jobTitle: 'Dispatch supervisor', department: 'Logistics' },
  { name: 'KCC Accountant',    email: 'finance@kcc-bv.com',    role: 'ACCOUNTANT',      password: 'KCC-Finance@2026!',   company: 'KCC', jobTitle: 'Accountant',          department: 'Finance' },
  { name: 'KCC Support',       email: 'support@kcc-bv.com',    role: 'SUPPORT',         password: 'KCC-Support@2026!',   company: 'KCC', jobTitle: 'Support agent',       department: 'Customer care' },
  { name: 'KCC Editor',        email: 'editor@kcc-bv.com',     role: 'CONTENT_EDITOR',  password: 'KCC-Editor@2026!',    company: 'KCC', jobTitle: 'Content editor',      department: 'Marketing' },
  { name: 'KCC Staff',         email: 'staff@kcc-bv.com',      role: 'STAFF',           password: 'KCC-Staff@2026!',     company: 'KCC', jobTitle: 'Staff',               department: 'General' },
  { name: 'Sample Customer',   email: 'customer@kcc-bv.com',   role: 'CUSTOMER',        password: 'KCC-Client@2026!',    company: 'Demo Brand' },
] as Array<{ name: string; email: string; role: string; password: string; company: string; jobTitle?: string; department?: string }>;

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('Connected.\n');

  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 12);
    await User.findOneAndUpdate(
      { email: u.email.toLowerCase() },
      {
        $set: {
          name: u.name,
          email: u.email.toLowerCase(),
          role: u.role,
          password: hash,
          company: u.company,
          jobTitle: u.jobTitle,
          department: u.department,
          isActive: true,
          languagePref: 'en',
        },
        $setOnInsert: { referralCode: genReferral(u.name) },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`  ✓ ${u.role.padEnd(12)} ${u.email}`);
  }

  const counts = await User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  console.log('\nAccounts per role:');
  for (const c of counts) console.log(`  ${String(c._id).padEnd(16)} ${c.n}`);

  console.log('\nDone. Credentials are in CREDENTIALS.local.md (gitignored).');
  await mongoose.disconnect();
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
