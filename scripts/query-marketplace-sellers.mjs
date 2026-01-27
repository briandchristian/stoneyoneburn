/**
 * Query Marketplace Sellers via Admin API
 *
 * Validates that marketplaceSellers works and checks if any seller data exists.
 * Use this to debug a blank Marketplace Sellers dashboard list.
 *
 * Usage:
 *   node scripts/query-marketplace-sellers.mjs
 *
 * Requires: Vendure server running (npm run dev:server), superadmin credentials.
 * Loads .env via dotenv; defaults match ENV_EXAMPLE (superadmin / superadmin).
 *
 * Access: marketplaceSellers requires (ReadCatalog AND ReadOrder) OR SuperAdmin.
 */

import 'dotenv/config';

const ADMIN_API =
  process.env.VENDURE_ADMIN_API_URL || 'http://localhost:3000/admin-api';
const USER = process.env.SUPERADMIN_USERNAME || 'superadmin';
const PASS = process.env.SUPERADMIN_PASSWORD || 'superadmin';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 6543),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'vendure',
};

async function dbSellerCount() {
  try {
    const pg = await import('pg');
    const client = new pg.default.Client(DB_CONFIG);
    await client.connect();
    const r = await client.query(
      'SELECT COUNT(*)::int AS n FROM marketplace_seller'
    );
    await client.end();
    return r.rows[0]?.n ?? -1;
  } catch (e) {
    return -1;
  }
}

async function adminFetch(body, cookies = '') {
  const res = await fetch(ADMIN_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookies,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  const setCookie = res.headers.get('set-cookie') || '';
  return { json, cookies: setCookie || cookies };
}

async function main() {
  console.log('Query Marketplace Sellers (Admin API)\n');
  console.log('Admin API:', ADMIN_API);
  console.log('');

  const dbCount = await dbSellerCount();
  if (dbCount >= 0) {
    console.log('DB marketplace_seller count:', dbCount);
  } else {
    console.log('(DB check skipped; pg not available or connection failed)');
  }
  console.log('');

  const { json: loginJson, cookies } = await adminFetch({
    query: `mutation { login(username: "${USER}", password: "${PASS}") { ... on CurrentUser { id identifier } ... on ErrorResult { errorCode message } } }`,
  });

  if (loginJson.errors) {
    console.error('Login failed:', loginJson.errors);
    process.exit(1);
  }
  const login = loginJson.data?.login;
  if (login?.errorCode) {
    console.error('Login error:', login.message);
    process.exit(1);
  }
  if (!login?.id) {
    console.error('Unexpected login response:', JSON.stringify(loginJson, null, 2));
    process.exit(1);
  }
  console.log('Authenticated as:', login.identifier);

  const { json: sellersJson } = await adminFetch(
    {
      query: `query MarketplaceSellersList($skip: Int, $take: Int) {
        marketplaceSellers(skip: $skip, take: $take) {
          items {
            id
            shopName
            shopSlug
            verificationStatus
            isActive
            customerId
            createdAt
          }
          totalItems
        }
      }`,
      variables: { skip: 0, take: 25 },
    },
    cookies
  );

  if (sellersJson.errors) {
    console.error('marketplaceSellers query failed:', sellersJson.errors);
    const forbidden = sellersJson.errors.some(
      (e) => e.extensions?.code === 'FORBIDDEN' || /not.*authorized/i.test(e.message || '')
    );
    if (forbidden) {
      console.error(
        '\nTip: marketplaceSellers requires (ReadCatalog AND ReadOrder) OR SuperAdmin.'
      );
      console.error('Restart the server after plugin changes.');
    }
    process.exit(1);
  }

  const list = sellersJson.data?.marketplaceSellers;
  if (!list) {
    console.error('No marketplaceSellers in response:', JSON.stringify(sellersJson, null, 2));
    process.exit(1);
  }

  console.log('Total sellers:', list.totalItems);
  console.log('Items in page:', list.items?.length ?? 0);
  if (list.items?.length) {
    console.log('\nSellers:');
    list.items.forEach((s) => {
      console.log(`  - ${s.shopName} (id: ${s.id}, slug: ${s.shopSlug}, status: ${s.verificationStatus})`);
    });
  } else {
    console.log('\nNo marketplace sellers in database.');
    console.log('Create one via: node scripts/create-test-customer.mjs && node scripts/test-seller-registration.mjs');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
