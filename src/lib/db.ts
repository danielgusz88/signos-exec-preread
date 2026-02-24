/**
 * Lazy Prisma client - uses dynamic import to avoid bundling
 * the Prisma query engine binary into the Netlify server handler.
 * This prevents Lambda crashes on platforms where the binary
 * doesn't match (e.g., macOS build → Linux Lambda).
 */

let _db: any = null;

async function getDb() {
  if (_db) return _db;

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Database operations require a configured PostgreSQL connection. ' +
      'Set DATABASE_URL in your environment variables or Netlify dashboard.'
    );
  }

  // Dynamic import prevents Prisma from being bundled into the server handler
  const { PrismaClient } = await import('@prisma/client');

  const globalForPrisma = globalThis as unknown as { prisma: any };
  if (globalForPrisma.prisma) {
    _db = globalForPrisma.prisma;
    return _db;
  }

  _db = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = _db;
  }

  return _db;
}

export { getDb as db };

/**
 * Helper to get the database client.
 * Use: const db = await getDatabase();
 */
export async function getDatabase() {
  return getDb();
}
