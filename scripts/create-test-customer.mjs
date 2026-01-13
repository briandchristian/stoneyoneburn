/**
 * Create Test Customer Script
 * 
 * This script helps you create a test customer account
 * so you can then test seller registration.
 * 
 * Usage:
 *   node scripts/create-test-customer.mjs
 *   node scripts/create-test-customer.mjs customer@test.com password123 "John" "Doe"
 */

const fetch = globalThis.fetch || (await import('node-fetch')).default;

const SHOP_API_URL = process.env.VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeGraphQLRequest(query, variables = {}) {
  const response = await fetch(SHOP_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  return await response.json();
}

async function registerCustomer(email, password, firstName, lastName) {
  log('\n📝 Registering customer account...', 'cyan');
  
  const mutation = `
    mutation RegisterCustomer($input: RegisterCustomerInput!) {
      registerCustomerAccount(input: $input) {
        __typename
        ... on Success {
          success
        }
        ... on ErrorResult {
          errorCode
          message
        }
      }
    }
  `;
  
  const result = await makeGraphQLRequest(mutation, {
    input: {
      emailAddress: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
    },
  });
  
  if (result.errors) {
    log(`❌ Registration failed: ${result.errors.map(e => e.message).join(', ')}`, 'red');
    return false;
  }
  
  const registerResult = result.data.registerCustomerAccount;
  
  if (registerResult.errorCode) {
    log(`❌ Registration error: ${registerResult.message} (${registerResult.errorCode})`, 'red');
    return false;
  }
  
  if (registerResult.success) {
    log(`✅ Customer account created successfully!`, 'green');
    log(`   Email: ${email}`, 'bright');
    log(`   Password: ${password}`, 'bright');
    log(`\n⚠️  Note: Email verification may be required.`, 'yellow');
    log(`   Check: static/email/test-emails/ for verification emails`, 'yellow');
    return true;
  }
  
  return false;
}

async function verifyEmail(email) {
  log('\n📧 Checking for email verification token...', 'cyan');
  
  // In dev mode, emails are saved to static/email/test-emails/
  // We can't automatically verify, but we can give instructions
  log(`   Email verification may be required.`, 'yellow');
  log(`   Check the file: static/email/test-emails/`, 'yellow');
  log(`   Look for a file containing "${email}"`, 'yellow');
  log(`   The verification URL is in the file.`, 'yellow');
}

async function main() {
  log('\n' + '='.repeat(60), 'cyan');
  log('  Create Test Customer Account', 'bright');
  log('='.repeat(60), 'cyan');
  
  // Get arguments or use defaults
  const args = process.argv.slice(2);
  const email = args[0] || `test-${Date.now()}@example.com`;
  const password = args[1] || 'password123';
  const firstName = args[2] || 'Test';
  const lastName = args[3] || 'Customer';
  
  log(`\n📝 Creating customer with:`, 'cyan');
  log(`   Email: ${email}`, 'bright');
  log(`   Password: ${password}`, 'bright');
  log(`   Name: ${firstName} ${lastName}`, 'bright');
  log(`\n💡 Tip: Customize with:`, 'yellow');
  log(`   node scripts/create-test-customer.mjs <email> <password> <firstName> <lastName>`, 'yellow');
  
  const success = await registerCustomer(email, password, firstName, lastName);
  
  if (success) {
    await verifyEmail(email);
    log('\n' + '='.repeat(60), 'green');
    log('  ✅ Customer Account Created!', 'bright');
    log('='.repeat(60), 'green');
    log('\nNext steps:', 'cyan');
    log(`1. If email verification is required, verify your email`, 'bright');
    log(`2. Test seller registration with:`, 'bright');
    log(`   node scripts/test-seller-registration.mjs ${email} ${password}`, 'bright');
  } else {
    log('\n' + '='.repeat(60), 'red');
    log('  ❌ Customer Registration Failed', 'bright');
    log('='.repeat(60), 'red');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});