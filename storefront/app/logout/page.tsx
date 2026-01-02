/**
 * Logout Page
 * 
 * Handles customer logout by calling the logout mutation,
 * clearing the authentication token from localStorage,
 * and redirecting to the home page.
 */

'use client';

import { useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { LOGOUT, GET_ACTIVE_CUSTOMER } from '@/graphql/queries';
import { Header } from '@/components/Header';
import { useRouter } from 'next/navigation';

interface LogoutResult {
  logout: {
    success: boolean;
  };
}

export default function LogoutPage() {
  const router = useRouter();
  const [logout] = useMutation<LogoutResult>(LOGOUT, {
    refetchQueries: ['GetActiveCustomer'],
    awaitRefetchQueries: false,
  });

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Clear the token from localStorage immediately
        if (typeof window !== 'undefined') {
          localStorage.removeItem('vendure_token');
        }

        // Call the logout mutation
        await logout();

        // Redirect to home page
        router.push('/');
      } catch (error) {
        // Even if logout fails, clear token and redirect
        // This ensures user can't stay logged in if there's an error
        if (typeof window !== 'undefined') {
          localStorage.removeItem('vendure_token');
        }
        router.push('/');
      }
    };

    performLogout();
  }, [logout, router]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="bg-white border-2 border-gray-200 rounded-lg shadow-md p-8 text-center">
            <div className="mb-6">
              <svg
                className="mx-auto h-16 w-16 text-blue-600 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-black mb-4">Logging Out</h1>
            <p className="text-gray-700 mb-6">Please wait while we sign you out...</p>
          </div>
        </div>
      </main>
    </div>
  );
}
