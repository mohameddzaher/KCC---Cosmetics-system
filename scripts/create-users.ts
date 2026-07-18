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

export const USERS = [
  { name: 'KCC Super Admin', email: 'superadmin@kcc-bv.com', role: 'SUPER_ADMIN', password: 'KCC-Super@2026!', company: 'KCC' },
  { name: 'KCC Admin',        email: 'admin@kcc-bv.com',      role: 'ADMIN',       password: 'KCC-Admin@2026!', company: 'KCC' },
  { name: 'KCC Staff',        email: 'staff@kcc-bv.com',      role: 'STAFF',       password: 'KCC-Staff@2026!', company: 'KCC' },
  { name: 'Sample Customer',  email: 'customer@kcc-bv.com',   role: 'CUSTOMER',    password: 'KCC-Client@2026!', company: 'Demo Brand' },
];

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
          isActive: true,
          languagePref: 'en',
        },
        $setOnInsert: { referralCode: genReferral(u.name) },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`  ✓ ${u.role.padEnd(12)} ${u.email}`);
  }

  console.log('\nDone. Credentials are in CREDENTIALS.local.md (gitignored).');
  await mongoose.disconnect();
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
