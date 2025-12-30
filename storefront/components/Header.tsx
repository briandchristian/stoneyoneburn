/**
 * Header Component
 *
 * Main navigation header for the storefront
 */

'use client';

import Link from 'next/link';

export function Header() {
  return (
    <header className="border-b-2 border-blue-800 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-black">
              StoneyOneBurn
            </Link>
          </div>
          <nav className="flex items-center space-x-6">
            <Link
              href="/products"
              className="text-sm font-semibold text-black hover:text-blue-700 transition-colors"
            >
              Products
            </Link>
            <Link
              href="/cart"
              className="text-sm font-semibold text-black hover:text-blue-700 transition-colors"
            >
              Cart
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

