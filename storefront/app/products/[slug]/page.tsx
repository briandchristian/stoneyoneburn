/**
 * Product Detail Page
 *
 * Displays detailed information about a single product with add to cart functionality.
 * Features:
 * - Product details, images, pricing
 * - Add to cart with quantity selection
 * - Stock level display
 * - User feedback on add to cart actions
 */

'use client';

import { useQuery, useMutation } from '@apollo/client';
import {
  GET_PRODUCT_BY_SLUG,
  ADD_ITEM_TO_ORDER,
  GET_ACTIVE_ORDER,
  TRANSITION_ORDER_TO_STATE,
} from '@/graphql/queries';
import { apolloClient } from '@/lib/apollo-client';
import { Header } from '@/components/Header';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';

interface ProductVariant {
  id: string;
  name: string;
  currencyCode: string;
  price: number;
  priceWithTax: number;
  sku: string;
  stockLevel: string;
  options: Array<{
    id: string;
    code: string;
    name: string;
  }>;
}

interface ProductData {
  product?: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    featuredAsset?: {
      id: string;
      preview: string;
    };
    assets?: Array<{
      id: string;
      preview: string;
      name: string;
    }>;
    variants: ProductVariant[];
    facetValues: Array<{
      id: string;
      name: string;
      facet: {
        id: string;
        name: string;
      };
    }>;
  };
}

