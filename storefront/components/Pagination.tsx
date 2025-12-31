/**
 * Pagination Component
 *
 * Pagination controls for product list
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export function Pagination({ currentPage, totalPages, totalItems, itemsPerPage }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const createPageUrl = (page: number) => {
    // Validate page number to prevent invalid navigation
    const validPage = Math.max(1, Math.min(page, totalPages));
    
    const params = new URLSearchParams(searchParams.toString());
    if (validPage === 1) {
      params.delete('page');
    } else {
      params.set('page', validPage.toString());
    }
    const queryString = params.toString();
    return `/products${queryString ? `?${queryString}` : ''}`;
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 1) {
    return null;
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="flex flex-col items-center gap-4 mt-8">
      <div className="text-sm text-black">
        Showing {startItem}-{endItem} of {totalItems} products
      </div>
      <nav className="flex items-center gap-2">
        {currentPage === 1 ? (
          <span
            className="px-3 py-2 rounded-md border-2 border-gray-300 text-gray-400 cursor-not-allowed"
            aria-disabled="true"
          >
            Previous
          </span>
        ) : (
          <Link
            href={createPageUrl(currentPage - 1)}
            className="px-3 py-2 rounded-md border-2 border-blue-200 text-black hover:bg-blue-50"
          >
            Previous
          </Link>
        )}

        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-3 py-2 text-black">
                ...
              </span>
            );
          }

          const pageNum = page as number;
          const isActive = pageNum === currentPage;

          return (
            <Link
              key={pageNum}
              href={createPageUrl(pageNum)}
              className={`px-3 py-2 rounded-md border-2 ${
                isActive
                  ? 'border-blue-700 bg-blue-700 text-white'
                  : 'border-blue-200 text-black hover:bg-blue-50'
              }`}
            >
              {pageNum}
            </Link>
          );
        })}

        {currentPage === totalPages ? (
          <span
            className="px-3 py-2 rounded-md border-2 border-gray-300 text-gray-400 cursor-not-allowed"
            aria-disabled="true"
          >
            Next
          </span>
        ) : (
          <Link
            href={createPageUrl(currentPage + 1)}
            className="px-3 py-2 rounded-md border-2 border-blue-200 text-black hover:bg-blue-50"
          >
            Next
          </Link>
        )}
      </nav>
    </div>
  );
}
