/**
 * Apply a SQL migration file to Supabase via direct postgres connection.
 * Usage: node scripts/apply-migration.cjs <path-to-sql>
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('Usage: node scripts/apply-migration.cjs <path-to-sql>');
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(sqlFile), 'utf8');

// Supabase provides postgres connection via project ref
// Format: postgres://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
// We can also use the direct connection:
// postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
//
// Since we don't have the direct password here, we'll use the service role key
// with the pg client against the supavisor connection pooler.
// The service role key IS the postgres password when using the Supabase-provided
// connection string format.
//
// Alternative: use supabase management API

const PROJECT_REF = 'gewcyydpgbfutkdcyztr';
const SERVICE_KEY = '';

async function main() {
  // Try Supabase session pooler (port 5432 via pooler)
  const connStr = `postgresql://postgres.${PROJECT_REF}:${SERVICE_KEY}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('Connected to Supabase postgres');
    await client.query(sql);
    console.log('Migration applied successfully!');
  } catch (err) {
    console.error('Error:', err.message);
    // Try alternative region
    const conn2 = `postgresql://postgres.${PROJECT_REF}:${SERVICE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
    const client2 = new Client({ connectionString: conn2, ssl: { rejectUnauthorized: false } });
    try {
      await client2.connect();
      console.log('Connected via us-east-1');
      await client2.query(sql);
      console.log('Migration applied successfully!');
      await client2.end();
      return;
    } catch (err2) {
      console.error('Both regions failed:', err2.message);
    } finally {
      try { await client2.end(); } catch {}
    }
    process.exit(1);
  } finally {
    try { await client.end(); } catch {}
  }
}

main();
