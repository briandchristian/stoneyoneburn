/**
 * Order Detail Page
 *
 * Displays complete information for a specific order including:
 * - Order summary (code, date, status, totals)
 * - Order items with product details
 * - Shipping and billing addresses
 * - Payment information
 * - Fulfillment information (if available)
 */

'use client';

import { useQuery } from '@apollo/client';
import { useParams } from 'next/navigation';
import { GET_ORDER_BY_CODE } from '@/graphql/queries';
import { Header } from '@/components/Header';
import Link from 'next/link';
import Image from 'next/image';

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

interface ShippingLine {
  id: string;
  shippingMethod: {
    id: string;
    name: string;
    code: string;
    description?: string;
  };
  price: number;
  priceWithTax: number;
}

interface Payment {
  id: string;
  state: string;
  method: string;
  amount: number;
  transactionId?: string;
  createdAt: string;
}

interface Fulfillment {
  id: string;
  state: string;
  method: string;
  trackingCode?: string;
  createdAt: string;
  updatedAt: string;
}

interface Address {
  fullName: string;
  company?: string | null;
  streetLine1: string;
  streetLine2?: string | null;
  city: string;
  province?: string | null;
  postalCode: string;
  countryCode: string;
  phoneNumber?: string | null;
}

interface Order {
  id: string;
  code: string;
  state: string;
  orderPlacedAt: string;
  createdAt: string;
  updatedAt: string;
  total: number;
  totalWithTax: number;
  subTotal: number;
  subTotalWithTax: number;
  shipping: number;
  shippingWithTax: number;
  currencyCode: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    emailAddress: string;
  };
  shippingAddress: Address;
  billingAddress: Address;
  lines: OrderLine[];
  shippingLines: ShippingLine[];
  payments: Payment[];
  fulfillments: Fulfillment[];
}

interface OrderData {
  orderByCode: Order | null;
}

