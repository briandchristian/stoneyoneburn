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
        productVariantId
        productName
        slug
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
      shippingAddress {
        fullName
        streetLine1
        streetLine2
        city
        province
        postalCode
        countryCode
        phoneNumber
      }
      shippingWithTax
      shippingLines {
        shippingMethod {
          id
          name
        }
        priceWithTax
      }
    }
  }
`;

/**
 * Mutation to add item to order (cart)
 */
export const ADD_ITEM_TO_ORDER = gql`
  mutation AddItemToOrder($productVariantId: ID!, $quantity: Int!) {
    addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
      ... on Order {
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
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

/**
 * Mutation to adjust order line quantity
 */
export const ADJUST_ORDER_LINE = gql`
  mutation AdjustOrderLine($orderLineId: ID!, $quantity: Int!) {
    adjustOrderLine(orderLineId: $orderLineId, quantity: $quantity) {
      ... on Order {
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
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

/**
 * Mutation to remove order line from cart
 */
export const REMOVE_ORDER_LINE = gql`
  mutation RemoveOrderLine($orderLineId: ID!) {
    removeOrderLine(orderLineId: $orderLineId) {
      ... on Order {
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
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

/**
 * Query to get eligible shipping methods
 */
export const GET_ELIGIBLE_SHIPPING_METHODS = gql`
  query GetEligibleShippingMethods {
    eligibleShippingMethods {
      id
      name
      code
      description
      price
      priceWithTax
      metadata
    }
  }
`;

/**
 * Mutation to set order shipping address
 */
export const SET_ORDER_SHIPPING_ADDRESS = gql`
  mutation SetOrderShippingAddress($input: CreateAddressInput!) {
    setOrderShippingAddress(input: $input) {
      ... on Order {
        id
        shippingAddress {
          fullName
          streetLine1
          streetLine2
          city
          province
          postalCode
          countryCode
          phoneNumber
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

/**
 * Mutation to set order billing address
 */
export const SET_ORDER_BILLING_ADDRESS = gql`
  mutation SetOrderBillingAddress($input: CreateAddressInput!) {
    setOrderBillingAddress(input: $input) {
      ... on Order {
        id
        billingAddress {
          fullName
          streetLine1
          streetLine2
          city
          province
          postalCode
          countryCode
          phoneNumber
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

/**
 * Mutation to set order shipping method
 */
export const SET_ORDER_SHIPPING_METHOD = gql`
  mutation SetOrderShippingMethod($shippingMethodId: [ID!]!) {
    setOrderShippingMethod(shippingMethodId: $shippingMethodId) {
      ... on Order {
        id
        shippingWithTax
        shippingLines {
          shippingMethod {
            id
            name
          }
          priceWithTax
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

/**
 * Mutation to add payment to order
 */
export const ADD_PAYMENT_TO_ORDER = gql`
  mutation AddPaymentToOrder($input: PaymentInput!) {
    addPaymentToOrder(input: $input) {
      ... on Order {
        id
        state
        active
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

/**
 * Mutation to transition order to state
 */
export const TRANSITION_ORDER_TO_STATE = gql`
  mutation TransitionOrderToState($state: String!) {
    transitionOrderToState(state: $state) {
      ... on Order {
        id
        state
        active
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

/**
 * Query to get customer orders (order history)
 */
export const GET_ORDERS = gql`
  query GetOrders($options: OrderListOptions) {
    orders(options: $options) {
      items {
        id
        code
        state
        orderPlacedAt
        total
        totalWithTax
        currencyCode
        lines {
          id
          quantity
          productVariant {
            id
            name
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
      totalItems
    }
  }
`;

/**
 * Query to get a single order by code
 */
export const GET_ORDER_BY_CODE = gql`
  query GetOrderByCode($code: String!) {
    orderByCode(code: $code) {
      id
      code
      state
      orderPlacedAt
      createdAt
      updatedAt
      total
      totalWithTax
      subTotal
      subTotalWithTax
      shipping
      shippingWithTax
      currencyCode
      customer {
        id
        firstName
        lastName
        emailAddress
      }
      shippingAddress {
        fullName
        company
        streetLine1
        streetLine2
        city
        province
        postalCode
        countryCode
        phoneNumber
      }
      billingAddress {
        fullName
        company
        streetLine1
        streetLine2
        city
        province
        postalCode
        countryCode
        phoneNumber
      }
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
      shippingLines {
        id
        shippingMethod {
          id
          name
          code
          description
        }
        price
        priceWithTax
      }
      payments {
        id
        state
        method
        amount
        transactionId
        createdAt
      }
      fulfillments {
        id
        state
        method
        trackingCode
        createdAt
        updatedAt
      }
    }
  }
`;
