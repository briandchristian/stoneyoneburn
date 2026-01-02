/**
 * Shopping Cart Page
 *
 * Displays the current shopping cart (active order) with the following functionality:
 * - View all items in the cart
 * - Adjust quantities of cart items
 * - Remove items from the cart
 * - Display cart totals (subtotal, shipping, tax, total)
 * - Navigate to checkout
 * - Show empty cart state when cart is empty
 *
 * Uses Vendure's activeOrder query to fetch cart data and mutations to modify the cart.
 */

'use client';

import { useQuery, useMutation } from '@apollo/client';
import { GET_ACTIVE_ORDER, ADJUST_ORDER_LINE, REMOVE_ORDER_LINE } from '@/graphql/queries';
import { Header } from '@/components/Header';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

interface OrderLine {
  id: string;
  quantity: number;
  unitPrice: number;
  unitPriceWithTax: number;
  linePrice: number;
  linePriceWithTax: number;
  productVariant: {
    id: string;
    name: string;
    sku: string;
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

interface ActiveOrder {
  activeOrder?: {
    id: string;
    code: string;
    state: string;
    total: number;
    totalWithTax: number;
    currencyCode: string;
    lines: OrderLine[];
    shippingWithTax?: number;
  };
}

export default function CartPage() {
  const [adjustingQuantities, setAdjustingQuantities] = useState<Set<string>>(new Set());
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());

  const { data, loading, error } = useQuery<ActiveOrder>(GET_ACTIVE_ORDER, {
    fetchPolicy: 'cache-and-network',
  });

  const [adjustOrderLine] = useMutation(ADJUST_ORDER_LINE, {
    refetchQueries: ['GetActiveOrder'],
    awaitRefetchQueries: true,
  });

  const [removeOrderLine] = useMutation(REMOVE_ORDER_LINE, {
    refetchQueries: ['GetActiveOrder'],
    awaitRefetchQueries: true,
  });

  const handleQuantityChange = async (orderLineId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      return;
    }

    setAdjustingQuantities((prev) => new Set(prev).add(orderLineId));
    try {
      await adjustOrderLine({
        variables: { orderLineId, quantity: newQuantity },
      });
    } catch (err) {
      console.error('Error adjusting quantity:', err);
    } finally {
      setAdjustingQuantities((prev) => {
        const next = new Set(prev);
        next.delete(orderLineId);
        return next;
      });
    }
  };

  const handleRemoveItem = async (orderLineId: string) => {
    setRemovingItems((prev) => new Set(prev).add(orderLineId));
    try {
      await removeOrderLine({
        variables: { orderLineId },
      });
    } catch (err) {
      console.error('Error removing item:', err);
    } finally {
      setRemovingItems((prev) => {
        const next = new Set(prev);
        next.delete(orderLineId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="text-black font-medium">Loading cart...</p>
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
            <p className="text-red-700 font-semibold">Error loading cart: {error.message}</p>
          </div>
        </main>
      </div>
    );
  }

  const order = data?.activeOrder;
  const lines = order?.lines || [];
  const isEmpty = lines.length === 0;

  if (isEmpty) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-black mb-4">Your cart is empty</h1>
              <p className="text-black mb-8">Start shopping to add items to your cart.</p>
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

  const currencyCode = order?.currencyCode || 'USD';
  const subtotalWithTax = lines.reduce((sum, line) => sum + line.linePriceWithTax, 0);
  const shipping = order?.shippingWithTax || 0;
  const total = order?.totalWithTax || subtotalWithTax + shipping;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-black mb-8">Shopping Cart</h1>

          <div className="lg:grid lg:grid-cols-12 lg:gap-x-12">
            {/* Cart Items */}
            <div className="lg:col-span-8">
              <div className="space-y-4">
                {lines.map((line) => {
                  const isAdjusting = adjustingQuantities.has(line.id);
                  const isRemoving = removingItems.has(line.id);
                  const product = line.productVariant.product;
                  const imageUrl = product.featuredAsset?.preview;

                  return (
                    <div
                      key={line.id}
                      className="flex flex-col sm:flex-row gap-4 border-b border-gray-200 pb-4"
                    >
                      {/* Product Image */}
                      {imageUrl && (
                        <div className="flex-shrink-0">
                          <Link href={`/products/${product.slug}`}>
                            <div className="w-24 h-24 sm:w-32 sm:h-32 overflow-hidden rounded-lg bg-blue-50 border-2 border-blue-200">
                              <Image
                                src={imageUrl}
                                alt={product.name}
                                width={128}
                                height={128}
                                className="h-full w-full object-cover object-center"
                              />
                            </div>
                          </Link>
                        </div>
                      )}

                      {/* Product Details */}
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1">
                          <Link
                            href={`/products/${product.slug}`}
                            className="text-lg font-semibold text-black hover:text-blue-700"
                          >
                            {product.name}
                          </Link>
                          <p className="text-sm text-gray-600 mt-1">
                            {line.productVariant.name} • SKU: {line.productVariant.sku}
                          </p>
                          <p className="text-base font-semibold text-blue-700 mt-2">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: currencyCode,
                            }).format(line.unitPriceWithTax / 100)}
                          </p>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center border border-gray-300 rounded-md">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(line.id, line.quantity - 1)}
                              disabled={isAdjusting || isRemoving || line.quantity <= 1}
                              className="px-3 py-1 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e) => {
                                const newQuantity = parseInt(e.target.value, 10);
                                if (!isNaN(newQuantity) && newQuantity >= 1) {
                                  handleQuantityChange(line.id, newQuantity);
                                }
                              }}
                              disabled={isAdjusting || isRemoving}
                              className="px-4 py-1 text-black font-medium min-w-[3rem] text-center border-0 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              aria-label="Quantity"
                            />
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(line.id, line.quantity + 1)}
                              disabled={isAdjusting || isRemoving}
                              className="px-3 py-1 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              +
                            </button>
                          </div>

                          {/* Line Total */}
                          <div className="text-right min-w-[100px]">
                            <p className="text-lg font-bold text-black">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: currencyCode,
                              }).format(line.linePriceWithTax / 100)}
                            </p>
                          </div>

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(line.id)}
                            disabled={isRemoving}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Remove item"
                          >
                            {isRemoving ? '...' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-4 mt-8 lg:mt-0">
              <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
                <h2 className="text-xl font-bold text-black mb-4">Order Summary</h2>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-black">
                    <span>Subtotal</span>
                    <span>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currencyCode,
                      }).format(subtotalWithTax / 100)}
                    </span>
                  </div>
                  {shipping > 0 && (
                    <div className="flex justify-between text-black">
                      <span>Shipping</span>
                      <span>
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: currencyCode,
                        }).format(shipping / 100)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 pt-3 mt-3">
                    <div className="flex justify-between text-xl font-bold text-black">
                      <span>Total</span>
                      <span>
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: currencyCode,
                        }).format(total / 100)}
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  href="/checkout"
                  className="block w-full text-center rounded-md bg-blue-700 px-4 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition-colors"
                >
                  Proceed to Checkout
                </Link>

                <Link
                  href="/products"
                  className="block w-full text-center mt-3 text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
