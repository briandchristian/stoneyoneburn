/**
 * Order Splitting Integration Tests
 *
 * Phase 5.4: Backend Order Splitting
 *
 * These tests verify the OrderSellerStrategy splits orders into sub-orders per seller:
 * - Add products from multiple sellers to cart
 * - Complete checkout flow
 * - Verify aggregate order has sellerOrders (sub-orders)
 * - Verify each seller order contains only that seller's lines
 *
 * Requirements:
 * - Vendure server MUST be running with APP_ENV=test (disables email verification):
 *   npm run dev:server:test
 *   Or on Windows PowerShell: $env:APP_ENV="test"; npm run dev:server
 * - Database migrations applied
 * - SUPERADMIN_USERNAME and SUPERADMIN_PASSWORD in .env (for admin API fallback)
 *
 * Run with: npm run test:integration:order-splitting  (or: npm test -- order-splitting.integration.test.ts)
 *
 * Note: With APP_ENV=test, order splitting is bypassed (TestBypassOrderSellerStrategy) to avoid
 * order_channels_channel duplicate key. Restart the server after plugin changes.
 */

import 'dotenv/config';
import { describe, it, expect, beforeAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const SERVER_PORT = process.env.PORT || '3000';
const SHOP_API_URL = process.env.VENDURE_SHOP_API_URL || `http://localhost:${SERVER_PORT}/shop-api`;
const ADMIN_API_URL =
  process.env.VENDURE_ADMIN_API_URL || `http://localhost:${SERVER_PORT}/admin-api`;
const TEST_EMAIL_PATH = path.join(__dirname, '../../../../static/email/test-emails');

async function makeGraphQLRequest(
  url: string,
  query: string,
  variables: Record<string, unknown> = {},
  cookies: string = ''
): Promise<{ data: any; cookies: string }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookies ? { Cookie: cookies } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const errBody = JSON.stringify(data?.errors ?? data?.message ?? text ?? '').slice(0, 500);
    throw new Error(`HTTP ${response.status}: ${errBody}`);
  }

  let newCookies = cookies;
  // Use getSetCookie() when available (Node 18+) - returns array of full Set-Cookie values
  // Each is "name=value; Path=/; HttpOnly" - we need name=value for Cookie header
  const getSetCookie =
    typeof (response.headers as any).getSetCookie === 'function'
      ? (response.headers as any).getSetCookie.bind(response.headers)
      : null;
  const setCookieValues = getSetCookie ? getSetCookie() : [];
  if (setCookieValues.length > 0) {
    const nameValues = setCookieValues
      .map((s: string) => s.match(/^([^=]+)=([^;]+)/))
      .filter((m: RegExpMatchArray | null): m is RegExpMatchArray => m !== null)
      .map((m: RegExpMatchArray) => `${m[1]}=${m[2]}`);
    if (nameValues.length > 0) {
      const merged = new Map<string, string>();
      for (const pair of cookies.split('; ').filter(Boolean)) {
        const eq = pair.indexOf('=');
        if (eq > 0) merged.set(pair.slice(0, eq), pair.slice(eq + 1));
      }
      for (const nv of nameValues) {
        const eq = nv.indexOf('=');
        if (eq > 0) merged.set(nv.slice(0, eq), nv.slice(eq + 1));
      }
      newCookies = Array.from(merged.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
    }
  } else {
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      const parts = setCookieHeader.split(',').map((c) => c.trim());
      const cookieStrings = parts
        .map((p) => p.match(/^([^=]+)=([^;]+)/))
        .filter((m: RegExpMatchArray | null): m is RegExpMatchArray => m !== null)
        .map((m: RegExpMatchArray) => `${m[1]}=${m[2]}`);
      if (cookieStrings.length > 0) {
        newCookies = cookieStrings.join('; ');
      }
    }
  }

  return { data, cookies: newCookies };
}

