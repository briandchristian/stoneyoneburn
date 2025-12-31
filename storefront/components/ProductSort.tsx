/**
 * Product Sort Component
 *
 * Sorting dropdown for product catalog
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';

type SortOption = {
  value: string;
  label: string;
};

const sortOptions: SortOption[] = [
  { value: 'name_ASC', label: 'Name: A-Z' },
  { value: 'name_DESC', label: 'Name: Z-A' },
  { value: 'price_ASC', label: 'Price: Low to High' },
  { value: 'price_DESC', label: 'Price: High to Low' },
  { value: 'createdAt_DESC', label: 'Newest First' },
  { value: 'createdAt_ASC', label: 'Oldest First' },
];

export function ProductSort() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort') || 'name_ASC';

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', e.target.value);
    params.delete('page'); // Reset to first page when sorting
    const queryString = params.toString();
    router.push(`/products${queryString ? `?${queryString}` : ''}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="text-sm font-medium text-black">
        Sort by:
      </label>
      <select
        id="sort"
        value={currentSort}
        onChange={handleSortChange}
        className="rounded-md border-2 border-blue-200 bg-white px-3 py-2 text-sm text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
