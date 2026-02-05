#!/usr/bin/env node
/**
 * Find which table has the given constraint.
 * Usage: node scripts/find-constraint-table.mjs
 */
import pg from 'pg';
const { Client } = pg;

const constraintName = 'PK_39853134b20afe9dfb25de18292';

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 6543),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'vendure',
  });
  await client.connect();
  const res = await client.query(
    `SELECT tc.table_schema, tc.table_name
     FROM information_schema.table_constraints tc
     WHERE tc.constraint_name = $1`,
    [constraintName]
  );
  console.log('Constraint', constraintName, 'belongs to:', res.rows[0] || 'NOT FOUND');
  await client.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
