#!/usr/bin/env node
/**
 * Pre-dev database connectivity check.
 * Exits with code 1 if PostgreSQL is not reachable on port 6543,
 * so npm run dev fails fast with a clear message instead of ECONNREFUSED.
 */
const net = require('net');

const host = process.env.DB_HOST || '127.0.0.1';
const port = +(process.env.DB_PORT || 6543);

const socket = new net.Socket();
const timeout = 2000;

socket.setTimeout(timeout);

socket.on('connect', () => {
  socket.destroy();
  process.exit(0);
});

socket.on('error', () => {
  console.error('');
  console.error('\x1b[31mDatabase not running!\x1b[0m');
  console.error('');
  console.error('Start PostgreSQL before npm run dev:');
  console.error('  \x1b[33m.\\start-database.ps1\x1b[0m  (Windows PowerShell)');
  console.error('  \x1b[33mdocker-compose up -d postgres_db\x1b[0m');
  console.error('');
  process.exit(1);
});

socket.on('timeout', () => {
  socket.destroy();
  console.error('');
  console.error('\x1b[31mDatabase not running!\x1b[0m');
  console.error('');
  console.error('Start PostgreSQL before npm run dev:');
  console.error('  \x1b[33m.\\start-database.ps1\x1b[0m  (Windows PowerShell)');
  console.error('  \x1b[33mdocker-compose up -d postgres_db\x1b[0m');
  console.error('');
  process.exit(1);
});

socket.connect(port, host);
