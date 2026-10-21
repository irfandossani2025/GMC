require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  // Additive only; never reset or push the schema against the live database.
  await db.$executeRawUnsafe('ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS \'SUPER_ADMIN\'');
  console.log('Super Admin role prepared. No users or passwords were changed.');
})().catch(() => { console.error('Super Admin preparation failed. No account was created.'); process.exitCode = 1; }).finally(() => db.$disconnect());
