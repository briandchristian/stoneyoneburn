/**
 * GraphQL Queries for Vendure Shop API
 *
 * This file contains all GraphQL queries used by the storefront
 * to fetch data from the Vendure backend.
 */

import { gql } from '@apollo/client';

/**
 * Query to get active channels
 */
export const GET_ACTIVE_CHANNEL = gql`
  query GetActiveChannel {
    activeChannel {
      id
      code
      currencyCode
    }
  }
`;

/**
 * Query to get product list with pagination, filtering, and sorting
 */
export const GET_PRODUCTS = gql`
  query GetProducts($options: ProductListOptions) {
    products(options: $options) {
      items {
        id
        name
        slug
        description
        featuredAsset {
          id
          preview
        }
        variants {
          id
          name
          currencyCode
          price
          priceWithTax
          sku
          stockLevel
        }
        facetValues {
          id
          name
          facet {
            id
            name
          }
        }
      }
      totalItems
    }
  }
`;

/**
 * Query to search products with advanced filtering
 */
export const SEARCH_PRODUCTS = gql`
  query SearchProducts($input: SearchInput!) {
    search(input: $input) {
      items {
        productId
        productName
        productSlug
        productAsset {
          id
          preview
        }
        priceWithTax {
          ... on SinglePrice {
            value
          }
          ... on PriceRange {
            min
            max
          }
        }
        currencyCode
        description
        facetIds
        facetValueIds
        inStock
      }
      totalItems
      facetValues {
        facetValue {
          id
          name
          facet {
            id
            name
          }
        }
        count
      }
      collections {
        collection {
          id
          name
          slug
        }
        count
      }
    }
  }
`;

/**
 * Query to get all collections (categories)
 */
export const GET_COLLECTIONS = gql`
  query GetCollections {
    collections {
      items {
        id
        name
        slug
        description
        featuredAsset {
          id
          preview
        }
        productCount
      }
      totalItems
    }
  }
`;

/**
 * Query to get products by collection
 */
export const GET_PRODUCTS_BY_COLLECTION = gql`
  query GetProductsByCollection($slug: String!, $options: ProductListOptions) {
    collection(slug: $slug) {
      id
      name
      slug
      description
      products(options: $options) {
        items {
          id
          name
          slug
          description
          featuredAsset {
            id
            preview
          }
          variants {
            id
            name
            currencyCode
            price
            priceWithTax
            sku
            stockLevel
          }
        }
        totalItems
      }
    }
  }
`;

/**
 * Query to get a single product by slug
 */
export const GET_PRODUCT_BY_SLUG = gql`
  query GetProductBySlug($slug: String!) {
    product(slug: $slug) {
      id
      name
      slug
      description
      featuredAsset {
        id
        preview
      }
      assets {
        id
        preview
        name
      }
      variants {
        id
        name
        currencyCode
        price
        priceWithTax
        sku
        stockLevel
        options {
          id
          code
          name
        }
      }
      facetValues {
        id
        name
        facet {
          id
          name
        }
      }
    }
  }
`;

/**
 * Query to get active order (cart)
 */
export const GET_ACTIVE_ORDER = gql`
  query GetActiveOrder {
    activeOrder {
      id
      code
      state
      total
      totalWithTax
      currencyCode
      lines {
        id
        quantity
        unitPrice
        unitPriceWithTax
        linePrice
        linePriceWithTax
        productVariant {
          id
          name
          sku
          product {
            id
            name
            slug
            featuredAsset {
              id
              preview
            }
          }
        }
      }
    }
  }
`;

