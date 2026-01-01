/**
 * Collections Page
 *
 * Browse products by category/collection
 */

'use client';

import { useQuery } from '@apollo/client';
import { GET_COLLECTIONS } from '@/graphql/queries';
import { Header } from '@/components/Header';
import Link from 'next/link';
import Image from 'next/image';

interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  featuredAsset?: {
    id: string;
    preview: string;
  };
}

interface CollectionsData {
  collections?: {
    items: Collection[];
    totalItems: number;
  };
}

export default function CollectionsPage() {
  const { data, loading, error } = useQuery<CollectionsData>(GET_COLLECTIONS, {
    fetchPolicy: 'cache-and-network',
  });

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-black font-medium">Loading collections...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    console.error('GraphQL Error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-red-700 font-semibold">
                Error loading collections: {error.message}
              </p>
              {error.networkError && (
                <p className="mt-2 text-sm text-red-600">
                  Network Error: {error.networkError.message}
                </p>
              )}
              {error.graphQLErrors && error.graphQLErrors.length > 0 && (
                <div className="mt-2 text-sm text-red-600">
                  {error.graphQLErrors.map((err, idx) => (
                    <p key={idx}>{err.message}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const collections: Collection[] = data?.collections?.items || [];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-black mb-8">Shop by Category</h1>
          {collections.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-black font-medium">No collections found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.slug}`}
                  className="group rounded-lg border-2 border-blue-200 bg-white p-6 shadow-md transition-all hover:shadow-lg hover:border-blue-400"
                >
                  {collection.featuredAsset?.preview && (
                    <div className="aspect-video w-full overflow-hidden rounded-lg bg-blue-50 mb-4">
                      <Image
                        src={collection.featuredAsset.preview}
                        alt={collection.name}
                        width={400}
                        height={225}
                        className="h-full w-full object-cover object-center group-hover:opacity-90 transition-opacity"
                      />
                    </div>
                  )}
                  <h2 className="text-xl font-bold text-black mb-2">{collection.name}</h2>
                  {collection.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {collection.description}
                    </p>
                  )}
                  <p className="text-sm font-medium text-blue-700">
                    View products
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
