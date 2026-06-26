const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase-schema.sql'), 'utf8');

  // Try non-pooled connection (direct to DB, bypassing PgBouncer)
  const client = new Client({
    host: 'aws-1-us-east-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.xmpmuhznaiqfwjbxdhqq',
    password: 'VlriFZNqFRPXx72f',
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected, running schema...');

  // Run in transaction
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Schema applied successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }

  await client.end();
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