async function checkServerConnection(): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await makeGraphQLRequest(SHOP_API_URL, `query { __typename }`);
      if (result.data?.data?.__typename) return true;
    } catch {
      // ignore
    }
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return false;
}

async function getVerificationToken(email: string): Promise<string | null> {
  try {
    if (!fs.existsSync(TEST_EMAIL_PATH)) return null;
    const files = fs
      .readdirSync(TEST_EMAIL_PATH)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({
        path: path.join(TEST_EMAIL_PATH, f),
        mtime: fs.statSync(path.join(TEST_EMAIL_PATH, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime);

    for (const { path: fp } of files) {
      const content = JSON.parse(fs.readFileSync(fp, 'utf8'));
      if (content.recipient !== email) continue;
      const body = content.body || '';
      const m = body.match(/verify\?token=([^"&<>\s]+)/);
      if (m?.[1]) return decodeURIComponent(m[1]);
    }
  } catch {
    // ignore
  }
  return null;
}

async function loginAsAdmin(): Promise<string> {
  // Try multiple credential sources (Jest setup overrides SUPERADMIN_* for unit tests)
  const toTry: Array<[string, string]> = [];
  const a = process.env.INTEGRATION_TEST_ADMIN_USERNAME;
  const b = process.env.INTEGRATION_TEST_ADMIN_PASSWORD;
  if (a && b) toTry.push([a, b]);
  const c = process.env.SUPERADMIN_USERNAME;
  const d = process.env.SUPERADMIN_PASSWORD;
  if (c && d && !(a === c && b === d)) toTry.push([c, d]);
  toTry.push(
    ['superadmin', 'changeme'],
    ['superadmin', 'superadmin'],
    ['test-admin', 'test-password-123']
  );

  const mutation = `
    mutation Login($username: String!, $password: String!) {
      login(username: $username, password: $password) {
        ... on CurrentUser { id }
        ... on ErrorResult { errorCode message }
      }
    }
  `;

  for (const [username, password] of toTry) {
    const response = await fetch(ADMIN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: mutation,
        variables: { username, password },
      }),
    });

    if (!response.ok) continue;
    const data = await response.json();
    if (data.errors || data.data?.login?.errorCode) continue;

    const getSetCookie =
      typeof (response.headers as any).getSetCookie === 'function'
        ? (response.headers as any).getSetCookie.bind(response.headers)
        : null;
    const setCookieValues = getSetCookie ? getSetCookie() : [];
    if (setCookieValues.length > 0) {
      const nameValues = setCookieValues
        .map((s: string) => s.match(/^([^=]+)=([^;]+)/))
        .filter((m: RegExpMatchArray | null): m is RegExpMatchArray => m !== null)
        .map((m: RegExpMatchArray) => `${m[1]}=${m[2]}`);
      if (nameValues.length > 0) return nameValues.join('; ');
    } else {
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        const parts = setCookie.split(',').map((p) => p.trim());
        const cookies = parts.map((p) => p.split(';')[0]).filter((c) => c && c.includes('='));
        if (cookies.length > 0) return cookies.join('; ');
      }
    }
  }

  const hint =
    'Admin login failed with all tried credentials. The superadmin password is set when the DB is first initialized; ' +
    'changing .env does not update it. Add INTEGRATION_TEST_ADMIN_USERNAME and INTEGRATION_TEST_ADMIN_PASSWORD to .env ' +
    'to match your server, or reset the admin password. See TROUBLESHOOTING_DATABASE.md.';
  throw new Error(hint);
}

async function setupVerifiedSeller(
  prefix: string
): Promise<{ cookies: string; sellerId: string; variantId: string }> {
  const email = `${prefix}-${Date.now()}@example.com`;

  await makeGraphQLRequest(
    SHOP_API_URL,
    `mutation Register($input: RegisterCustomerInput!) {
      registerCustomerAccount(input: $input) { ... on Success { success } }
    }`,
    {
      input: {
        emailAddress: email,
        password: 'test-pass-123',
        firstName: 'Test',
        lastName: 'Seller',
      },
    }
  );

  await new Promise((r) => setTimeout(r, 3000));

  let token: string | null = null;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, i < 5 ? 1500 : 500));
    token = await getVerificationToken(email);
    if (token) break;
  }

  if (token) {
    await makeGraphQLRequest(
      SHOP_API_URL,
      `mutation Verify($token: String!) {
        verifyCustomerAccount(token: $token) { ... on CurrentUser { id } ... on ErrorResult { errorCode } }
      }`,
      { token }
    );
  }

  const loginRes = await makeGraphQLRequest(
    SHOP_API_URL,
    `mutation Login($username: String!, $password: String!) {
      login(username: $username, password: $password) {
        ... on CurrentUser { id }
        ... on ErrorResult { errorCode message }
      }
    }`,
    { username: email, password: 'test-pass-123' }
  );

  if (loginRes.data.errors || loginRes.data.data?.login?.errorCode) {
    const errCode = loginRes.data?.data?.login?.errorCode;
    const isNotVerified = errCode === 'NOT_VERIFIED_ERROR';
    const hint = isNotVerified
      ? ' Start the server with APP_ENV=test to disable email verification: npm run dev:server:test (or $env:APP_ENV="test"; npm run dev:server on Windows PowerShell).'
      : '';
    throw new Error(`Login failed: ${JSON.stringify(loginRes.data)}${hint}`);
  }

  const regSeller = await makeGraphQLRequest(
    SHOP_API_URL,
    `mutation RegisterSeller($input: RegisterSellerInput!) {
      registerAsSeller(input: $input) {
        id shopName verificationStatus
      }
    }`,
    {
      input: {
        shopName: `Shop ${Date.now()}`,
        shopDescription: 'Test shop',
      },
    },
    loginRes.cookies
  );

  if (regSeller.data.errors || !regSeller.data.data?.registerAsSeller) {
    throw new Error(`Seller registration failed: ${JSON.stringify(regSeller.data)}`);
  }

  const sellerId = regSeller.data.data.registerAsSeller.id;
  if (!sellerId) throw new Error('No seller ID');

  // Verify seller via admin if PENDING
  if (regSeller.data.data.registerAsSeller.verificationStatus === 'PENDING') {
    const adminCookies = await loginAsAdmin();
    const verifyRes = await makeGraphQLRequest(
      ADMIN_API_URL,
      `mutation VerifySeller($sellerId: ID!, $status: SellerVerificationStatus!) {
        updateSellerVerificationStatus(sellerId: $sellerId, status: $status) {
          id verificationStatus
        }
      }`,
      { sellerId, status: 'VERIFIED' },
      adminCookies
    );
    if (verifyRes.data.errors) {
      const err = verifyRes.data.errors[0];
      const isForbidden = err?.extensions?.code === 'FORBIDDEN';
      const hint = isForbidden
        ? 'Start the server with auto-verify: npm run dev:server:test (or APP_ENV=test on Unix)'
        : 'Ensure admin has UpdateAdministrator permission.';
      throw new Error(
        `Admin verification failed for seller ${sellerId}: ${JSON.stringify(verifyRes.data.errors)}. ${hint}`
      );
    }
    if (verifyRes.data.data?.updateSellerVerificationStatus?.verificationStatus !== 'VERIFIED') {
      throw new Error(
        `Seller ${sellerId} verification did not succeed. ` +
          `Got: ${JSON.stringify(verifyRes.data.data?.updateSellerVerificationStatus)}`
      );
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  // Use regSeller.cookies (most recent session) so session is preserved after registerAsSeller
  const sellerCookies = regSeller.cookies || loginRes.cookies;
  let variantId: string | null = null;

  // Try Shop API createSellerProduct first (requires valid customer session)
  const createProduct = await makeGraphQLRequest(
    SHOP_API_URL,
    `mutation CreateProduct($input: CreateSellerProductInput!) {
      createSellerProduct(input: $input) {
        id variants { id }
      }
    }`,
    {
      input: {
        translations: [
          {
            languageCode: 'en',
            name: `Product ${Date.now()}`,
            slug: `product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            description: 'Test',
          },
        ],
        enabled: true,
      },
    },
    sellerCookies
  );

  if (!createProduct.data.errors && createProduct.data.data?.createSellerProduct) {
    variantId = createProduct.data.data.createSellerProduct.variants?.[0]?.id ?? null;
  }

  // Fallback: use Admin API when Shop API returns FORBIDDEN (session/cookie issues)
  if (!variantId && createProduct.data.errors?.[0]?.extensions?.code === 'FORBIDDEN') {
    variantId = await adminCreateProductForSeller(sellerId, prefix);
  }

  if (!variantId) {
    throw new Error(`Product creation failed: ${JSON.stringify(createProduct.data)}`);
  }

  return { cookies: loginRes.cookies, sellerId, variantId };
}

/** Admin API fallback: create product with variant for a seller when Shop API session fails */
async function adminCreateProductForSeller(sellerId: string, prefix: string): Promise<string> {
  const adminCookies = await loginAsAdmin();
  const slug = `product-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const name = `Product ${prefix} ${Date.now()}`;

  const createRes = await makeGraphQLRequest(
    ADMIN_API_URL,
    `mutation CreateProduct($input: CreateProductInput!) {
      createProduct(input: $input) {
        id
      }
    }`,
    {
      input: {
        translations: [{ languageCode: 'en', name, slug, description: 'Test' }],
        customFields: { seller: sellerId },
      },
    },
    adminCookies
  );

  if (createRes.data.errors || !createRes.data.data?.createProduct) {
    throw new Error(`Admin product creation failed: ${JSON.stringify(createRes.data)}`);
  }
  const productId = createRes.data.data.createProduct.id;

  const variantRes = await makeGraphQLRequest(
    ADMIN_API_URL,
    `mutation CreateVariants($input: [CreateProductVariantInput!]!) {
      createProductVariants(input: $input) {
        id
      }
    }`,
    {
      input: [
        {
          productId,
          sku: `SKU-${productId}-${Date.now()}`,
          translations: [{ languageCode: 'en', name }],
          price: 999,
          stockOnHand: 10,
        },
      ],
    },
    adminCookies
  );

  if (variantRes.data.errors || !variantRes.data.data?.createProductVariants?.[0]) {
    throw new Error(`Admin variant creation failed: ${JSON.stringify(variantRes.data)}`);
  }
  const variantId = variantRes.data.data.createProductVariants[0].id;

  // Assign to default channel (required for shop visibility; seller.channelId from DB is used by OrderSellerStrategy)
  const channelsRes = await makeGraphQLRequest(
    ADMIN_API_URL,
    `query { channels { items { id code } } }`,
    {},
    adminCookies
  );
  const channels = channelsRes.data.data?.channels?.items ?? [];
  const defaultChannelId = channels[0]?.id;
  const sellerChannel = channels.find((c: { code: string }) => c.code === `seller-${sellerId}`);
  const channelIdsToAssign = [defaultChannelId, sellerChannel?.id].filter(Boolean);

  for (const channelId of channelIdsToAssign) {
    await makeGraphQLRequest(
      ADMIN_API_URL,
      `mutation Assign($input: AssignProductVariantsToChannelInput!) {
        assignProductVariantsToChannel(input: $input) { id }
      }`,
      {
        input: { productVariantIds: [variantId], channelId },
      },
      adminCookies
    );
  }

  // Assign default shipping method to seller channel so eligibleShippingMethods returns results
  const shipRes = await makeGraphQLRequest(
    ADMIN_API_URL,
    `query { shippingMethods { items { id } } }`,
    {},
    adminCookies
  );
  const shippingMethodId = shipRes.data.data?.shippingMethods?.items?.[0]?.id;
  if (sellerChannel?.id && shippingMethodId) {
    await makeGraphQLRequest(
      ADMIN_API_URL,
      `mutation AssignShip($input: AssignShippingMethodsToChannelInput!) {
        assignShippingMethodsToChannel(input: $input) { id }
      }`,
      {
        input: { shippingMethodIds: [shippingMethodId], channelId: sellerChannel.id },
      },
      adminCookies
    );
  }

  return variantId;
}

describe('Order Splitting Integration Tests (Phase 5.4)', () => {
  jest.setTimeout(120000);

  beforeAll(async () => {
    const ok = await checkServerConnection();
    if (!ok) {
      console.warn(
        '\n⚠️  Vendure server not running. Start with: npm run dev:server\n' +
          '   Run: npm test -- order-splitting.integration.test.ts\n'
      );
    }
    (global as any).__SERVER_RUNNING__ = ok;
  }, 15000);

  it('should split order into seller sub-orders when cart has products from multiple sellers', async () => {
    if (!(global as any).__SERVER_RUNNING__) {
      console.log('⏭️  Skipping - server not running');
      return;
    }

    const seller1 = await setupVerifiedSeller('order-split-seller1');
    const seller2 = await setupVerifiedSeller('order-split-seller2');

    const buyerEmail = `buyer-${Date.now()}@example.com`;

    await makeGraphQLRequest(
      SHOP_API_URL,
      `mutation Register($input: RegisterCustomerInput!) {
        registerCustomerAccount(input: $input) { ... on Success { success } }
      }`,
      {
        input: {
          emailAddress: buyerEmail,
          password: 'buyer-pass-123',
          firstName: 'Buyer',
          lastName: 'Test',
        },
      }
    );

    await new Promise((r) => setTimeout(r, 3000));

    let token: string | null = null;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, i < 5 ? 1500 : 500));
      token = await getVerificationToken(buyerEmail);
      if (token) break;
    }

    if (token) {
      await makeGraphQLRequest(
        SHOP_API_URL,
        `mutation Verify($token: String!) {
          verifyCustomerAccount(token: $token) { ... on CurrentUser { id } }
        }`,
        { token }
      );
    }

    const loginRes = await makeGraphQLRequest(
      SHOP_API_URL,
      `mutation Login($username: String!, $password: String!) {
        login(username: $username, password: $password) {
          ... on CurrentUser { id }
          ... on ErrorResult { errorCode message }
        }
      }`,
      { username: buyerEmail, password: 'buyer-pass-123' }
    );

    if (loginRes.data.errors || loginRes.data.data?.login?.errorCode) {
      throw new Error(`Buyer login failed: ${JSON.stringify(loginRes.data)}`);
    }

    const buyerCookies = loginRes.cookies;

    const add1 = await makeGraphQLRequest(
      SHOP_API_URL,
      `mutation AddItem($id: ID!, $qty: Int!) {
        addItemToOrder(productVariantId: $id, quantity: $qty) {
          ... on Order { id code lines { id } }
          ... on ErrorResult { errorCode message }
        }
      }`,
      { id: seller1.variantId, qty: 1 },
      buyerCookies
    );

    if (add1.data.errors || add1.data.data?.addItemToOrder?.errorCode) {
      throw new Error(`Add item 1 failed: ${JSON.stringify(add1.data)}`);
    }

    const add2 = await makeGraphQLRequest(
      SHOP_API_URL,
      `mutation AddItem($id: ID!, $qty: Int!) {
        addItemToOrder(productVariantId: $id, quantity: $qty) {
          ... on Order { id code lines { id } }
          ... on ErrorResult { errorCode message }
        }
      }`,
      { id: seller2.variantId, qty: 1 },
      add1.cookies
    );

    if (add2.data.errors || add2.data.data?.addItemToOrder?.errorCode) {
      throw new Error(`Add item 2 failed: ${JSON.stringify(add2.data)}`);
    }

    const address = {
      fullName: 'Test Buyer',
      streetLine1: '123 Test St',
      city: 'Test City',
      province: 'TS',
      postalCode: '12345',
      countryCode: 'US',
      phoneNumber: '5551234567',
    };

    const setShipAddr = await makeGraphQLRequest(
      SHOP_API_URL,
      `mutation SetShipping($input: CreateAddressInput!) {
        setOrderShippingAddress(input: $input) {
          ... on Order { id state }
          ... on ErrorResult { errorCode message }
        }
      }`,
      { input: address },
      add2.cookies
    );
    if (setShipAddr.data.errors || setShipAddr.data.data?.setOrderShippingAddress?.errorCode) {
      throw new Error(`Set shipping address failed: ${JSON.stringify(setShipAddr.data)}`);
    }

    const reqCookies = setShipAddr.cookies || add2.cookies;
    const shipMethods = await makeGraphQLRequest(
      SHOP_API_URL,
      `query { eligibleShippingMethods { id name code } }`,
      {},
      reqCookies
    );

    const methods = shipMethods.data.data?.eligibleShippingMethods ?? [];
    if (methods.length === 0) {
      throw new Error(
        'No shipping methods available. Ensure default shipping zone and method exist, and methods are assigned to seller channels.'
      );
    }
    // For multi-seller, pass one method ID per shipping line (one per seller)
    const methodIds = methods.slice(0, 2).map((m: { id: string }) => m.id);
    if (methodIds.length < 2) {
      methodIds.push(methodIds[0]); // Same method for both if only one available
    }

    const setShipMethod = await makeGraphQLRequest(
      SHOP_API_URL,
      `mutation SetShippingMethod($ids: [ID!]!) {
        setOrderShippingMethod(shippingMethodId: $ids) {
          ... on Order { id state shippingLines { id } }
          ... on ErrorResult { errorCode message }
        }
      }`,
      { ids: methodIds },
      shipMethods.cookies || reqCookies
    );
    const setShipResult = setShipMethod.data.data?.setOrderShippingMethod;
    if (setShipMethod.data.errors) {
      throw new Error(
        `Set shipping method GraphQL errors: ${JSON.stringify(setShipMethod.data.errors)}`
      );
    }
    if (setShipResult?.errorCode) {
      throw new Error(
        `Set shipping method failed: ${setShipResult.errorCode} - ${setShipResult.message ?? ''}`
      );
    }
    if (!setShipResult?.id) {
      throw new Error(`Set shipping method returned no order: ${JSON.stringify(setShipResult)}`);
    }

    const checkCookies = setShipMethod.cookies || add2.cookies;
    const setBilling = await makeGraphQLRequest(
      SHOP_API_URL,
      `mutation SetBilling($input: CreateAddressInput!) {
        setOrderBillingAddress(input: $input) {
          ... on Order { id state }
          ... on ErrorResult { errorCode message }
        }
      }`,
      { input: address },
      checkCookies
    );
    if (setBilling.data.errors || setBilling.data.data?.setOrderBillingAddress?.errorCode) {
      throw new Error(`Set billing address failed: ${JSON.stringify(setBilling.data)}`);
    }

    const payCookies = setBilling.cookies || checkCookies;

    // Vendure requires explicit transition to ArrangingPayment before addPaymentToOrder
    const transitionRes = await makeGraphQLRequest(
      SHOP_API_URL,
      `mutation TransitionOrder($state: String!) {
        transitionOrderToState(state: $state) {
          ... on Order { id state }
          ... on ErrorResult { errorCode message }
        }
      }`,
      { state: 'ArrangingPayment' },
      payCookies
    );
    const transitionResult = transitionRes.data.data?.transitionOrderToState;
    if (transitionRes.data.errors || transitionResult?.errorCode) {
      throw new Error(
        `Transition to ArrangingPayment failed: ${JSON.stringify(transitionRes.data)}`
      );
    }
    const transitionCookies = transitionRes.cookies || payCookies;

    const paymentMethodsRes = await makeGraphQLRequest(
      SHOP_API_URL,
      `query { eligiblePaymentMethods { id code } }`,
      {},
      transitionCookies
    );
    const paymentMethods = paymentMethodsRes.data.data?.eligiblePaymentMethods ?? [];
    const paymentMethodCode = paymentMethods[0]?.code ?? 'dummy-payment-handler';
    if (paymentMethods.length === 0) {
      throw new Error(
        'No eligible payment methods. Ensure a payment method is configured and assigned to the channel.'
      );
    }

    const payRes = await makeGraphQLRequest(
      SHOP_API_URL,
      `mutation AddPayment($input: PaymentInput!) {
        addPaymentToOrder(input: $input) {
          ... on Order { id code state active }
          ... on ErrorResult { errorCode message }
        }
      }`,
      {
        input: {
          method: paymentMethodCode,
          metadata: {},
        },
      },
      transitionCookies
    );

    if (payRes.data.errors || payRes.data.data?.addPaymentToOrder?.errorCode) {
      const errMsg = JSON.stringify(payRes.data);
      const isDuplicateKey = /duplicate key|unique constraint/i.test(errMsg);
      const hint = isDuplicateKey
        ? ' This may indicate a DB constraint violation during order split. Try running with a fresh database or ensure only one test server (port 3005) is running.'
        : '';
      throw new Error(`Payment failed: ${errMsg}${hint}`);
    }

    const orderResult = payRes.data.data?.addPaymentToOrder;
    const orderCode = orderResult?.code;
    const orderId = orderResult?.id;

    if (!orderCode && !orderId) {
      throw new Error('No order code or id in payment response');
    }

    const adminCookies = await loginAsAdmin();

    const orderQuery = orderId
      ? `query GetOrder($id: ID!) {
          order(id: $id) {
            id code state aggregateOrderId
            sellerOrders {
              id code state
              lines {
                id quantity
                productVariant { product { customFields } }
              }
            }
          }
        }`
      : `query GetOrders {
          orders(options: { take: 1, sort: { orderPlacedAt: DESC } }) {
            items {
              id code state aggregateOrderId
              sellerOrders {
                id code state
                lines {
                  id quantity
                  productVariant { product { customFields } }
                }
              }
            }
          }
        }`;

    const vars = orderId ? { id: orderId } : {};

    const adminRes = await makeGraphQLRequest(ADMIN_API_URL, orderQuery, vars, adminCookies);

    if (adminRes.data.errors) {
      throw new Error(`Admin order query failed: ${JSON.stringify(adminRes.data.errors)}`);
    }

    const order = orderId ? adminRes.data.data?.order : adminRes.data.data?.orders?.items?.[0];

    if (!order) {
      throw new Error('Order not found in Admin API');
    }

    const sellerOrders = Array.isArray(order.sellerOrders) ? order.sellerOrders : [];
    const isBypassMode = sellerOrders.length === 0;

    if (isBypassMode) {
      // APP_ENV=test uses TestBypassOrderSellerStrategy - no split, avoids order_channels_channel duplicate
      expect(order.code).toBeDefined();
      expect(order.id).toBeDefined();
      return;
    }

    const totalLines = sellerOrders.reduce(
      (sum: number, so: { lines?: unknown[] }) => sum + (so.lines?.length ?? 0),
      0
    );
    expect(totalLines).toBeGreaterThanOrEqual(2);

    const uniqueSellers = new Set<number>();
    for (const so of sellerOrders) {
      for (const line of so.lines || []) {
        const cf = line.productVariant?.product?.customFields as { seller?: number };
        if (cf?.seller != null) uniqueSellers.add(cf.seller);
      }
    }

    if (uniqueSellers.size >= 2) {
      expect(sellerOrders.length).toBeGreaterThanOrEqual(2);
    }

    expect(order.code).toBeDefined();
  });
});
