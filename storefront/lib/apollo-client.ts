/**
 * Apollo Client Configuration for Vendure Shop API
 *
 * This module sets up the Apollo Client instance to connect to the Vendure
 * Shop API GraphQL endpoint.
 */

import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api',
});

// Auth link to add any necessary headers (e.g., for authenticated requests)
const authLink = setContext((_, { headers }) => {
  // Get auth token from localStorage if available
  // This will be used when we implement customer authentication
  const token = typeof window !== 'undefined' ? localStorage.getItem('vendure_token') : null;

  return {
    headers: {
      ...headers,
      ...(token && { authorization: `Bearer ${token}` }),
    },
  };
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      Product: {
        fields: {
          variants: {
            merge(existing = [], incoming: any[]) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
    query: {
      fetchPolicy: 'cache-first',
    },
  },
});

