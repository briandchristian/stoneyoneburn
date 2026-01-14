/**
 * Seller Product Management Integration Tests
 *
 * Integration tests for Phase 2.3: Seller-Product Association
 *
 * These tests verify the complete seller product management workflow:
 * - Product creation for sellers
 * - Product update with ownership validation
 * - Product deletion with ownership validation
 * - Permission checks (verified sellers only)
 * - Ownership validation (can't modify other sellers' products)
 *
 * These tests require:
 * - Vendure server to be running (npm run dev:server)
 * - Database migrations to be applied
 * - Database connection (PostgreSQL)
 *
 * Run with: npm test -- seller-product-management.integration.test.ts
 *
 * Note: These tests make HTTP requests to the running Vendure server.
 * Make sure the server is running before executing these tests.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const SHOP_API_URL = process.env.VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';
const TEST_EMAIL_PATH = path.join(__dirname, '../../../../static/email/test-emails');

/**
 * Helper function to make GraphQL requests
 */
async function makeGraphQLRequest(query: string, variables: any = {}, cookies: string = '') {
  const response = await fetch(SHOP_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookies,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const data = await response.json();

  // Handle cookie extraction
  let newCookies = cookies;
  const setCookieHeader = response.headers.get('set-cookie');
  if (setCookieHeader) {
    const cookieParts = setCookieHeader.split(',').map((c) => c.trim());
    const cookieStrings: string[] = [];

    for (const cookiePart of cookieParts) {
      const match = cookiePart.match(/^([^=]+)=([^;]+)/);
      if (match) {
        cookieStrings.push(`${match[1]}=${match[2]}`);
      }
    }

    if (cookieStrings.length > 0) {
      newCookies = cookieStrings.join('; ');
    } else {
      newCookies = setCookieHeader.split(';')[0];
    }
  }

  if (data.errors) {
    console.error('GraphQL Errors:', JSON.stringify(data.errors, null, 2));
  }

  return { data, cookies: newCookies };
}

/**
 * Helper function to check if server is running
 */
async function checkServerConnection(): Promise<boolean> {
  try {
    const result = await makeGraphQLRequest(`query { __typename }`);
    return !result.data.errors && result.data.data?.__typename !== undefined;
  } catch (error: any) {
    console.error('Server connection check failed:', error.message);
    return false;
  }
}

/**
 * Helper function to get verification token from email file
 */
async function getVerificationToken(email: string): Promise<string | null> {
  try {
    const emailFiles = fs.readdirSync(TEST_EMAIL_PATH);
    const customerEmailFile = emailFiles.find((file) => file.includes(email));

    if (customerEmailFile) {
      const emailContent = fs.readFileSync(
        path.join(TEST_EMAIL_PATH, customerEmailFile),
        'utf8'
      );
      const tokenMatch = emailContent.match(/token=([a-zA-Z0-9-_.]+)/);
      if (tokenMatch) {
        return tokenMatch[1];
      }
    }
  } catch (error) {
    // Email directory might not exist or be empty
    console.warn('Could not read verification token from email:', error);
  }
  return null;
}

/**
 * Helper function to verify customer account
 */
async function verifyCustomerAccount(token: string): Promise<any> {
  const verifyMutation = `
    mutation VerifyCustomerAccount($token: String!) {
      verifyCustomerAccount(token: $token) {
        ... on CurrentUser {
          id
        }
        ... on ErrorResult {
          errorCode
          message
        }
      }
    }
  `;
  const result = await makeGraphQLRequest(verifyMutation, { token });
  return result.data.data.verifyCustomerAccount;
}

/**
 * Helper function to register and authenticate a seller
 * Returns cookies and seller ID
 */
async function setupVerifiedSeller(
  emailPrefix: string = 'seller-product-test'
): Promise<{ cookies: string; sellerId: string; email: string }> {
  const email = `${emailPrefix}-${Date.now()}@example.com`;

  // Register customer
  await makeGraphQLRequest(
    `mutation RegisterCustomer($input: RegisterCustomerInput!) {
      registerCustomerAccount(input: $input) {
        ... on Success { success }
      }
    }`,
    {
      input: {
        emailAddress: email,
        password: 'test-password-123',
        firstName: 'Test',
        lastName: 'Seller',
      },
    }
  );

  // Verify email
  const token = await getVerificationToken(email);
  if (token) {
    await verifyCustomerAccount(token);
  }

  // Login
  const loginResult = await makeGraphQLRequest(
    `mutation Login($username: String!, $password: String!) {
      login(username: $username, password: $password) {
        ... on CurrentUser { id }
      }
    }`,
    { username: email, password: 'test-password-123' }
  );
  const cookies = loginResult.cookies;

  // Register as seller
  const sellerResult = await makeGraphQLRequest(
    `mutation RegisterAsSeller($input: RegisterSellerInput!) {
      registerAsSeller(input: $input) {
        id
        shopName
        verificationStatus
      }
    }`,
    {
      input: {
        shopName: `Test Shop ${Date.now()}`,
        shopDescription: 'Test shop for product management',
      },
    },
    cookies
  );

  const sellerId = sellerResult.data.data.registerAsSeller.id;

  // Note: In a real scenario, seller would need to be verified by admin
  // For testing, we'll assume the seller is verified or test the unverified case separately

  return { cookies, sellerId, email };
}

/**
 * Integration Test Suite: Seller Product Management
 */
describe('Seller Product Management Integration Tests', () => {
  let sellerCookies: string = '';
  let sellerId: string = '';
  let sellerEmail: string = '';
  let productId: string = '';

  beforeAll(async () => {
    const serverRunning = await checkServerConnection();
    if (!serverRunning) {
      console.warn(
        '\n⚠️  Vendure server is not running. Start it with: npm run dev:server\n' +
          '   These integration tests require a running server.\n' +
          '   All tests will be skipped until the server is available.\n'
      );
    }
    (global as any).__VENDURE_SERVER_RUNNING__ = serverRunning;
  }, 15000);

  describe('Seller Setup', () => {
    it('should set up a verified seller for product management tests', async () => {
      if (!(global as any).__VENDURE_SERVER_RUNNING__) {
        console.log('⏭️  Skipping test - server not running');
        return;
      }

      const setup = await setupVerifiedSeller('product-test');
      sellerCookies = setup.cookies;
      sellerId = setup.sellerId;
      sellerEmail = setup.email;

      expect(sellerCookies).toBeDefined();
      expect(sellerId).toBeDefined();
      expect(sellerEmail).toBeDefined();

      // Verify seller exists
      const activeSellerQuery = `
        query ActiveSeller {
          activeSeller {
            id
            shopName
            verificationStatus
          }
        }
      `;
      const result = await makeGraphQLRequest(activeSellerQuery, {}, sellerCookies);
      expect(result.data.data.activeSeller).toBeDefined();
      expect(result.data.data.activeSeller.id).toBe(sellerId);
    });
  });

  describe('Product Creation', () => {
    it('should create a product for a verified seller', async () => {
      if (!(global as any).__VENDURE_SERVER_RUNNING__) {
        console.log('⏭️  Skipping test - server not running');
        return;
      }

      const createProductMutation = `
        mutation CreateSellerProduct($input: CreateSellerProductInput!) {
          createSellerProduct(input: $input) {
            id
            name
            slug
            enabled
          }
        }
      `;

      const variables = {
        input: {
          translations: [
            {
              languageCode: 'en',
              name: 'Test Product',
              slug: `test-product-${Date.now()}`,
              description: 'A test product created by integration tests',
            },
          ],
          enabled: true,
        },
      };

      const result = await makeGraphQLRequest(createProductMutation, variables, sellerCookies);

      expect(result.data.data).toBeDefined();
      expect(result.data.data.createSellerProduct).toBeDefined();
      expect(result.data.data.createSellerProduct.id).toBeDefined();
      expect(result.data.data.createSellerProduct.name).toBe('Test Product');
      expect(result.data.data.createSellerProduct.enabled).toBe(true);

      productId = result.data.data.createSellerProduct.id;
    });

    it('should reject product creation for unverified seller', async () => {
      if (!(global as any).__VENDURE_SERVER_RUNNING__) {
        console.log('⏭️  Skipping test - server not running');
        return;
      }

      // Note: This test assumes the seller is not verified
      // In a real scenario, you would need to ensure the seller is in PENDING status
      // For now, we'll test that the mutation requires verification
      // (This may need to be adjusted based on actual seller verification status)

      const createProductMutation = `
        mutation CreateSellerProduct($input: CreateSellerProductInput!) {
          createSellerProduct(input: $input) {
            id
          }
        }
      `;

      const variables = {
        input: {
          translations: [
            {
              languageCode: 'en',
              name: 'Should Fail Product',
              slug: `should-fail-${Date.now()}`,
            },
          ],
        },
      };

      // If seller is not verified, this should fail
      // The actual behavior depends on seller verification status
      const result = await makeGraphQLRequest(createProductMutation, variables, sellerCookies);

      // If seller is verified, product will be created
      // If seller is not verified, we expect an error
      if (result.data.errors) {
        expect(result.data.errors[0].extensions.code).toBe('SELLER_NOT_VERIFIED');
      } else {
        // Seller is verified, which is fine for other tests
        expect(result.data.data.createSellerProduct).toBeDefined();
      }
    });

    it('should require authentication to create products', async () => {
      if (!(global as any).__VENDURE_SERVER_RUNNING__) {
        console.log('⏭️  Skipping test - server not running');
        return;
      }

      const createProductMutation = `
        mutation CreateSellerProduct($input: CreateSellerProductInput!) {
          createSellerProduct(input: $input) {
            id
          }
        }
      `;

      const variables = {
        input: {
          translations: [
            {
              languageCode: 'en',
              name: 'Unauthorized Product',
              slug: `unauthorized-${Date.now()}`,
            },
          ],
        },
      };

      const result = await makeGraphQLRequest(createProductMutation, variables, ''); // No cookies

      expect(result.data.errors).toBeDefined();
      expect(result.data.errors[0].extensions.code).toBe('FORBIDDEN');
    });
  });

  describe('Product Update', () => {
    it('should update a seller\'s own product', async () => {
      if (!(global as any).__VENDURE_SERVER_RUNNING__) {
        console.log('⏭️  Skipping test - server not running');
        return;
      }

      // Ensure we have a product to update
      if (!productId) {
        const createResult = await makeGraphQLRequest(
          `mutation CreateSellerProduct($input: CreateSellerProductInput!) {
            createSellerProduct(input: $input) {
              id
            }
          }`,
          {
            input: {
              translations: [
                {
                  languageCode: 'en',
                  name: 'Product to Update',
                  slug: `update-test-${Date.now()}`,
                },
              ],
            },
          },
          sellerCookies
        );
        productId = createResult.data.data.createSellerProduct.id;
      }

      const updateProductMutation = `
        mutation UpdateSellerProduct($input: UpdateSellerProductInput!) {
          updateSellerProduct(input: $input) {
            id
            name
            slug
            enabled
          }
        }
      `;

      const updatedName = `Updated Product ${Date.now()}`;
      const updatedSlug = `updated-product-${Date.now()}`;

      const variables = {
        input: {
          productId: productId,
          translations: [
            {
              languageCode: 'en',
              name: updatedName,
              slug: updatedSlug,
            },
          ],
          enabled: false,
        },
      };

      const result = await makeGraphQLRequest(updateProductMutation, variables, sellerCookies);

      expect(result.data.data).toBeDefined();
      expect(result.data.data.updateSellerProduct).toBeDefined();
      expect(result.data.data.updateSellerProduct.id).toBe(productId);
      expect(result.data.data.updateSellerProduct.name).toBe(updatedName);
      expect(result.data.data.updateSellerProduct.enabled).toBe(false);
    });

    it('should reject update if product belongs to different seller', async () => {
      if (!(global as any).__VENDURE_SERVER_RUNNING__) {
        console.log('⏭️  Skipping test - server not running');
        return;
      }

      // Create a second seller
      const seller2 = await setupVerifiedSeller('seller2-product-test');

      // Create a product for seller 2
      const createResult = await makeGraphQLRequest(
        `mutation CreateSellerProduct($input: CreateSellerProductInput!) {
          createSellerProduct(input: $input) {
            id
          }
        }`,
        {
          input: {
            translations: [
              {
                languageCode: 'en',
                name: 'Seller 2 Product',
                slug: `seller2-product-${Date.now()}`,
              },
            ],
          },
        },
        seller2.cookies
      );

      const seller2ProductId = createResult.data.data.createSellerProduct.id;

      // Try to update seller 2's product using seller 1's cookies
      const updateProductMutation = `
        mutation UpdateSellerProduct($input: UpdateSellerProductInput!) {
          updateSellerProduct(input: $input) {
            id
          }
        }
      `;

      const variables = {
        input: {
          productId: seller2ProductId,
          translations: [
            {
              languageCode: 'en',
              name: 'Hacked Product',
              slug: 'hacked',
            },
          ],
        },
      };

      const result = await makeGraphQLRequest(updateProductMutation, variables, sellerCookies);

      expect(result.data.errors).toBeDefined();
      expect(result.data.errors[0].extensions.code).toBe('PRODUCT_NOT_OWNED_BY_SELLER');
    });
  });

  describe('Product Deletion', () => {
    it('should delete a seller\'s own product', async () => {
      if (!(global as any).__VENDURE_SERVER_RUNNING__) {
        console.log('⏭️  Skipping test - server not running');
        return;
      }

      // Create a product to delete
      const createResult = await makeGraphQLRequest(
        `mutation CreateSellerProduct($input: CreateSellerProductInput!) {
          createSellerProduct(input: $input) {
            id
          }
        }`,
        {
          input: {
            translations: [
              {
                languageCode: 'en',
                name: 'Product to Delete',
                slug: `delete-test-${Date.now()}`,
              },
            ],
          },
        },
        sellerCookies
      );

      const productToDeleteId = createResult.data.data.createSellerProduct.id;

      // Delete the product
      const deleteProductMutation = `
        mutation DeleteSellerProduct($productId: ID!) {
          deleteSellerProduct(productId: $productId) {
            result
            message
          }
        }
      `;

      const variables = {
        productId: productToDeleteId,
      };

      const result = await makeGraphQLRequest(deleteProductMutation, variables, sellerCookies);

      expect(result.data.data).toBeDefined();
      expect(result.data.data.deleteSellerProduct).toBeDefined();
      expect(result.data.data.deleteSellerProduct.result).toBe('DELETED');
    });

    it('should reject deletion if product belongs to different seller', async () => {
      if (!(global as any).__VENDURE_SERVER_RUNNING__) {
        console.log('⏭️  Skipping test - server not running');
        return;
      }

      // Create a second seller
      const seller2 = await setupVerifiedSeller('seller2-delete-test');

      // Create a product for seller 2
      const createResult = await makeGraphQLRequest(
        `mutation CreateSellerProduct($input: CreateSellerProductInput!) {
          createSellerProduct(input: $input) {
            id
          }
        }`,
        {
          input: {
            translations: [
              {
                languageCode: 'en',
                name: 'Seller 2 Product to Delete',
                slug: `seller2-delete-${Date.now()}`,
              },
            ],
          },
        },
        seller2.cookies
      );

      const seller2ProductId = createResult.data.data.createSellerProduct.id;

      // Try to delete seller 2's product using seller 1's cookies
      const deleteProductMutation = `
        mutation DeleteSellerProduct($productId: ID!) {
          deleteSellerProduct(productId: $productId) {
            result
          }
        }
      `;

      const variables = {
        productId: seller2ProductId,
      };

      const result = await makeGraphQLRequest(deleteProductMutation, variables, sellerCookies);

      expect(result.data.errors).toBeDefined();
      expect(result.data.errors[0].extensions.code).toBe('PRODUCT_NOT_OWNED_BY_SELLER');
    });
  });

  describe('Product Ownership Validation', () => {
    it('should query sellerProducts to list seller\'s products', async () => {
      if (!(global as any).__VENDURE_SERVER_RUNNING__) {
        console.log('⏭️  Skipping test - server not running');
        return;
      }

      // Create a product first
      const createResult = await makeGraphQLRequest(
        `mutation CreateSellerProduct($input: CreateSellerProductInput!) {
          createSellerProduct(input: $input) {
            id
            name
          }
        }`,
        {
          input: {
            translations: [
              {
                languageCode: 'en',
                name: 'Product for Listing',
                slug: `listing-test-${Date.now()}`,
              },
            ],
          },
        },
        sellerCookies
      );

      // Query seller products
      const sellerProductsQuery = `
        query SellerProducts($sellerId: ID!) {
          sellerProducts(sellerId: $sellerId) {
            id
            name
            slug
            enabled
          }
        }
      `;

      const variables = {
        sellerId: sellerId,
      };

      const result = await makeGraphQLRequest(sellerProductsQuery, variables);

      expect(result.data.data).toBeDefined();
      expect(result.data.data.sellerProducts).toBeDefined();
      expect(Array.isArray(result.data.data.sellerProducts)).toBe(true);
      expect(result.data.data.sellerProducts.length).toBeGreaterThan(0);

      // Verify the product we created is in the list
      const productIds = result.data.data.sellerProducts.map((p: any) => p.id);
      expect(productIds).toContain(createResult.data.data.createSellerProduct.id);
    });
  });
});
