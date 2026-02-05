/**
 * Header Component
 *
 * Main navigation header for the storefront with cart count display
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { SearchBar } from './SearchBar';
import { useQuery } from '@apollo/client';
import { GET_ACTIVE_ORDER, GET_ACTIVE_CUSTOMER } from '@/graphql/queries';

export function Header() {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Ensure queries are defined before using them
  const { data: orderData } = useQuery(GET_ACTIVE_ORDER, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'ignore', // Ignore errors to prevent Header from breaking on API errors
    skip: !GET_ACTIVE_ORDER, // Skip if query is undefined
  });

  const { data: customerData } = useQuery(GET_ACTIVE_CUSTOMER, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'ignore', // Ignore errors - customer may not be logged in
    skip: !GET_ACTIVE_CUSTOMER, // Skip if query is undefined
  });

  const order = orderData?.activeOrder;
  const cartItemCount = order?.lines?.reduce((sum: number, line: { quantity: number }) => sum + line.quantity, 0) || 0;
  const activeCustomer = customerData?.activeCustomer;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };

    if (isAccountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAccountMenuOpen]);

  const customerDisplayName = activeCustomer
    ? `${activeCustomer.firstName} ${activeCustomer.lastName}`.trim() || activeCustomer.emailAddress
    : null;

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
            {activeCustomer ? (
              <div className="relative" ref={accountMenuRef}>
                <button
                  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  className="flex items-center space-x-2 text-sm font-semibold text-black hover:text-blue-700 transition-colors"
                  aria-label="Account menu"
                  aria-expanded={isAccountMenuOpen}
                  data-testid="account-indicator"
                >
                  {/* User Icon */}
                  <svg
                    className="h-6 w-6 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  <span className="hidden sm:inline">{customerDisplayName}</span>
                  {/* Dropdown Arrow */}
                  <svg
                    className={`h-4 w-4 transition-transform ${isAccountMenuOpen ? 'transform rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Account Dropdown Menu */}
                {isAccountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border-2 border-gray-200 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-semibold text-black">{customerDisplayName}</p>
                      <p className="text-xs text-gray-600 truncate">{activeCustomer.emailAddress}</p>
                    </div>
                    <Link
                      href="/account"
                      className="block px-4 py-2 text-sm text-black hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      My Account
                    </Link>
                    <Link
                      href="/seller/shop-settings"
                      className="block px-4 py-2 text-sm text-black hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      Sell on Marketplace
                    </Link>
                    <Link
                      href="/orders"
                      className="block px-4 py-2 text-sm text-black hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      Order History
                    </Link>
                    <Link
                      href="/logout"
                      className="block px-4 py-2 text-sm text-black hover:bg-blue-50 hover:text-blue-700 transition-colors border-t border-gray-200 mt-1"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      Sign Out
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-black hover:text-blue-700 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-semibold text-blue-700 hover:text-blue-800 transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="md:hidden pb-4">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}

