/**
 * Apollo Provider Component
 *
 * Wraps the application with Apollo Provider to enable GraphQL queries
 * throughout the component tree.
 */

'use client';

import { ApolloProvider } from '@apollo/client';
import { apolloClient } from './apollo-client';

export function VendureApolloProvider({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}

