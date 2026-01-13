/**
 * Verify Customer Email Script
 * 
 * This script finds and uses the verification token from test emails
 * to verify a customer's email address.
 * 
 * Usage:
 *   node scripts/verify-customer-email.mjs test@example.com
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const fetch = globalThis.fetch || (await import('node-fetch')).default;

const SHOP_API_URL = process.env.VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';
const TEST_EMAILS_DIR = 'static/email/test-emails';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function findVerificationToken(email) {
  log(`\n📧 Looking for verification email for: ${email}`, 'cyan');
  
  try {
    const files = await readdir(TEST_EMAILS_DIR);
    
    // Try to find by email in filename first
    let emailFiles = files.filter(f => f.toLowerCase().includes(email.toLowerCase().replace('@', '_')));
    
    // If not found, search in file contents
    if (emailFiles.length === 0) {
      log(`   Searching in email contents...`, 'yellow');
      for (const file of files) {
        try {
          const filePath = join(TEST_EMAILS_DIR, file);
          const content = await readFile(filePath, 'utf-8');
          const emailData = JSON.parse(content);
          
          // Check if this email matches
          const recipient = emailData.recipient || emailData.to || '';
          if (recipient.toLowerCase() === email.toLowerCase()) {
            emailFiles.push(file);
          }
        } catch (err) {
          // Skip files that can't be read or parsed
        }
      }
    }
    
    if (emailFiles.length === 0) {
      log(`❌ No verification email found for ${email}`, 'red');
      log(`   Available files: ${files.slice(0, 3).join(', ')}${files.length > 3 ? '...' : ''}`, 'yellow');
      return null;
    }
    
    // Get the most recent email by checking file stats
    let latestFile = emailFiles[0];
    let latestTime = 0;
    
    for (const file of emailFiles) {
      try {
        const filePath = join(TEST_EMAILS_DIR, file);
        const stats = await import('fs').then(m => m.promises.stat(filePath));
        if (stats.mtimeMs > latestTime) {
          latestTime = stats.mtimeMs;
          latestFile = file;
        }
      } catch (err) {
        // Skip files we can't stat
      }
    }
    
    const filePath = join(TEST_EMAILS_DIR, latestFile);
    const content = await readFile(filePath, 'utf-8');
    const emailData = JSON.parse(content);
    
    // Extract token from the verification URL in the HTML body
    // Vendure verification URLs typically look like: http://localhost:3001/verify?token=...
    const html = emailData.body || emailData.html || emailData.text || '';
    const tokenMatch = html.match(/token=([a-zA-Z0-9_-]+)/);
    
    if (tokenMatch && tokenMatch[1]) {
      log(`✅ Found verification token in: ${latestFile}`, 'green');
      return tokenMatch[1];
    }
    
    // Try to extract from the URL if it's in the email data
    if (emailData.url && emailData.url.includes('token=')) {
      const urlMatch = emailData.url.match(/token=([a-zA-Z0-9_-]+)/);
      if (urlMatch && urlMatch[1]) {
        log(`✅ Found verification token from URL`, 'green');
        return urlMatch[1];
      }
    }
    
    log(`❌ Could not extract verification token from email`, 'red');
    log(`   Email file: ${latestFile}`, 'yellow');
    log(`   Check the file manually: ${filePath}`, 'yellow');
    return null;
  } catch (error) {
    log(`❌ Error reading verification email: ${error.message}`, 'red');
    return null;
  }
}

async function verifyEmail(token) {
  log(`\n✅ Verifying email with token...`, 'cyan');
  
  const mutation = `
    mutation VerifyEmail($token: String!) {
      verifyCustomerAccount(token: $token) {
        ... on CurrentUser {
          id
          identifier
        }
        ... on ErrorResult {
          errorCode
          message
        }
      }
    }
  `;
  
  try {
    const response = await fetch(SHOP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: mutation,
        variables: { token },
      }),
    });
    
    const result = await response.json();
    
    if (result.errors) {
      log(`❌ Verification failed: ${result.errors.map(e => e.message).join(', ')}`, 'red');
      return false;
    }
    
    const verifyResult = result.data.verifyCustomerAccount;
    
    if (verifyResult.errorCode) {
      log(`❌ Verification error: ${verifyResult.message} (${verifyResult.errorCode})`, 'red');
      return false;
    }
    
    if (verifyResult.id) {
      log(`✅ Email verified successfully!`, 'green');
      log(`   User: ${verifyResult.identifier} (ID: ${verifyResult.id})`, 'bright');
      return true;
    }
    
    return false;
  } catch (error) {
    log(`❌ Verification request failed: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('\n' + '='.repeat(60), 'cyan');
  log('  Verify Customer Email', 'bright');
  log('='.repeat(60), 'cyan');
  
  const email = process.argv[2];
  
  if (!email) {
    log('\n❌ Please provide an email address', 'red');
    log('   Usage: node scripts/verify-customer-email.mjs <email>', 'yellow');
    process.exit(1);
  }
  
  const token = await findVerificationToken(email);
  
  if (!token) {
    log('\n💡 Tip: You can also manually verify by:', 'yellow');
    log('   1. Check the email file in: static/email/test-emails/', 'bright');
    log('   2. Extract the token from the verification URL', 'bright');
    log('   3. Use the verifyCustomerAccount mutation in GraphQL', 'bright');
    process.exit(1);
  }
  
  const success = await verifyEmail(token);
  
  if (success) {
    log('\n' + '='.repeat(60), 'green');
    log('  ✅ Email Verified!', 'bright');
    log('='.repeat(60), 'green');
    log('\nNext step:', 'cyan');
    log(`   Test seller registration:`, 'bright');
    log(`   node scripts/test-seller-registration.mjs ${email} <password>`, 'bright');
  } else {
    log('\n' + '='.repeat(60), 'red');
    log('  ❌ Email Verification Failed', 'bright');
    log('='.repeat(60), 'red');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});