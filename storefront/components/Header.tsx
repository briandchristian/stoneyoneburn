/**
 * Header Component
 *
 * Main navigation header for the storefront with cart count display
 */

'use client';

import Link from 'next/link';
import { SearchBar } from './SearchBar';
import { useQuery } from '@apollo/client';
import { GET_ACTIVE_ORDER } from '@/graphql/queries';

export function Header() {
  const { data } = useQuery(GET_ACTIVE_ORDER, {
    fetchPolicy: 'cache-and-network',
  });

  const order = data?.activeOrder;
  const cartItemCount = order?.lines?.reduce((sum: number, line: { quantity: number }) => sum + line.quantity, 0) || 0;

  return (
    <header className="border-b-2 border-blue-800 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-black">
              StoneyOneBurn
            </Link>
          </div>
          <div className="flex-1 max-w-2xl hidden md:block">
            <SearchBar />
          </div>
          <nav className="flex items-center space-x-6">
            <Link
              href="/products"
              className="text-sm font-semibold text-black hover:text-blue-700 transition-colors"
            >
              Products
            </Link>
            <Link
              href="/collections"
              className="text-sm font-semibold text-black hover:text-blue-700 transition-colors"
            >
              Categories
            </Link>
            <Link
              href="/cart"
              className="relative text-sm font-semibold text-black hover:text-blue-700 transition-colors"
            >
              Cart
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
        <div className="md:hidden pb-4">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}

