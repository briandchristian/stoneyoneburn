/**
 * Registration Success Page
 * 
 * Displays a success message after customer registration, instructing
 * the user to check their email for verification.
 */

import { Header } from '@/components/Header';
import Link from 'next/link';

export default function RegisterSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="bg-white border-2 border-gray-200 rounded-lg shadow-md p-8 text-center">
            <div className="mb-6">
              <svg
                className="mx-auto h-16 w-16 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <h1 className="text-3xl font-bold text-black mb-4">Registration Successful!</h1>

            <p className="text-gray-700 mb-6 text-lg">
              Thank you for creating an account with us!
            </p>

            <p className="text-black mb-8">
              Please check your email for a verification link. Click the link to verify your account and complete the registration process.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="inline-block rounded-md bg-blue-700 px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-800 transition-colors"
              >
                Go to Login
              </Link>

              <Link
                href="/"
                className="inline-block rounded-md bg-gray-200 px-6 py-3 text-base font-semibold text-black shadow-lg hover:bg-gray-300 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
