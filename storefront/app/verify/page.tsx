/**
 * Email Verification Page
 * 
 * Handles email verification for customer accounts.
 * Reads the verification token from URL query parameters and verifies the account.
 */

'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import { VERIFY_CUSTOMER_ACCOUNT } from '@/graphql/queries';
import { Header } from '@/components/Header';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface VerifyResult {
  verifyCustomerAccount: {
    __typename: 'CurrentUser' | 'VerificationTokenExpiredError' | 'VerificationTokenInvalidError';
    id?: string;
    identifier?: string;
    errorCode?: string;
    message?: string;
  };
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [verifyCustomerAccount] = useMutation<VerifyResult>(VERIFY_CUSTOMER_ACCOUNT);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid verification link. No token provided.');
      return;
    }

    const verifyEmail = async () => {
      try {
        // Use the token as-is (URLSearchParams already decodes it)
        // But handle any potential encoding issues
        const tokenToUse = token.trim();
        
        const result = await verifyCustomerAccount({
          variables: {
            token: tokenToUse,
          },
        });

        const verifyResult = result.data?.verifyCustomerAccount;

        if (verifyResult?.__typename === 'CurrentUser') {
          setStatus('success');
          // Redirect to login page after a short delay
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        } else if (
          verifyResult?.__typename === 'VerificationTokenExpiredError' ||
          verifyResult?.__typename === 'VerificationTokenInvalidError'
        ) {
          setStatus('error');
          setErrorMessage(
            verifyResult.message || 'Verification token is invalid or has expired. Please request a new verification email.'
          );
        } else {
          setStatus('error');
          setErrorMessage('An unexpected error occurred. Please try again.');
        }
      } catch (error: any) {
        setStatus('error');
        // Log the full error for debugging
        console.error('Verification error:', error);
        
        // Provide more detailed error message
        const errorMessage = error.networkError?.result?.errors?.[0]?.message 
          || error.graphQLErrors?.[0]?.message 
          || error.message 
          || 'An error occurred while verifying your email. Please try again.';
        
        setErrorMessage(errorMessage);
      }
    };

    verifyEmail();
  }, [searchParams, verifyCustomerAccount, router]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="bg-white border-2 border-gray-200 rounded-lg shadow-md p-8 text-center">
            {status === 'verifying' && (
              <>
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
                <h1 className="text-3xl font-bold text-black mb-4">Verifying Your Email</h1>
                <p className="text-gray-700 mb-6">Please wait while we verify your email address...</p>
              </>
            )}

            {status === 'success' && (
              <>
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
                <h1 className="text-3xl font-bold text-black mb-4">Email Verified!</h1>
                <p className="text-gray-700 mb-6">Your email address has been successfully verified.</p>
                <p className="text-gray-600 mb-8">Redirecting you to the login page...</p>
                <Link
                  href="/login"
                  className="inline-block rounded-md bg-blue-700 px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-800 transition-colors"
                >
                  Go to Login
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="mb-6">
                  <svg
                    className="mx-auto h-16 w-16 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-black mb-4">Verification Failed</h1>
                <p className="text-red-600 mb-6">{errorMessage}</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/register"
                    className="inline-block rounded-md bg-blue-700 px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-800 transition-colors"
                  >
                    Register Again
                  </Link>
                  <Link
                    href="/"
                    className="inline-block rounded-md bg-gray-200 px-6 py-3 text-base font-semibold text-black shadow-lg hover:bg-gray-300 transition-colors"
                  >
                    Back to Home
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
