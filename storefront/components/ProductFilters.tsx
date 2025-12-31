/**
 * Product Filters Component
 *
 * Sidebar filters for product catalog
 */

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface FacetValue {
  id: string;
  name: string;
  facet: {
    id: string;
    name: string;
  };
  count?: number;
}

interface ProductFiltersProps {
  facetValues?: FacetValue[];
  onFilterChange?: () => void;
}

export function ProductFilters({ facetValues = [], onFilterChange }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const selectedFacets = searchParams.getAll('facet');

  const toggleFacet = (facetId: string) => {
    // Preserve all existing URL parameters (search, sort, etc.)
    const params = new URLSearchParams(searchParams.toString());
    const currentFacets = params.getAll('facet');
    
    if (currentFacets.includes(facetId)) {
      // Remove this specific facet while preserving all other params
      const newParams = new URLSearchParams();
      searchParams.forEach((value, key) => {
        // Keep all non-facet params, and only keep facet params that aren't being removed
        if (key !== 'facet' || value !== facetId) {
          newParams.append(key, value);
        }
      });
      newParams.delete('page'); // Reset to first page when filtering
      const queryString = newParams.toString();
      router.push(`/products${queryString ? `?${queryString}` : ''}`);
    } else {
      // Add this facet while preserving all other params (search, sort, etc.)
      params.append('facet', facetId);
      params.delete('page'); // Reset to first page when filtering
      const queryString = params.toString();
      router.push(`/products${queryString ? `?${queryString}` : ''}`);
    }
    
    onFilterChange?.();
  };

  const clearFilters = () => {
    // Preserve all existing URL parameters except facets and page
    const params = new URLSearchParams(searchParams.toString());
    params.delete('facet'); // Remove all facet filters
    params.delete('page'); // Reset to first page
    const queryString = params.toString();
    router.push(`/products${queryString ? `?${queryString}` : ''}`);
    onFilterChange?.();
  };

  // Group facet values by facet
  const facetsByGroup = facetValues.reduce((acc, facetValue) => {
    const facetName = facetValue.facet.name;
    if (!acc[facetName]) {
      acc[facetName] = [];
    }
    acc[facetName].push(facetValue);
    return acc;
  }, {} as Record<string, FacetValue[]>);

  const hasActiveFilters = selectedFacets.length > 0;

  return (
    <div className="w-full md:w-64">
      <div className="md:hidden mb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between rounded-md border-2 border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-blue-50"
        >
          <span>Filters</span>
          <svg
            className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div className={`${isOpen ? 'block' : 'hidden'} md:block`}>
        <div className="rounded-lg border-2 border-blue-200 bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-black">Filters</h2>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-700 hover:text-blue-800 font-medium"
              >
                Clear all
              </button>
            )}
          </div>

          {Object.entries(facetsByGroup).map(([facetName, values]) => (
            <div key={facetName} className="mb-6 last:mb-0">
              <h3 className="text-sm font-semibold text-black mb-2">{facetName}</h3>
              <div className="space-y-2">
                {values.map((facetValue) => {
                  const isSelected = selectedFacets.includes(facetValue.id);
                  return (
                    <label
                      key={facetValue.id}
                      className="flex items-center cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFacet(facetValue.id)}
                        className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-black">
                        {facetValue.name}
                        {facetValue.count !== undefined && (
                          <span className="ml-1 text-gray-500">({facetValue.count})</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {Object.keys(facetsByGroup).length === 0 && (
            <p className="text-sm text-gray-500">No filters available</p>
          )}
        </div>
      </div>
    </div>
  );
}
