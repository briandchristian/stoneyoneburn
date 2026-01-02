/**
 * Cart Persistence Integration Tests
 * 
 * Tests to verify that cart items persist across requests by ensuring
 * credentials (cookies) are sent with GraphQL requests.
 */

// Mock fetch and Response before importing Apollo Client
class MockResponse {
  ok = true;
  status = 200;
  statusText = 'OK';
  headers: Headers;

  constructor(public body: string, init?: ResponseInit) {
    this.headers = new Headers(init?.headers);
  }

  async json() {
    return JSON.parse(this.body);
  }

  async text() {
    return this.body;
  }
}

global.fetch = jest.fn();
global.Response = MockResponse as any;

import { apolloClient } from '../apollo-client';
import { ADD_ITEM_TO_ORDER, GET_ACTIVE_ORDER } from '@/graphql/queries';

describe('Cart Persistence', () => {
  /**
   * Test that Apollo Client sends credentials with requests
   * 
   * This is critical for cart persistence because Vendure uses cookies
   * to track the active order session. Without credentials, each request
   * creates a new session.
   */
  it('should send credentials with GraphQL requests', async () => {
    let capturedInit: RequestInit | null = null;

    (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedInit = init || {};
      // Return a mock successful response
      return new MockResponse(JSON.stringify({ data: { activeOrder: null } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    // Attempt to query the active order
    await apolloClient.query({
      query: GET_ACTIVE_ORDER,
      errorPolicy: 'ignore',
    });

    // Verify credentials were included in the request
    // This is the critical test - credentials must be 'include' for cookies
    expect(capturedInit).not.toBeNull();
    expect(capturedInit?.credentials).toBe('include');
  });

  /**
   * Test that mutations also send credentials
   */
  it('should send credentials with mutation requests', async () => {
    let capturedInit: RequestInit | null = null;

    (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedInit = init || {};
      // Return a mock successful response
      return new MockResponse(
        JSON.stringify({
          data: {
            addItemToOrder: {
              __typename: 'Order',
              id: 'test-order-id',
              lines: [],
            },
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    // Attempt to add item to order
    await apolloClient.mutate({
      mutation: ADD_ITEM_TO_ORDER,
      variables: {
        productVariantId: 'test-variant-id',
        quantity: 1,
      },
      errorPolicy: 'ignore',
    });

    // Verify credentials were included
    expect(capturedInit).not.toBeNull();
    expect(capturedInit?.credentials).toBe('include');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });
});
