/**
 * Home Page
 *
 * Landing page for the storefront
 */

import { Header } from '@/components/Header';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-black sm:text-6xl">
              Welcome to StoneyOneBurn
            </h1>
            <p className="mt-6 text-lg leading-8 text-black">
              Discover unique handmade products from independent creators
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/products"
                className="rounded-md bg-blue-700 px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 transition-colors"
              >
                Browse Products
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
