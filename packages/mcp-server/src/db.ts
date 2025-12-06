import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      // For local development with in-memory fallback
      console.error('Warning: DATABASE_URL not set. Using in-memory storage.');
      throw new Error('DATABASE_URL environment variable is required for database operations');
    }

    pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  return pool;
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows;
}

export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return await pool.connect();
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Helper to check if database is available
export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database not available:', error);
    return false;
  }
}
