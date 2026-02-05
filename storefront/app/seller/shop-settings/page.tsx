/**
 * Shop Settings Page
 *
 * Allows authenticated sellers to customize their shop:
 * - Shop description
 * - Shop banner image
 * - Shop logo image
 *
 * Phase 5.1: Shop Customization
 */

'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_ACTIVE_SELLER, UPDATE_SHOP_CUSTOMIZATION } from '@/graphql/queries';
import { Header } from '@/components/Header';
import { useRouter } from 'next/navigation';

interface Seller {
  id: string;
  shopName: string;
  shopSlug: string;
  shopDescription?: string | null;
  shopBannerAssetId?: string | null;
  shopLogoAssetId?: string | null;
}

interface ActiveSellerData {
  activeSeller: Seller | null;
}

export default function ShopSettingsPage() {
  const router = useRouter();
  const [shopDescription, setShopDescription] = useState('');
  const [bannerAssetId, setBannerAssetId] = useState<string | null>(null);
  const [logoAssetId, setLogoAssetId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data, loading, error } = useQuery<ActiveSellerData>(GET_ACTIVE_SELLER, {
    fetchPolicy: 'cache-and-network',
  });

  const [updateShopCustomization] = useMutation(UPDATE_SHOP_CUSTOMIZATION, {
    refetchQueries: ['GetActiveSeller'],
    awaitRefetchQueries: true,
  });

  // Initialize form with seller data
  useEffect(() => {
    if (data?.activeSeller) {
      setShopDescription(data.activeSeller.shopDescription || '');
      setBannerAssetId(data.activeSeller.shopBannerAssetId || null);
      setLogoAssetId(data.activeSeller.shopLogoAssetId || null);
    }
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.activeSeller) {
      setSaveError('No seller account found');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateShopCustomization({
        variables: {
          sellerId: data.activeSeller.id,
          input: {
            shopDescription: shopDescription.trim() || null,
            shopBannerAssetId: bannerAssetId || null,
            shopLogoAssetId: logoAssetId || null,
          },
        },
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update shop settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="text-black font-medium">Loading shop settings...</p>
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
            <p className="text-red-700 font-semibold">Error loading shop settings: {error.message}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!data?.activeSeller) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-black mb-4">Shop Settings</h1>
              <p className="text-black mb-8">You need to register as a seller first.</p>
              <button
                onClick={() => router.push('/register-seller')}
                className="inline-block rounded-md bg-blue-700 px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-800 transition-colors"
              >
                Register as Seller
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const seller = data.activeSeller;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-black mb-6">Shop Settings</h1>
          <p className="text-gray-600 mb-8">
            Customize your shop appearance and description. Changes will be visible on your shop page.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Shop Name (read-only) */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">Shop Name</label>
              <input
                type="text"
                value={seller.shopName}
                disabled
                className="w-full rounded-md border-2 border-gray-300 px-4 py-2 text-gray-600 bg-gray-100 cursor-not-allowed"
              />
              <p className="mt-1 text-sm text-gray-500">Shop name cannot be changed</p>
            </div>

            {/* Shop Slug (read-only) */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">Shop URL</label>
              <div className="flex items-center">
                <span className="text-gray-600 mr-2">/shops/</span>
                <input
                  type="text"
                  value={seller.shopSlug}
                  disabled
                  className="flex-1 rounded-md border-2 border-gray-300 px-4 py-2 text-gray-600 bg-gray-100 cursor-not-allowed"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">Shop URL cannot be changed</p>
            </div>

            {/* Shop Description */}
            <div>
              <label htmlFor="shopDescription" className="block text-sm font-medium text-black mb-2">
                Shop Description
              </label>
              <textarea
                id="shopDescription"
                value={shopDescription}
                onChange={(e) => setShopDescription(e.target.value)}
                rows={6}
                maxLength={1000}
                className="w-full rounded-md border-2 border-gray-300 px-4 py-2 text-black focus:border-blue-700 focus:outline-none focus:ring-0"
                placeholder="Describe your shop, products, and what makes you unique..."
              />
              <p className="mt-1 text-sm text-gray-500">
                {shopDescription.length}/1000 characters
              </p>
            </div>

            {/* Banner Asset ID */}
            <div>
              <label htmlFor="bannerAssetId" className="block text-sm font-medium text-black mb-2">
                Banner Image Asset ID
              </label>
              <input
                id="bannerAssetId"
                type="text"
                value={bannerAssetId || ''}
                onChange={(e) => setBannerAssetId(e.target.value || null)}
                placeholder="Enter asset ID for shop banner"
                className="w-full rounded-md border-2 border-gray-300 px-4 py-2 text-black focus:border-blue-700 focus:outline-none focus:ring-0"
              />
              <p className="mt-1 text-sm text-gray-500">
                Upload an image in the admin dashboard and enter its asset ID here
              </p>
            </div>

            {/* Logo Asset ID */}
            <div>
              <label htmlFor="logoAssetId" className="block text-sm font-medium text-black mb-2">
                Logo Image Asset ID
              </label>
              <input
                id="logoAssetId"
                type="text"
                value={logoAssetId || ''}
                onChange={(e) => setLogoAssetId(e.target.value || null)}
                placeholder="Enter asset ID for shop logo"
                className="w-full rounded-md border-2 border-gray-300 px-4 py-2 text-black focus:border-blue-700 focus:outline-none focus:ring-0"
              />
              <p className="mt-1 text-sm text-gray-500">
                Upload an image in the admin dashboard and enter its asset ID here
              </p>
            </div>

            {/* Success Message */}
            {saveSuccess && (
              <div className="rounded-md bg-green-50 border-2 border-green-200 p-4">
                <p className="text-green-800 font-medium">Shop settings saved successfully!</p>
              </div>
            )}

            {/* Error Message */}
            {saveError && (
              <div className="rounded-md bg-red-50 border-2 border-red-200 p-4">
                <p className="text-red-800 font-semibold">Error: {saveError}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-md border-2 border-gray-300 px-6 py-2 text-base font-semibold text-black hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-md bg-blue-700 px-6 py-2 text-base font-semibold text-white shadow-lg hover:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>

          {/* Preview Link */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Preview your shop:</p>
            <a
              href={`/shops/${seller.shopSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 hover:text-blue-800 font-medium"
            >
              /shops/{seller.shopSlug} →
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
