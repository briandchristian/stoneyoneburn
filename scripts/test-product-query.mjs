/**
 * Test Product Query via GraphQL API
 * 
 * Tests if the Vendure Admin API returns products correctly
 */

try {
  console.log('🔍 Testing Vendure Admin API product query...\n');

  // First, we need to authenticate
  console.log('1. Attempting to authenticate...');
  const loginResponse = await fetch('http://localhost:3000/admin-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        mutation {
          login(username: "${process.env.SUPERADMIN_USERNAME ?? 'superadmin'}", password: "${process.env.SUPERADMIN_PASSWORD ?? 'changeme'}") {
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
      `
    })
  });

  const loginData = await loginResponse.json();
  console.log('   Login response:', JSON.stringify(loginData, null, 2));

  if (loginData.errors) {
    console.error('❌ Login failed:', loginData.errors);
    process.exit(1);
  }

  // Get cookies from response
  const cookies = loginResponse.headers.get('set-cookie');
  console.log('   ✅ Authentication successful\n');

  // Query products
  console.log('2. Querying products...');
  const productsResponse = await fetch('http://localhost:3000/admin-api', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': cookies || ''
    },
    body: JSON.stringify({
      query: `
        query {
          products(options: { take: 10 }) {
            items {
              id
              name
              enabled
              channels {
                id
                code
              }
            }
            totalItems
          }
        }
      `
    })
  });

  const productsData = await productsResponse.json();
  console.log('   Products response:', JSON.stringify(productsData, null, 2));

  if (productsData.errors) {
    console.error('❌ Products query failed:', productsData.errors);
    process.exit(1);
  }

  if (productsData.data && productsData.data.products) {
    const { items, totalItems } = productsData.data.products;
    console.log(`\n✅ Success! Found ${totalItems} total products`);
    console.log(`   Showing first ${items.length} products:\n`);
    
    items.forEach(product => {
      console.log(`   - ${product.name} (ID: ${product.id}, Enabled: ${product.enabled})`);
      console.log(`     Channels: ${product.channels.map(c => c.code).join(', ')}`);
    });

    if (totalItems > 0 && items.length === 0) {
      console.log('\n⚠️  WARNING: API reports products exist but returned empty list!');
      console.log('   This suggests a filtering or permission issue.');
    } else if (totalItems === 0) {
      console.log('\n⚠️  WARNING: No products returned from API!');
      console.log('   But database shows 55 products - this is a configuration issue.');
    }
  }

} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}