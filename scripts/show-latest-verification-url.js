#!/usr/bin/env node

/**
 * Helper script to extract the latest verification URL from test emails
 * Usage: node scripts/show-latest-verification-url.js
 */

const fs = require('fs');
const path = require('path');

const testEmailsDir = path.join(__dirname, '../static/email/test-emails');

if (!fs.existsSync(testEmailsDir)) {
  console.error('❌ Test emails directory not found:', testEmailsDir);
  process.exit(1);
}

// Get all JSON files in the test-emails directory
const files = fs.readdirSync(testEmailsDir)
  .filter(file => file.endsWith('.json'))
  .map(file => ({
    name: file,
    path: path.join(testEmailsDir, file),
    stat: fs.statSync(path.join(testEmailsDir, file))
  }))
  .sort((a, b) => b.stat.mtime - a.stat.mtime); // Sort by modification time (newest first)

if (files.length === 0) {
  console.log('📭 No test emails found in', testEmailsDir);
  process.exit(0);
}

// Find the latest verification email
let verificationEmail = null;
for (const file of files) {
  try {
    const content = JSON.parse(fs.readFileSync(file.path, 'utf8'));
    if (content.subject && content.subject.toLowerCase().includes('verify')) {
      verificationEmail = { file, content };
      break;
    }
  } catch (err) {
    console.warn(`⚠️  Error reading ${file.name}:`, err.message);
  }
}

if (!verificationEmail) {
  console.log('📭 No verification emails found');
  process.exit(0);
}

const { file, content } = verificationEmail;

// Extract token from the email body
const tokenMatch = content.body.match(/verify\?token=([^"&]+)/);
if (!tokenMatch) {
  console.log('❌ Could not extract token from email');
  console.log('Email file:', file.name);
  process.exit(1);
}

const token = tokenMatch[1];
const storefrontUrl = 'http://localhost:3001'; // Storefront URL

console.log('\n📧 Latest Verification Email:');
console.log('═══════════════════════════════════════════════════');
console.log(`To: ${content.recipient}`);
console.log(`Subject: ${content.subject}`);
console.log(`Date: ${content.date}`);
console.log('\n🔗 Verification URL:');
console.log('═══════════════════════════════════════════════════');
console.log(`${storefrontUrl}/verify?token=${token}`);
console.log('\n💡 Tip: Copy the URL above and paste it in your browser to verify the email address.\n');