interface ActiveOrderData {
  activeOrder?: { id: string; state: string } | null;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addToCartError, setAddToCartError] = useState<string | null>(null);

  const { data, loading, error } = useQuery<ProductData>(GET_PRODUCT_BY_SLUG, {
    variables: { slug },
  });

  const { data: orderData } = useQuery<ActiveOrderData>(GET_ACTIVE_ORDER, {
    fetchPolicy: 'cache-and-network',
  });

  const [addItemToOrder] = useMutation(ADD_ITEM_TO_ORDER, {
    refetchQueries: [{ query: GET_ACTIVE_ORDER }],
    awaitRefetchQueries: true,
  });

  const [transitionOrder] = useMutation(TRANSITION_ORDER_TO_STATE, {
    refetchQueries: [{ query: GET_ACTIVE_ORDER }],
    awaitRefetchQueries: true,
  });

  const activeOrder = orderData?.activeOrder;
  const canAddToCart =
    !activeOrder || activeOrder.state === 'AddingItems';
  const orderLockedMessage =
    activeOrder &&
    activeOrder.state !== 'AddingItems' &&
    'Your cart has moved to checkout. Complete your purchase or clear your cart to add more items.';

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="text-black font-medium">Loading product...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !data?.product) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="text-red-700 font-semibold">
              {error ? `Error: ${error.message}` : 'Product not found'}
            </p>
          </div>
        </main>
      </div>
    );
  }

  const product = data.product;
  const variant = product.variants?.[0];
  const price = variant?.priceWithTax || variant?.price || 0;
  const currencyCode = variant?.currencyCode || 'USD';

  const performAddToCart = async () => {
    if (!variant) return;
    const result = await addItemToOrder({
      variables: { productVariantId: variant.id, quantity },
    });
    return result.data?.addItemToOrder;
  };

  const handleAddToCart = async () => {
    if (!variant || variant.stockLevel !== 'IN_STOCK') return;
    if (!canAddToCart) {
      setAddToCartError(orderLockedMessage || 'Your cart is in checkout. Go to checkout or clear your cart first.');
      return;
    }

    setIsAddingToCart(true);
    setAddToCartError(null);

    try {
      const addItemResult = await performAddToCart();

      if (addItemResult?.__typename === 'Order') {
        router.push('/cart');
        return;
      }

      if (addItemResult && 'message' in addItemResult) {
        const msg = (addItemResult as { message?: string }).message || 'Failed to add item to cart';
        setAddToCartError(msg);
      } else {
        setAddToCartError('Failed to add item to cart');
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { graphQLErrors?: Array<{ message?: string }> })?.graphQLErrors?.[0]?.message ??
            'Failed to add item to cart';
      setAddToCartError(String(msg));
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleClearCartAndAdd = async () => {
    if (!variant || variant.stockLevel !== 'IN_STOCK' || !activeOrder) return;

    setIsAddingToCart(true);
    setAddToCartError(null);

    try {
      const transitionResult = await transitionOrder({ variables: { state: 'Cancelled' } });
      const transitionData = transitionResult.data?.transitionOrderToState as
        | { __typename?: string; message?: string }
        | undefined;

      if (transitionData?.__typename && transitionData.__typename !== 'Order') {
        setAddToCartError(
          (transitionData.message as string) ||
            'Could not clear cart. Please complete or abandon checkout first.'
        );
        return;
      }

      await apolloClient.refetchQueries({ include: ['GetActiveOrder'] });
      const addItemResult = await performAddToCart();

      if (addItemResult?.__typename === 'Order') {
        router.push('/cart');
        return;
      }

      if (addItemResult && 'message' in addItemResult) {
        setAddToCartError((addItemResult as { message?: string }).message || 'Failed to add item to cart');
      } else {
        setAddToCartError('Failed to add item to cart');
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : (err as { graphQLErrors?: Array<{ message?: string }> })?.graphQLErrors?.[0]?.message;
      setAddToCartError(msg ? String(msg) : 'Could not clear cart. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
            {/* Product Images */}
            <div className="mt-10 lg:mt-0">
              {product.featuredAsset?.preview && (
                <div className="aspect-square w-full overflow-hidden rounded-lg bg-blue-50 border-2 border-blue-200">
                  <Image
                    src={product.featuredAsset.preview}
                    alt={product.name}
                    width={600}
                    height={600}
                    className="h-full w-full object-cover object-center"
                  />
                </div>
              )}
              {product.assets && product.assets.length > 1 && (
                <div className="mt-4 grid grid-cols-4 gap-4">
                  {product.assets.slice(1, 5).map((asset) => (
                    <div
                      key={asset.id}
                      className="aspect-square w-full overflow-hidden rounded-lg bg-blue-50 border-2 border-blue-200"
                    >
                      <Image
                        src={asset.preview}
                        alt={asset.name}
                        width={150}
                        height={150}
                        className="h-full w-full object-cover object-center"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="mt-10 lg:mt-0">
              <h1 className="text-3xl font-bold tracking-tight text-black">
                {product.name}
              </h1>

              {product.description && (
                <div className="mt-4">
                  <p className="text-base text-black leading-relaxed">{product.description}</p>
                </div>
              )}

              <div className="mt-6">
                <p className="text-3xl font-bold text-blue-700">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currencyCode,
                  }).format(price / 100)}
                </p>
              </div>

              {variant && (
                <div className="mt-6">
                  <p className="text-sm font-medium text-black">SKU: <span className="font-normal">{variant.sku}</span></p>
                  <p className="text-sm font-medium text-black">
                    Stock: <span className={variant.stockLevel === 'IN_STOCK' ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                      {variant.stockLevel === 'IN_STOCK' ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </p>
                </div>
              )}

              {variant && variant.stockLevel === 'IN_STOCK' && (
                <div className="mt-6">
                  <label htmlFor="quantity" className="block text-sm font-medium text-black mb-2">
                    Quantity
                  </label>
                  <div className="inline-flex items-center border-2 border-blue-400 rounded-md bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-800 hover:bg-blue-200 active:bg-blue-300 disabled:bg-gray-100 disabled:text-gray-400 transition-colors font-bold text-lg leading-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed rounded-l-md"
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      id="quantity"
                      min="1"
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1) {
                          setQuantity(val);
                        } else if (e.target.value === '') {
                          // Allow empty temporarily for editing
                          setQuantity(1);
                        }
                      }}
                      onBlur={(e) => {
                        // Ensure valid value on blur
                        const val = parseInt(e.target.value, 10);
                        if (isNaN(val) || val < 1) {
                          setQuantity(1);
                        }
                      }}
                      className="w-16 h-10 px-2 text-center text-black bg-white border-0 border-l-2 border-r-2 border-blue-300 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      aria-label="Quantity"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-800 hover:bg-blue-200 active:bg-blue-300 transition-colors font-bold text-lg leading-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-r-md"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-10">
                {orderLockedMessage ? (
                  <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-medium text-amber-900">{orderLockedMessage}</p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Link
                        href="/checkout"
                        className="inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-800"
                      >
                        Go to checkout
                      </Link>
                      <button
                        type="button"
                        onClick={handleClearCartAndAdd}
                        disabled={isAddingToCart}
                        className="inline-flex rounded-md border-2 border-amber-600 bg-white px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                      >
                        {isAddingToCart ? 'Clearing cart…' : 'Clear cart and add this item'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="w-full rounded-md bg-blue-700 px-4 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={!variant || variant.stockLevel !== 'IN_STOCK' || isAddingToCart}
                  >
                    {isAddingToCart
                      ? 'Adding to Cart...'
                      : variant && variant.stockLevel === 'IN_STOCK'
                        ? 'Add to Cart'
                        : 'Out of Stock'}
                  </button>
                )}
                {addToCartError && (
                  <p className="mt-2 text-sm text-red-700">{addToCartError}</p>
                )}
              </div>

              {product.facetValues && product.facetValues.length > 0 && (
                <div className="mt-10">
                  <h2 className="text-lg font-bold text-black">Details</h2>
                  <dl className="mt-4 space-y-2">
                    {product.facetValues.map((facetValue) => (
                      <div key={facetValue.id} className="flex">
                        <dt className="text-sm font-semibold text-black">
                          {facetValue.facet.name}:
                        </dt>
                        <dd className="ml-2 text-sm text-black">{facetValue.name}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

