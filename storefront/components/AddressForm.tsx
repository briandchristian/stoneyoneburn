/**
 * Address Form Component
 *
 * Reusable form component for collecting shipping or billing address information.
 * Used in checkout flow to collect customer address details.
 *
 * Features:
 * - Form validation for required fields
 * - Country code selection
 * - Proper form structure for accessibility
 * - Error handling and display
 */

'use client';

import { useState, FormEvent } from 'react';

export interface AddressInput {
  fullName: string;
  streetLine1: string;
  streetLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  countryCode: string;
  phoneNumber?: string;
}

interface AddressFormProps {
  title: string;
  initialValues?: Partial<AddressInput>;
  onSubmit: (address: AddressInput) => Promise<void> | void;
  isLoading?: boolean;
  errors?: Record<string, string>;
}

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  // Add more countries as needed
];

export function AddressForm({
  title,
  initialValues = {},
  onSubmit,
  isLoading = false,
  errors = {},
}: AddressFormProps) {
  const [formData, setFormData] = useState<AddressInput>({
    fullName: initialValues.fullName || '',
    streetLine1: initialValues.streetLine1 || '',
    streetLine2: initialValues.streetLine2 || '',
    city: initialValues.city || '',
    province: initialValues.province || '',
    postalCode: initialValues.postalCode || '',
    countryCode: initialValues.countryCode || 'US',
    phoneNumber: initialValues.phoneNumber || '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
      <h2 className="text-xl font-bold text-black mb-4">{title}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-black mb-1">
            Full Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            required
            value={formData.fullName}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            disabled={isLoading}
          />
          {errors.fullName && (
            <p className="mt-1 text-sm text-red-700">{errors.fullName}</p>
          )}
        </div>

        <div>
          <label htmlFor="streetLine1" className="block text-sm font-medium text-black mb-1">
            Street Address <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="streetLine1"
            name="streetLine1"
            required
            value={formData.streetLine1}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            disabled={isLoading}
          />
          {errors.streetLine1 && (
            <p className="mt-1 text-sm text-red-700">{errors.streetLine1}</p>
          )}
        </div>

        <div>
          <label htmlFor="streetLine2" className="block text-sm font-medium text-black mb-1">
            Apartment, suite, etc. (optional)
          </label>
          <input
            type="text"
            id="streetLine2"
            name="streetLine2"
            value={formData.streetLine2}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-black mb-1">
              City <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="city"
              name="city"
              required
              value={formData.city}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              disabled={isLoading}
            />
            {errors.city && (
              <p className="mt-1 text-sm text-red-700">{errors.city}</p>
            )}
          </div>

          <div>
            <label htmlFor="province" className="block text-sm font-medium text-black mb-1">
              State/Province <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="province"
              name="province"
              required
              value={formData.province}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              disabled={isLoading}
            />
            {errors.province && (
              <p className="mt-1 text-sm text-red-700">{errors.province}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="postalCode" className="block text-sm font-medium text-black mb-1">
              ZIP/Postal Code <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="postalCode"
              name="postalCode"
              required
              value={formData.postalCode}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              disabled={isLoading}
            />
            {errors.postalCode && (
              <p className="mt-1 text-sm text-red-700">{errors.postalCode}</p>
            )}
          </div>

          <div>
            <label htmlFor="countryCode" className="block text-sm font-medium text-black mb-1">
              Country <span className="text-red-600">*</span>
            </label>
            <select
              id="countryCode"
              name="countryCode"
              required
              value={formData.countryCode}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              disabled={isLoading}
            >
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
            {errors.countryCode && (
              <p className="mt-1 text-sm text-red-700">{errors.countryCode}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-black mb-1">
            Phone Number (optional)
          </label>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-blue-700 px-4 py-2 text-base font-semibold text-white shadow-lg hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
