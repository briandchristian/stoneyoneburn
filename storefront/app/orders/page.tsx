/**
 * Order History Page
 *
 * Displays a list of all customer orders with pagination support.
 * Customers can view their order history and navigate to individual order details.
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_ORDERS } from '@/graphql/queries';
import { Header } from '@/components/Header';
import Link from 'next/link';
import Image from 'next/image';

interface OrderLine {
  id: string;
  quantity: number;
  productVariant: {
    id: string;
    name: string;
    product: {
      id: string;
      name: string;
      slug: string;
      featuredAsset?: {
        id: string;
        preview: string;
      };
    };
  };
}

interface Order {
  id: string;
  code: string;
  state: string;
  orderPlacedAt: string;
  total: number;
  totalWithTax: number;
  currencyCode: string;
  lines: OrderLine[];
}

interface OrdersData {
  activeCustomer: {
    orders: {
      items: Order[];
      totalItems: number;
    };
  } | null;
}

const ITEMS_PER_PAGE = 10;

export default function OrderHistoryPage() {
  const [page, setPage] = useState(0);

  // Ensure query is defined before using it
  if (!GET_ORDERS) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="text-black font-medium">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  const { data, loading, error } = useQuery<OrdersData>(GET_ORDERS, {
    variables: {
      options: {
        take: ITEMS_PER_PAGE,
        skip: page * ITEMS_PER_PAGE,
      },
    },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all', // Return both data and errors to prevent error propagation
  });

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currencyCode: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount / 100);
  };

  const formatOrderState = (state: string): string => {
    return state
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="text-black font-medium">Loading orders...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-black mb-4">Error Loading Orders</h1>
              <p className="text-red-600 mb-8">{error.message}</p>
              <Link
                href="/products"
                className="inline-block rounded-md bg-blue-700 px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-800 transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Handle case where customer is not logged in
  if (data && !data.activeCustomer) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-black mb-4">Please Log In</h1>
              <p className="text-black mb-8">You must be logged in to view your order history.</p>
              <Link
                href="/login"
                className="inline-block rounded-md bg-blue-700 px-4 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-800 transition-colors"
              >
                Log In
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const orders = data?.activeCustomer?.orders?.items || [];
  const totalItems = data?.activeCustomer?.orders?.totalItems || 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  if (orders.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-black mb-4">No Orders Found</h1>
              <p className="text-black mb-8">You haven't placed any orders yet.</p>
              <Link
                href="/products"
                className="inline-block rounded-md bg-blue-700 px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-800 transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-black mb-8">Order History</h1>

          {totalPages > 1 && (
            <div className="mb-4 text-sm text-gray-600">
              Showing {page * ITEMS_PER_PAGE + 1} - {Math.min((page + 1) * ITEMS_PER_PAGE, totalItems)} of {totalItems} orders
            </div>
          )}

          <div className="space-y-4">
            {orders.map((order) => {
              const firstLine = order.lines[0];
              const product = firstLine?.productVariant?.product;
              const imageUrl = product?.featuredAsset?.preview;

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-blue-500 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex gap-4 flex-1">
                      {imageUrl && (
                        <div className="flex-shrink-0">
                          <div className="w-20 h-20 overflow-hidden rounded-lg bg-blue-50 border border-blue-200">
                            <Image
                              src={imageUrl}
                              alt={product?.name || 'Product'}
                              width={80}
                              height={80}
                              className="h-full w-full object-cover object-center"
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h2 className="text-lg font-semibold text-black">Order {order.code}</h2>
                            <p className="text-sm text-gray-600">{formatDate(order.orderPlacedAt)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-black">{formatCurrency(order.totalWithTax, order.currencyCode)}</p>
                            <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                              {formatOrderState(order.state)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">
                          {order.lines.length} {order.lines.length === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Link
                        href={`/orders/${order.code}`}
                        className="inline-block rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-blue-800 transition-colors"
                      >
                        View Order
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-700">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
