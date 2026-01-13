/**
 * Test Seller Registration Script
 * 
 * This script helps you test the seller registration mutation
 * by providing an interactive way to register as a seller.
 * 
 * Usage:
 *   node scripts/test-seller-registration.mjs
 */

// Use native fetch (Node 18+)
// If you're using an older Node version, install node-fetch: npm install node-fetch
const fetch = globalThis.fetch || (await import('node-fetch')).default;

const SHOP_API_URL = process.env.VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';

// Colors for terminal output
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

async function makeGraphQLRequest(query, variables = {}, cookies = '') {
  try {
    const response = await fetch(SHOP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    const data = await response.json();
    const setCookie = response.headers.get('set-cookie');
    
    return { data, cookies: setCookie || cookies };
  } catch (error) {
    throw new Error(`GraphQL request failed: ${error.message}`);
  }
}

async function testServerConnection() {
  log('\n🔍 Testing server connection...', 'cyan');
  
  try {
    const result = await makeGraphQLRequest(`
      query {
        __typename
      }
    `);
    
    if (result.data.data && result.data.data.__typename) {
      log(`✅ Server is responding! Type: ${result.data.data.__typename}`, 'green');
      return true;
    } else if (result.data.errors) {
      log(`❌ Server error: ${JSON.stringify(result.data.errors)}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Connection failed: ${error.message}`, 'red');
    log(`   Make sure the Vendure server is running at ${SHOP_API_URL}`, 'yellow');
    return false;
  }
}

async function loginCustomer(email, password) {
  log('\n🔐 Logging in as customer...', 'cyan');
  
  const query = `
    mutation Login($username: String!, $password: String!) {
      login(username: $username, password: $password) {
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
  
  const result = await makeGraphQLRequest(query, {
    username: email,
    password: password,
  });
  
  if (result.data.errors) {
    log(`❌ Login failed: ${result.data.errors.map(e => e.message).join(', ')}`, 'red');
    return null;
  }
  
  const loginResult = result.data.data.login;
  
  if (loginResult.errorCode) {
    log(`❌ Login error: ${loginResult.message} (${loginResult.errorCode})`, 'red');
    return null;
  }
  
  if (loginResult.id) {
    log(`✅ Logged in as: ${loginResult.identifier} (ID: ${loginResult.id})`, 'green');
    return result.cookies;
  }
  
  return null;
}

async function registerAsSeller(shopName, shopDescription, businessName, cookies) {
  log('\n🏪 Registering as seller...', 'cyan');
  
  const mutation = `
    mutation RegisterAsSeller($input: RegisterSellerInput!) {
      registerAsSeller(input: $input) {
        id
        shopName
        shopDescription
        shopSlug
        verificationStatus
        isActive
        createdAt
        customer {
          id
          emailAddress
        }
      }
    }
  `;
  
  const variables = {
    input: {
      shopName,
      shopDescription: shopDescription || null,
      businessName: businessName || null,
    },
  };
  
  const result = await makeGraphQLRequest(mutation, variables, cookies);
  
  if (result.data.errors) {
    log(`❌ Registration failed:`, 'red');
    result.data.errors.forEach(error => {
      log(`   ${error.message}`, 'red');
    });
    return null;
  }
  
  const seller = result.data.data.registerAsSeller;
  
  if (seller) {
    log(`✅ Successfully registered as seller!`, 'green');
    log(`   ID: ${seller.id}`, 'bright');
    log(`   Shop Name: ${seller.shopName}`, 'bright');
    log(`   Shop Slug: ${seller.shopSlug}`, 'bright');
    log(`   Verification Status: ${seller.verificationStatus}`, 'bright');
    log(`   Active: ${seller.isActive}`, 'bright');
    return seller;
  }
  
  return null;
}

async function getActiveSeller(cookies) {
  log('\n🔍 Checking for active seller account...', 'cyan');
  
  const query = `
    query {
      activeSeller {
        id
        shopName
        shopSlug
        verificationStatus
        isActive
      }
    }
  `;
  
  const result = await makeGraphQLRequest(query, {}, cookies);
  
  if (result.data.errors) {
    log(`❌ Query failed: ${result.data.errors.map(e => e.message).join(', ')}`, 'red');
    return null;
  }
  
  if (result.data.data.activeSeller) {
    const seller = result.data.data.activeSeller;
    log(`✅ Found active seller account:`, 'green');
    log(`   Shop Name: ${seller.shopName}`, 'bright');
    log(`   Shop Slug: ${seller.shopSlug}`, 'bright');
    log(`   Verification Status: ${seller.verificationStatus}`, 'bright');
    return seller;
  } else {
    log(`ℹ️  No active seller account found.`, 'yellow');
    return null;
  }
}

// Main execution
async function main() {
  log('\n' + '='.repeat(60), 'cyan');
  log('  Seller Registration Test Script', 'bright');
  log('='.repeat(60), 'cyan');
  
  // Test server connection
  const serverConnected = await testServerConnection();
  if (!serverConnected) {
    log('\n❌ Cannot proceed without server connection.', 'red');
    process.exit(1);
  }
  
  // Check if already a seller
  const existingSeller = await getActiveSeller('');
  if (existingSeller) {
    log('\n⚠️  You already have a seller account!', 'yellow');
    log('   Use the Vendure admin dashboard or database to remove it if you want to test registration again.', 'yellow');
    process.exit(0);
  }
  
  // Get credentials from command line or use defaults
  const args = process.argv.slice(2);
  const email = args[0] || process.env.TEST_CUSTOMER_EMAIL || 'customer@example.com';
  const password = args[1] || process.env.TEST_CUSTOMER_PASSWORD || 'password';
  const shopName = args[2] || 'Test Shop ' + Date.now();
  const shopDescription = args[3] || 'This is a test shop created by the test script';
  const businessName = args[4] || null;
  
  log(`\n📝 Using credentials:`, 'cyan');
  log(`   Email: ${email}`, 'bright');
  log(`   Shop Name: ${shopName}`, 'bright');
  log(`\n💡 Tip: You can customize these with command line arguments:`, 'yellow');
  log(`   node scripts/test-seller-registration.mjs <email> <password> <shopName> <description> <businessName>`, 'yellow');
  
  // Login
  const cookies = await loginCustomer(email, password);
  if (!cookies) {
    log('\n❌ Cannot proceed without authentication.', 'red');
    log('   Make sure you have a customer account and correct credentials.', 'yellow');
    process.exit(1);
  }
  
  // Register as seller
  const seller = await registerAsSeller(shopName, shopDescription, businessName, cookies);
  
  if (seller) {
    log('\n' + '='.repeat(60), 'green');
    log('  ✅ Seller Registration Successful!', 'bright');
    log('='.repeat(60), 'green');
    log('\nNext steps:', 'cyan');
    log('1. Check the seller in the Vendure admin dashboard', 'bright');
    log('2. Test the activeSeller query in GraphiQL', 'bright');
    log('3. Test updating the seller profile', 'bright');
  } else {
    log('\n' + '='.repeat(60), 'red');
    log('  ❌ Seller Registration Failed', 'bright');
    log('='.repeat(60), 'red');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ Unexpected error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});