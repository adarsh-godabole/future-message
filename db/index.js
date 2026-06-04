/*
 * Database – Connection & Initialisation
 *
 * Creates a PostgreSQL connection pool using the DATABASE_URL environment
 * variable. SSL is enforced in production but disabled locally.
 *
 * initDB() is called once at server startup and ensures the required schema
 * exists before any requests are handled:
 *  - users      : registered accounts (UUID PK, unique email, hashed password)
 *  - messages   : scheduled messages with delivery timestamp and status
 *  - An index on messages(deliver_at) filtered to undelivered rows speeds up
 *    the scheduler's polling query.
 *
 * Exports:
 *  - pool    : shared pg Pool instance for use across the application
 *  - initDB  : async function to bootstrap the schema
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        recipient_email VARCHAR(255) NOT NULL,
        recipient_name VARCHAR(100),
        deliver_at TIMESTAMPTZ NOT NULL,
        delivered BOOLEAN DEFAULT FALSE,
        delivered_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_deliver_at
        ON messages(deliver_at)
        WHERE delivered = FALSE;
    `);

    console.log('✅ Database tables ready');
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
