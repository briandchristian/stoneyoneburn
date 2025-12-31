/**
 * Test Utilities
 *
 * Helper functions and providers for testing React components with Apollo Client
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';

/**
 * Create a test Apollo Client instance
 */
export function createTestApolloClient() {
  return new ApolloClient({
    uri: 'http://localhost:3000/shop-api',
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'no-cache',
      },
      query: {
        fetchPolicy: 'no-cache',
      },
    },
  });
}

/**
 * Custom render function that includes Apollo Provider
 */
export function renderWithApollo(
  ui: ReactElement,
  mocks: MockedResponse[] = [],
  options?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <MockedProvider mocks={mocks}>{children}</MockedProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
