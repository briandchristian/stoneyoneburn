/**
 * Register as Seller Page
 *
 * Phase 2.2: Seller Registration & Onboarding
 * Allows authenticated customers to register as marketplace sellers.
 *
 * Prerequisites:
 * - Customer must be authenticated (logged in)
 * - Customer must have verified email
 * - Customer must not already have a seller account
 *
 * Features:
 * - Shop name (required, 3-100 chars)
 * - Shop description (optional)
 * - Business name (optional)
 * - Redirect to shop-settings on success
 * - Redirect to login if not authenticated
 * - Redirect to shop-settings if already a seller
 */

'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_ACTIVE_CUSTOMER, GET_ACTIVE_SELLER, REGISTER_AS_SELLER } from '@/graphql/queries';
import { Header } from '@/components/Header';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface RegisterSellerInput {
  shopName: string;
  shopDescription?: string;
  businessName?: string;
}

interface RegisterAsSellerResult {
  registerAsSeller: {
    id: string;
    shopName: string;
    shopSlug: string;
    shopDescription?: string | null;
    verificationStatus: string;
    isActive: boolean;
  };
}

export default function RegisterSellerPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterSellerInput>({
    shopName: '',
    shopDescription: '',
    businessName: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: customerData } = useQuery(GET_ACTIVE_CUSTOMER, {
    fetchPolicy: 'cache-and-network',
  });

  const { data: sellerData } = useQuery(GET_ACTIVE_SELLER, {
    fetchPolicy: 'cache-and-network',
    skip: !customerData?.activeCustomer,
  });

  const [registerAsSeller, { loading }] = useMutation<RegisterAsSellerResult>(REGISTER_AS_SELLER, {
    refetchQueries: ['GetActiveSeller'],
    awaitRefetchQueries: true,
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (customerData && !customerData.activeCustomer) {
      router.push('/login');
    }
  }, [customerData, router]);

  // Redirect if already a seller
  useEffect(() => {
    if (sellerData?.activeSeller) {
      router.push('/seller/shop-settings');
    }
  }, [sellerData, router]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const shopName = formData.shopName.trim();
    if (!shopName) {
      newErrors.shopName = 'Shop name is required';
    } else if (shopName.length < 3) {
      newErrors.shopName = 'Shop name must be at least 3 characters';
    } else if (shopName.length > 100) {
      newErrors.shopName = 'Shop name must be 100 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    try {
      const result = await registerAsSeller({
        variables: {
          input: {
            shopName: formData.shopName.trim(),
            shopDescription: formData.shopDescription?.trim() || null,
            businessName: formData.businessName?.trim() || null,
          },
        },
      });

      if (result.data?.registerAsSeller) {
        router.push('/seller/shop-settings');
      }
    } catch (err: unknown) {
      const graphQLErrors = (err as { graphQLErrors?: Array<{ message?: string; extensions?: { code?: string } }> })
        ?.graphQLErrors;
      const message = graphQLErrors?.[0]?.message ?? (err instanceof Error ? err.message : 'Registration failed');
      const code = graphQLErrors?.[0]?.extensions?.code;

      if (code === 'SELLER_ALREADY_EXISTS') {
        setSubmitError('You already have a seller account.');
        setTimeout(() => router.push('/seller/shop-settings'), 2500);
      } else if (code === 'EMAIL_NOT_VERIFIED') {
        setSubmitError('Please verify your email address before registering as a seller.');
      } else if (code === 'CUSTOMER_NOT_AUTHENTICATED') {
        setSubmitError('Please log in to register as a seller.');
        setTimeout(() => router.push('/login'), 2500);
      } else {
        setSubmitError(message);
      }
    }
  };

  // Show nothing while checking auth (avoid flash)
  if (customerData && !customerData.activeCustomer) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="text-black font-medium">Redirecting to login...</p>
          </div>
        </main>
      </div>
    );
  }

  if (sellerData?.activeSeller) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="text-black font-medium">Redirecting to shop settings...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-black mb-2">Register as Seller</h1>
          <p className="text-gray-600 mb-8">
            Create your marketplace shop to start selling. You&apos;ll need to verify your account before listing products.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="shopName" className="block text-sm font-medium text-black mb-2">
                Shop Name <span className="text-red-600">*</span>
              </label>
              <input
                id="shopName"
                type="text"
                value={formData.shopName}
                onChange={(e) => setFormData((prev) => ({ ...prev, shopName: e.target.value }))}
                placeholder="e.g. My Awesome Shop"
                minLength={3}
                maxLength={100}
                className="w-full rounded-md border-2 border-gray-300 px-4 py-2 text-black focus:border-blue-700 focus:outline-none focus:ring-0"
                aria-invalid={!!errors.shopName}
                aria-describedby={errors.shopName ? 'shopName-error' : undefined}
              />
              {errors.shopName && (
                <p id="shopName-error" className="mt-1 text-sm text-red-600">
                  {errors.shopName}
                </p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {formData.shopName.length}/100 characters (min 3)
              </p>
            </div>

            <div>
              <label htmlFor="shopDescription" className="block text-sm font-medium text-black mb-2">
                Shop Description
              </label>
              <textarea
                id="shopDescription"
                value={formData.shopDescription}
                onChange={(e) => setFormData((prev) => ({ ...prev, shopDescription: e.target.value }))}
                rows={4}
                placeholder="Describe your shop and what you sell..."
                className="w-full rounded-md border-2 border-gray-300 px-4 py-2 text-black focus:border-blue-700 focus:outline-none focus:ring-0"
              />
            </div>

            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-black mb-2">
                Business Name
              </label>
              <input
                id="businessName"
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData((prev) => ({ ...prev, businessName: e.target.value }))}
                placeholder="Optional"
                className="w-full rounded-md border-2 border-gray-300 px-4 py-2 text-black focus:border-blue-700 focus:outline-none focus:ring-0"
              />
            </div>

            {submitError && (
              <div className="rounded-md bg-red-50 border-2 border-red-200 p-4">
                <p className="text-red-800 font-semibold">{submitError}</p>
              </div>
            )}

            <div className="flex gap-4">
              <Link
                href="/account"
                className="rounded-md border-2 border-gray-300 px-6 py-2 text-base font-semibold text-black hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-blue-700 px-6 py-2 text-base font-semibold text-white shadow-lg hover:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Registering...' : 'Register as Seller'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
