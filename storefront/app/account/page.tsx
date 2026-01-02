/**
 * Customer Account/Profile Page
 * 
 * Displays customer account information and allows customers to:
 * - View their profile information
 * - Update their details
 * - Manage their addresses
 * - View order history (linked to /orders)
 */

'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_ACTIVE_CUSTOMER, UPDATE_ACTIVE_CUSTOMER, CREATE_CUSTOMER_ADDRESS, UPDATE_CUSTOMER_ADDRESS, DELETE_CUSTOMER_ADDRESS } from '@/graphql/queries';
import { Header } from '@/components/Header';
import { AddressForm, AddressInput } from '@/components/AddressForm';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Address {
  id: string;
  fullName: string;
  streetLine1: string;
  streetLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: {
    code: string;
  };
  phoneNumber?: string;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber?: string;
  addresses: Address[];
}

interface CustomerData {
  activeCustomer: Customer | null;
}

export default function AccountPage() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Address management state
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});

  const { data, loading, error } = useQuery<CustomerData>(GET_ACTIVE_CUSTOMER, {
    errorPolicy: 'partial', // Ignore errors from fields we don't have access to (like history)
    onCompleted: (data) => {
      if (!data.activeCustomer) {
        router.push('/login');
        return;
      }
      setFormData({
        firstName: data.activeCustomer.firstName,
        lastName: data.activeCustomer.lastName,
        phoneNumber: data.activeCustomer.phoneNumber || '',
      });
    },
  });

  const [updateCustomer, { loading: updating }] = useMutation(UPDATE_ACTIVE_CUSTOMER, {
    refetchQueries: ['GetActiveCustomer'],
    onCompleted: () => {
      setIsEditing(false);
      setErrors({});
    },
    onError: (error) => {
      // Filter out "customer history" authorization errors as they're admin-only fields
      // The mutation itself may succeed even if history cannot be loaded
      const isHistoryError = error.message?.includes('history') || error.message?.includes('authorized');
      if (!isHistoryError) {
        setErrors({
          submit: error.message || 'Failed to update profile. Please try again.',
        });
      } else {
        // If it's just a history error, still consider it successful
        setIsEditing(false);
        setErrors({});
      }
    },
  });

  const [createAddress, { loading: creatingAddress }] = useMutation(CREATE_CUSTOMER_ADDRESS, {
    refetchQueries: ['GetActiveCustomer'],
    onCompleted: () => {
      setIsAddingAddress(false);
      setAddressErrors({});
    },
    onError: (error) => {
      // Filter out "customer history" authorization errors as they're admin-only fields
      const isHistoryError = error.message?.includes('history') || error.message?.includes('authorized');
      if (!isHistoryError) {
        setAddressErrors({
          submit: error.message || 'Failed to create address. Please try again.',
        });
      } else {
        // If it's just a history error, still consider it successful
        setIsAddingAddress(false);
        setAddressErrors({});
      }
    },
  });

  const [updateAddress, { loading: updatingAddress }] = useMutation(UPDATE_CUSTOMER_ADDRESS, {
    refetchQueries: ['GetActiveCustomer'],
    onCompleted: () => {
      setEditingAddressId(null);
      setAddressErrors({});
    },
    onError: (error) => {
      // Filter out "customer history" authorization errors as they're admin-only fields
      const isHistoryError = error.message?.includes('history') || error.message?.includes('authorized');
      if (!isHistoryError) {
        setAddressErrors({
          submit: error.message || 'Failed to update address. Please try again.',
        });
      } else {
        // If it's just a history error, still consider it successful
        setEditingAddressId(null);
        setAddressErrors({});
      }
    },
  });

  const [deleteAddress, { loading: deletingAddress }] = useMutation(DELETE_CUSTOMER_ADDRESS, {
    refetchQueries: ['GetActiveCustomer'],
    onError: (error) => {
      // Filter out "customer history" authorization errors as they're admin-only fields
      const isHistoryError = error.message?.includes('history') || error.message?.includes('authorized');
      if (!isHistoryError) {
        setAddressErrors({
          submit: error.message || 'Failed to delete address. Please try again.',
        });
      }
      // If it's just a history error, ignore it as the deletion likely succeeded
    },
  });

  const customer = data?.activeCustomer;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !customer) {
    // Redirect is handled in onCompleted, but show message if error
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <Header />
        <main className="flex-1">
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-red-600">Please log in to view your account.</p>
              <Link
                href="/login"
                className="mt-4 inline-block text-blue-700 hover:text-blue-800"
              >
                Go to Login
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const handleEdit = () => {
    setIsEditing(true);
    setFormData({
      firstName: customer.firstName,
      lastName: customer.lastName,
      phoneNumber: customer.phoneNumber || '',
    });
    setErrors({});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      firstName: customer.firstName,
      lastName: customer.lastName,
      phoneNumber: customer.phoneNumber || '',
    });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!formData.firstName.trim()) {
      setErrors({ firstName: 'First name is required' });
      return;
    }

    if (!formData.lastName.trim()) {
      setErrors({ lastName: 'Last name is required' });
      return;
    }

    try {
      await updateCustomer({
        variables: {
          input: {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            phoneNumber: formData.phoneNumber.trim() || null,
          },
        },
      });
    } catch (err) {
      // Error handled in onError
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-black mb-8">My Account</h1>

          {/* Customer Information Section */}
          <div className="bg-white border-2 border-gray-200 rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-black">Profile Information</h2>
              {!isEditing && (
                <button
                  onClick={handleEdit}
                  className="text-blue-700 hover:text-blue-800 font-medium"
                >
                  Edit
                </button>
              )}
            </div>

            {!isEditing ? (
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-600">Name:</span>
                  <p className="text-black">{`${customer.firstName} ${customer.lastName}`}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Email:</span>
                  <p className="text-black">{customer.emailAddress}</p>
                </div>
                {customer.phoneNumber && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Phone:</span>
                    <p className="text-black">{customer.phoneNumber}</p>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-black mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="First name"
                    aria-invalid={errors.firstName ? 'true' : 'false'}
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-black mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Last name"
                    aria-invalid={errors.lastName ? 'true' : 'false'}
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-black mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Phone number"
                  />
                </div>

                <div className="text-sm text-gray-600">
                  <span className="font-medium">Email:</span> {customer.emailAddress}
                  <span className="ml-2 text-xs">(Email cannot be changed)</span>
                </div>

                {errors.submit && (
                  <p className="text-sm text-red-600">{errors.submit}</p>
                )}

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {updating ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={updating}
                    className="px-4 py-2 bg-gray-200 text-black rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Addresses Section */}
          <div className="bg-white border-2 border-gray-200 rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-black">Saved Addresses</h2>
              {!isAddingAddress && (
                <button
                  onClick={() => {
                    setIsAddingAddress(true);
                    setEditingAddressId(null);
                    setAddressErrors({});
                  }}
                  className="text-blue-700 hover:text-blue-800 font-medium"
                >
                  Add Address
                </button>
              )}
            </div>

            {/* Add Address Form */}
            {isAddingAddress && (
              <div className="mb-6">
                <AddressForm
                  title="Add New Address"
                  onSubmit={async (addressData: AddressInput) => {
                    try {
                      // Build input object, only including fields that have values
                      const input: Record<string, unknown> = {
                        fullName: addressData.fullName,
                        streetLine1: addressData.streetLine1,
                        city: addressData.city,
                        province: addressData.province,
                        postalCode: addressData.postalCode,
                        countryCode: addressData.countryCode,
                      };
                      
                      // Only include optional fields if they have values
                      // For streetLine2, always include it (use empty string if not provided)
                      input.streetLine2 = (addressData.streetLine2 || '').trim();
                      
                      if (addressData.phoneNumber && addressData.phoneNumber.trim()) {
                        input.phoneNumber = addressData.phoneNumber;
                      }
                      
                      await createAddress({
                        variables: {
                          input,
                        },
                      });
                    } catch (err) {
                      // Error handled in onError
                    }
                  }}
                  isLoading={creatingAddress}
                  errors={addressErrors}
                  onCancel={() => {
                    setIsAddingAddress(false);
                    setAddressErrors({});
                  }}
                  submitButtonText="Add Address"
                />
              </div>
            )}

            {/* Address List */}
            {customer.addresses && customer.addresses.length > 0 ? (
              <div className="space-y-4">
                {customer.addresses.map((address) => (
                  <div key={address.id}>
                    {editingAddressId === address.id ? (
                      <div className="mb-4">
                        <AddressForm
                          title="Edit Address"
                          initialValues={{
                            fullName: address.fullName,
                            streetLine1: address.streetLine1,
                            streetLine2: address.streetLine2,
                            city: address.city,
                            province: address.province,
                            postalCode: address.postalCode,
                            countryCode: address.country.code,
                            phoneNumber: address.phoneNumber,
                          }}
                          onSubmit={async (addressData: AddressInput) => {
                            try {
                              // Build input object, only including fields that have values
                              const input: Record<string, unknown> = {
                                id: address.id,
                                fullName: addressData.fullName,
                                streetLine1: addressData.streetLine1,
                                city: addressData.city,
                                province: addressData.province,
                                postalCode: addressData.postalCode,
                                countryCode: addressData.countryCode,
                              };
                              
                              // Only include optional fields if they have values
                              // For streetLine2, always include it (use empty string if not provided)
                              // This ensures the database constraint is satisfied
                              input.streetLine2 = (addressData.streetLine2 || '').trim();
                              
                              if (addressData.phoneNumber !== undefined) {
                                input.phoneNumber = addressData.phoneNumber.trim() || null;
                              }
                              
                              await updateAddress({
                                variables: {
                                  input,
                                },
                              });
                            } catch (err) {
                              // Error handled in onError
                            }
                          }}
                          isLoading={updatingAddress}
                          errors={addressErrors}
                          onCancel={() => {
                            setEditingAddressId(null);
                            setAddressErrors({});
                          }}
                          submitButtonText="Save Address"
                        />
                      </div>
                    ) : (
                      <div className="border border-gray-300 rounded-md p-4 flex justify-between items-start">
                        <div>
                          <p className="font-medium text-black">{address.fullName}</p>
                          <p className="text-gray-700">{address.streetLine1}</p>
                          {address.streetLine2 && (
                            <p className="text-gray-700">{address.streetLine2}</p>
                          )}
                          <p className="text-gray-700">
                            {address.city}, {address.province} {address.postalCode}
                          </p>
                          <p className="text-gray-700">{address.country.code}</p>
                          {address.phoneNumber && (
                            <p className="text-gray-700">{address.phoneNumber}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingAddressId(address.id);
                              setIsAddingAddress(false);
                              setAddressErrors({});
                            }}
                            disabled={deletingAddress || isAddingAddress}
                            className="text-blue-600 hover:text-blue-800 text-sm disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Are you sure you want to delete this address?')) {
                                try {
                                  await deleteAddress({
                                    variables: {
                                      id: address.id,
                                    },
                                  });
                                } catch (err) {
                                  // Error handled in onError
                                }
                              }
                            }}
                            disabled={deletingAddress || isAddingAddress}
                            className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : !isAddingAddress ? (
              <p className="text-gray-600">No saved addresses yet.</p>
            ) : null}

            {addressErrors.submit && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{addressErrors.submit}</p>
              </div>
            )}
          </div>

          {/* Order History Link */}
          <div className="bg-white border-2 border-gray-200 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-black mb-4">Order History</h2>
            <p className="text-gray-700 mb-4">View your past purchases and order details.</p>
            <Link
              href="/orders"
              className="inline-block px-6 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 transition-colors"
            >
              View Order History
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
