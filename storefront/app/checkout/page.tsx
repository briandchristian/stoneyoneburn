/**
 * Checkout Page
 *
 * Multi-step checkout process for completing an order.
 *
 * Features:
 * - Shipping address collection
 * - Billing address collection (with option to use same as shipping)
 * - Shipping method selection
 * - Payment processing
 * - Order summary display
 * - Order completion and confirmation
 *
 * Flow:
 * 1. Verify cart is not empty
 * 2. Collect shipping address
 * 3. Select shipping method
 * 4. Collect billing address (or use shipping address)
 * 5. Process payment
 * 6. Complete order
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { apolloClient } from '@/lib/apollo-client';
import {
  GET_ACTIVE_ORDER,
  GET_ELIGIBLE_SHIPPING_METHODS,
  SET_ORDER_SHIPPING_ADDRESS,
  SET_ORDER_BILLING_ADDRESS,
  SET_ORDER_SHIPPING_METHOD,
  ADD_PAYMENT_TO_ORDER,
  TRANSITION_ORDER_TO_STATE,
} from '@/graphql/queries';
import { Header } from '@/components/Header';
import { AddressForm, AddressInput } from '@/components/AddressForm';
import Link from 'next/link';
import Image from 'next/image';

type CheckoutStep = 'shipping' | 'shipping-method' | 'billing' | 'payment' | 'complete';

interface ShippingMethod {
  id: string;
  name: string;
  code: string;
  description?: string;
  price: number;
  priceWithTax: number;
  metadata?: Record<string, unknown>;
}

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

export default function CheckoutPage() {
  const [step, setStep] = useState<CheckoutStep>('shipping');
  const [shippingAddress, setShippingAddressState] = useState<AddressInput | null>(null);
  const [useSameBillingAddress, setUseSameBillingAddress] = useState(true);
  const [, setBillingAddressState] = useState<AddressInput | null>(null);
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: orderData, loading: orderLoading } = useQuery(GET_ACTIVE_ORDER, {
    fetchPolicy: 'cache-and-network',
  });

  const { data: shippingMethodsData, loading: shippingMethodsLoading } = useQuery(
    GET_ELIGIBLE_SHIPPING_METHODS,
    {
      skip: step !== 'shipping-method',
    }
  );

  const [setShippingAddressMutation] = useMutation(SET_ORDER_SHIPPING_ADDRESS, {
    refetchQueries: ['GetActiveOrder'],
    awaitRefetchQueries: true,
  });

  const [setBillingAddressMutation] = useMutation(SET_ORDER_BILLING_ADDRESS, {
    refetchQueries: ['GetActiveOrder'],
    awaitRefetchQueries: true,
  });

  const [setShippingMethod] = useMutation(SET_ORDER_SHIPPING_METHOD, {
    refetchQueries: ['GetActiveOrder'],
    awaitRefetchQueries: true,
  });

  const [addPayment] = useMutation(ADD_PAYMENT_TO_ORDER, {
    refetchQueries: ['GetActiveOrder'],
    awaitRefetchQueries: true,
  });
  const [transitionOrder] = useMutation(TRANSITION_ORDER_TO_STATE, {
    refetchQueries: ['GetActiveOrder'],
    awaitRefetchQueries: true,
  });

  if (orderLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="text-black font-medium">Loading checkout...</p>
          </div>
        </main>
      </div>
    );
  }

  const order = orderData?.activeOrder;
  const lines = order?.lines || [];

  if (!order || lines.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-black mb-4">Your cart is empty</h1>
              <p className="text-black mb-8">Add items to your cart before checkout.</p>
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
  const subtotalWithTax = lines.reduce((sum: number, line: OrderLine) => sum + line.linePriceWithTax, 0);
  const shipping = order?.shippingWithTax || 0;
  const total = order?.totalWithTax || subtotalWithTax + shipping;

  const handleShippingAddressSubmit = async (address: AddressInput) => {
    try {
      setErrors({});
      await setShippingAddressMutation({
        variables: { input: address },
      });
      setShippingAddressState(address);
      setStep('shipping-method');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set shipping address';
      setErrors({ shipping: errorMessage });
    }
  };

  const handleShippingMethodSelect = async (methodId: string) => {
    try {
      setErrors({});
      await setShippingMethod({
        variables: { shippingMethodId: [methodId] },
      });
      setSelectedShippingMethodId(methodId);
      setStep('billing');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set shipping method';
      setErrors({ shippingMethod: errorMessage });
    }
  };

  const handleBillingAddressSubmit = async (address: AddressInput) => {
    try {
      setErrors({});
      const addressToUse = useSameBillingAddress && shippingAddress ? shippingAddress : address;
      await setBillingAddressMutation({
        variables: { input: addressToUse },
      });
      setBillingAddressState(addressToUse);
      setStep('payment');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set billing address';
      setErrors({ billing: errorMessage });
    }
  };

  const handlePaymentSubmit = async () => {
    try {
      setErrors({});
      // For now, we'll use a test payment method
      // In production, integrate with Stripe or another payment provider
      await addPayment({
        variables: {
          input: {
            method: 'standard-payment',
            metadata: {},
          },
        },
      });

      // Transition order to ArrangingPayment state
      await transitionOrder({
        variables: { state: 'ArrangingPayment' },
      });

      // Clear the Apollo cache for activeOrder after checkout completes
      // This ensures the cart is empty when navigating back to other pages
      // The order is now complete, so activeOrder should be null
      await apolloClient.refetchQueries({
        include: ['GetActiveOrder'],
      });

      setStep('complete');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setErrors({ payment: errorMessage });
    }
  };

  const shippingMethods = shippingMethodsData?.eligibleShippingMethods || [];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-black mb-8">Checkout</h1>

          <div className="lg:grid lg:grid-cols-12 lg:gap-x-12">
            {/* Checkout Form */}
            <div className="lg:col-span-8">
              {/* Step Indicator */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div className={`flex items-center ${step === 'shipping' ? 'text-blue-700' : 'text-gray-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'shipping' ? 'bg-blue-700 text-white' : 'bg-gray-300'}`}>
                      1
                    </div>
                    <span className="ml-2 font-medium">Shipping</span>
                  </div>
                  <div className={`flex items-center ${step === 'shipping-method' ? 'text-blue-700' : step === 'billing' || step === 'payment' || step === 'complete' ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'shipping-method' ? 'bg-blue-700 text-white' : step === 'billing' || step === 'payment' || step === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>
                      2
                    </div>
                    <span className="ml-2 font-medium">Shipping Method</span>
                  </div>
                  <div className={`flex items-center ${step === 'billing' ? 'text-blue-700' : step === 'payment' || step === 'complete' ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'billing' ? 'bg-blue-700 text-white' : step === 'payment' || step === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>
                      3
                    </div>
                    <span className="ml-2 font-medium">Billing</span>
                  </div>
                  <div className={`flex items-center ${step === 'payment' ? 'text-blue-700' : step === 'complete' ? 'text-green-600' : 'text-gray-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'payment' ? 'bg-blue-700 text-white' : step === 'complete' ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>
                      4
                    </div>
                    <span className="ml-2 font-medium">Payment</span>
                  </div>
                </div>
              </div>

              {/* Shipping Address Step */}
              {step === 'shipping' && (
                <div>
                  <AddressForm
                    title="Shipping Address"
                    onSubmit={handleShippingAddressSubmit}
                    errors={{}}
                  />
                  {errors.shipping && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">{errors.shipping}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Shipping Method Step */}
              {step === 'shipping-method' && (
                <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-black mb-4">Select Shipping Method</h2>
                  {shippingMethodsLoading ? (
                    <p className="text-black">Loading shipping methods...</p>
                  ) : shippingMethods.length === 0 ? (
                    <p className="text-black">No shipping methods available.</p>
                  ) : (
                    <div className="space-y-3">
                      {shippingMethods.map((method: ShippingMethod) => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => handleShippingMethodSelect(method.id)}
                          className={`w-full text-left p-4 border-2 rounded-lg transition-colors ${
                            selectedShippingMethodId === method.id
                              ? 'border-blue-700 bg-blue-50'
                              : 'border-gray-300 hover:border-blue-500'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-black">{method.name}</p>
                              {method.description && (
                                <p className="text-sm text-gray-600 mt-1">{method.description}</p>
                              )}
                            </div>
                            <p className="font-bold text-black">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: currencyCode,
                              }).format(method.priceWithTax / 100)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {errors.shippingMethod && (
                    <p className="mt-4 text-sm text-red-700">{errors.shippingMethod}</p>
                  )}
                </div>
              )}

              {/* Billing Address Step */}
              {step === 'billing' && (
                <div>
                  <div className="bg-white rounded-lg border-2 border-gray-200 p-6 mb-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={useSameBillingAddress}
                        onChange={(e) => setUseSameBillingAddress(e.target.checked)}
                        className="rounded border-gray-300 text-blue-700 focus:ring-blue-700"
                      />
                      <span className="ml-2 text-black">Use same address for billing</span>
                    </label>
                  </div>
                  {!useSameBillingAddress && (
                    <div>
                      <AddressForm
                        title="Billing Address"
                        onSubmit={handleBillingAddressSubmit}
                        errors={{}}
                      />
                      {errors.billing && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-700">{errors.billing}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {useSameBillingAddress && (
                    <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                      <h2 className="text-xl font-bold text-black mb-4">Billing Address</h2>
                      <p className="text-black mb-4">Using same address as shipping address.</p>
                      {errors.billing && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-700">{errors.billing}</p>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (shippingAddress) {
                            handleBillingAddressSubmit(shippingAddress);
                          }
                        }}
                        disabled={!shippingAddress}
                        className="w-full rounded-md bg-blue-700 px-4 py-2 text-base font-semibold text-white shadow-lg hover:bg-blue-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        Continue
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Step */}
              {step === 'payment' && (
                <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-black mb-4">Payment</h2>
                  <p className="text-black mb-4">
                    Payment integration with Stripe will be implemented here.
                    For now, this is a placeholder for payment processing.
                  </p>
                  <button
                    type="button"
                    onClick={handlePaymentSubmit}
                    className="w-full rounded-md bg-blue-700 px-4 py-2 text-base font-semibold text-white shadow-lg hover:bg-blue-800 transition-colors"
                  >
                    Complete Order
                  </button>
                  {errors.payment && (
                    <p className="mt-4 text-sm text-red-700">{errors.payment}</p>
                  )}
                </div>
              )}

              {/* Complete Step */}
              {step === 'complete' && (
                <div className="bg-white rounded-lg border-2 border-gray-200 p-6 text-center">
                  <h2 className="text-2xl font-bold text-black mb-4">Order Placed Successfully!</h2>
                  <p className="text-black mb-4">Thank you for your order.</p>
                  <p className="text-black mb-6">Order Code: {order.code}</p>
                  <Link
                    href="/products"
                    className="inline-block rounded-md bg-blue-700 px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-800 transition-colors"
                  >
                    Continue Shopping
                  </Link>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-4 mt-8 lg:mt-0">
              <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200 sticky top-4">
                <h2 className="text-xl font-bold text-black mb-4">Order Summary</h2>

                {/* Order Items */}
                <div className="space-y-3 mb-4">
                  {lines.map((line: OrderLine) => {
                    const product = line.productVariant.product;
                    const imageUrl = product.featuredAsset?.preview;

                    return (
                      <div key={line.id} className="flex gap-3">
                        {imageUrl && (
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 overflow-hidden rounded-lg bg-blue-50 border border-blue-200">
                              <Image
                                src={imageUrl}
                                alt={product.name}
                                width={64}
                                height={64}
                                className="h-full w-full object-cover object-center"
                              />
                            </div>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-black truncate">{product.name}</p>
                          <p className="text-xs text-gray-600">Qty: {line.quantity}</p>
                          <p className="text-sm font-semibold text-black">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: currencyCode,
                            }).format(line.linePriceWithTax / 100)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-gray-300 pt-4 space-y-2">
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
                  <div className="border-t border-gray-300 pt-2 mt-2">
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
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