export default function OrderDetailPage() {
  const params = useParams();
  const orderCode = params?.code as string;

  const { data, loading, error } = useQuery<OrderData>(GET_ORDER_BY_CODE, {
    variables: {
      code: orderCode,
    },
    skip: !orderCode || !GET_ORDER_BY_CODE, // Skip if query is undefined or orderCode is missing
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all', // Return both data and errors to prevent error propagation
  });

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  const formatAddress = (address: Address): string => {
    const parts = [
      address.streetLine1,
      address.streetLine2,
      `${address.city}${address.province ? `, ${address.province}` : ''} ${address.postalCode}`,
      address.countryCode,
    ].filter(Boolean);
    return parts.join('\n');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="text-black font-medium">Loading order...</p>
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
              <h1 className="text-3xl font-bold text-black mb-4">Error Loading Order</h1>
              <p className="text-red-600 mb-8">{error.message}</p>
              <Link
                href="/orders"
                className="inline-block rounded-md bg-blue-700 px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-800 transition-colors"
              >
                Back to Orders
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const order = data?.orderByCode;

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-black mb-4">Order Not Found</h1>
              <p className="text-black mb-8">The order you're looking for doesn't exist.</p>
              <Link
                href="/orders"
                className="inline-block rounded-md bg-blue-700 px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-800 transition-colors"
              >
                Back to Orders
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
          <div className="mb-6">
            <Link
              href="/orders"
              className="text-blue-700 hover:text-blue-800 font-medium"
            >
              ← Back to Orders
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">Order {order.code}</h1>
            <p className="text-gray-600">Placed on {formatDate(order.orderPlacedAt)}</p>
            <span className="inline-block mt-2 px-3 py-1 text-sm font-medium rounded bg-blue-100 text-blue-800">
              {formatOrderState(order.state)}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6 mb-6">
                <h2 className="text-xl font-bold text-black mb-4">Order Items</h2>
                <div className="space-y-4">
                  {order.lines.map((line) => {
                    const product = line.productVariant.product;
                    const imageUrl = product.featuredAsset?.preview;

                    return (
                      <div key={line.id} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0">
                        {imageUrl && (
                          <div className="flex-shrink-0">
                            <div className="w-20 h-20 overflow-hidden rounded-lg bg-blue-50 border border-blue-200">
                              <Image
                                src={imageUrl}
                                alt={product.name}
                                width={80}
                                height={80}
                                className="h-full w-full object-cover object-center"
                              />
                            </div>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-black">{product.name}</h3>
                          <p className="text-sm text-gray-600">{line.productVariant.name}</p>
                          <p className="text-sm text-gray-600">SKU: {line.productVariant.sku}</p>
                          <p className="text-sm text-gray-600 mt-1">Quantity: {line.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-black">
                            {formatCurrency(line.linePriceWithTax, order.currencyCode)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatCurrency(line.unitPriceWithTax, order.currencyCode)} each
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shipping Information */}
              {order.shippingLines.length > 0 && (
                <div className="bg-white rounded-lg border-2 border-gray-200 p-6 mb-6">
                  <h2 className="text-xl font-bold text-black mb-4">Shipping Method</h2>
                  {order.shippingLines.map((shippingLine) => (
                    <div key={shippingLine.id}>
                      <p className="font-semibold text-black">{shippingLine.shippingMethod.name}</p>
                      {shippingLine.shippingMethod.description && (
                        <p className="text-sm text-gray-600">{shippingLine.shippingMethod.description}</p>
                      )}
                      <p className="text-black mt-2">
                        {formatCurrency(shippingLine.priceWithTax, order.currencyCode)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Fulfillment Information */}
              {order.fulfillments.length > 0 && (
                <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-black mb-4">Fulfillment</h2>
                  {order.fulfillments.map((fulfillment) => (
                    <div key={fulfillment.id} className="mb-4 last:mb-0">
                      <p className="font-semibold text-black">
                        Status: {formatOrderState(fulfillment.state)}
                      </p>
                      {fulfillment.trackingCode && (
                        <p className="text-sm text-gray-600">Tracking: {fulfillment.trackingCode}</p>
                      )}
                      <p className="text-sm text-gray-600">
                        Updated: {formatDate(fulfillment.updatedAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order Summary & Addresses */}
            <div className="lg:col-span-1">
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200 mb-6">
                <h2 className="text-xl font-bold text-black mb-4">Order Summary</h2>
                <div className="space-y-2">
                  <div className="flex justify-between text-black">
                    <span>Subtotal</span>
                    <span>{formatCurrency(order.subTotalWithTax, order.currencyCode)}</span>
                  </div>
                  {order.shippingWithTax > 0 && (
                    <div className="flex justify-between text-black">
                      <span>Shipping</span>
                      <span>{formatCurrency(order.shippingWithTax, order.currencyCode)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 pt-2 mt-2">
                    <div className="flex justify-between text-xl font-bold text-black">
                      <span>Total</span>
                      <span>{formatCurrency(order.totalWithTax, order.currencyCode)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6 mb-6">
                <h2 className="text-xl font-bold text-black mb-4">Shipping Address</h2>
                <div className="text-sm text-gray-700 whitespace-pre-line">
                  {order.shippingAddress.fullName}
                  {order.shippingAddress.company && `\n${order.shippingAddress.company}`}
                  {`\n${formatAddress(order.shippingAddress)}`}
                  {order.shippingAddress.phoneNumber && `\n${order.shippingAddress.phoneNumber}`}
                </div>
              </div>

              {/* Billing Address */}
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6 mb-6">
                <h2 className="text-xl font-bold text-black mb-4">Billing Address</h2>
                <div className="text-sm text-gray-700 whitespace-pre-line">
                  {order.billingAddress.fullName}
                  {order.billingAddress.company && `\n${order.billingAddress.company}`}
                  {`\n${formatAddress(order.billingAddress)}`}
                  {order.billingAddress.phoneNumber && `\n${order.billingAddress.phoneNumber}`}
                </div>
              </div>

              {/* Payment Information */}
              {order.payments.length > 0 && (
                <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-black mb-4">Payment</h2>
                  {order.payments.map((payment) => (
                    <div key={payment.id}>
                      <p className="font-semibold text-black">
                        Status: {formatOrderState(payment.state)}
                      </p>
                      <p className="text-sm text-gray-600">Method: {payment.method}</p>
                      <p className="text-sm text-gray-600">
                        Amount: {formatCurrency(payment.amount, order.currencyCode)}
                      </p>
                      {payment.transactionId && (
                        <p className="text-sm text-gray-600">Transaction: {payment.transactionId}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
