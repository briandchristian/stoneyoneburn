/**
 * Customer Login Page
 * 
 * Allows customers to log into their accounts.
 * Features:
 * - Login form with email and password
 * - Remember me checkbox
 * - Error handling for invalid credentials
 * - Redirect to home page on successful login
 */

'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { AUTHENTICATE, GET_ACTIVE_CUSTOMER } from '@/graphql/queries';
import { Header } from '@/components/Header';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface LoginInput {
  emailAddress: string;
  password: string;
  rememberMe: boolean;
}

interface AuthenticateResult {
  authenticate: {
    __typename: string;
    id?: string;
    identifier?: string;
    errorCode?: string;
    message?: string;
  };
}

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginInput>({
    emailAddress: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const [authenticate, { loading }] = useMutation<AuthenticateResult>(AUTHENTICATE, {
    refetchQueries: ['GetActiveCustomer'],
    awaitRefetchQueries: false, // Don't await to avoid test issues when auth fails
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.emailAddress.trim()) {
      newErrors.emailAddress = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailAddress)) {
      newErrors.emailAddress = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({}); // Clear previous errors

    if (!validateForm()) {
      return;
    }

    try {
      const result = await authenticate({
        variables: {
          input: {
            native: {
              username: formData.emailAddress.trim(),
              password: formData.password,
            },
          },
          rememberMe: formData.rememberMe,
        },
      });

      const authenticateResult = result.data?.authenticate;

      if (authenticateResult?.__typename === 'CurrentUser' && authenticateResult.id) {
        // Successful login - redirect to home page
        router.push('/');
      } else if (authenticateResult && 'errorCode' in authenticateResult) {
        // Error result
        const errorMessage =
          authenticateResult.errorCode === 'INVALID_CREDENTIALS_ERROR'
            ? 'Invalid email address or password. Please try again.'
            : authenticateResult.message || 'Login failed. Please try again.';
        setErrors({
          submit: errorMessage,
        });
      }
    } catch (error: any) {
      setErrors({
        submit: error.message || 'An error occurred. Please try again.',
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    setFormData((prev) => ({ ...prev, [name]: fieldValue }));
    
    // Clear error for this field when user starts typing
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
        <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
          <div className="bg-white border-2 border-gray-200 rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-black mb-6 text-center">Log In</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="emailAddress" className="block text-sm font-medium text-black mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="emailAddress"
                  name="emailAddress"
                  value={formData.emailAddress}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="Email address"
                  aria-invalid={errors.emailAddress ? 'true' : 'false'}
                  aria-describedby={errors.emailAddress ? 'emailAddress-error' : undefined}
                />
                {errors.emailAddress && (
                  <p id="emailAddress-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.emailAddress}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-black mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-2 pr-12 border-2 border-gray-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Password"
                    aria-invalid={errors.password ? 'true' : 'false'}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 focus:outline-none focus:text-gray-800"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-black">
                  Remember me
                </label>
              </div>

              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600" role="alert">
                    {errors.submit}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-blue-700 px-4 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging In...' : 'Log In'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-black">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-semibold text-blue-700 hover:text-blue-800">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
