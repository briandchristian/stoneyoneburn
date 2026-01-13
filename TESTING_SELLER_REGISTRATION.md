# Testing Seller Registration

This guide explains how to test the seller registration functionality in your Vendure marketplace.

## Overview

Seller registration allows authenticated customers to register as marketplace sellers. The mutation is available in the **Shop API** (not Admin API).

## Prerequisites

1. **Running Vendure Server**: Make sure your server is running (`npm run dev`)
2. **Authenticated Customer**: You need to be logged in as a customer (not an admin)
3. **Shop API Access**: The mutation is available at `http://localhost:3000/shop-api`

## Method 1: Using the Test Script (Easiest)

We've created a test script that automates the entire process:

```bash
node scripts/test-seller-registration.mjs
```

Or with custom credentials:

```bash
node scripts/test-seller-registration.mjs customer@example.com password "My Shop" "Shop description" "Business Name"
```

This script will:cd shop
- ✅ Test server connection
- ✅ Login as a customer
- ✅ Register as a seller
- ✅ Display the results

## Method 2: Using GraphiQL (Recommended for Development)

GraphiQL is available if you have the GraphiQL plugin enabled (default in development).

1. **Access GraphiQL**: Navigate to `http://localhost:3000/shop-api` in your browser
   - **Note**: If you get an error about empty queries, this is normal - GraphiQL should still load in the browser
   - If GraphiQL doesn't load, try opening the browser console (F12) and check for errors
   - Alternatively, use a GraphQL client like Postman, Insomnia, or the test script above

2. **Login as Customer**: First, you need to authenticate. Use the login mutation:

```graphql
mutation {
  login(username: "customer@example.com", password: "password") {
    ... on CurrentUser {
      id
      identifier
    }
    ... on ErrorResult {
      errorCode
      message
    }
  }
}
```

3. **Register as Seller**: After logging in, use the `registerAsSeller` mutation:

```graphql
mutation {
  registerAsSeller(input: {
    shopName: "My Awesome Shop"
    shopDescription: "I sell amazing handmade products"
    businessName: "My Business Name" # Optional
  }) {
    id
    shopName
    shopDescription
    shopSlug
    verificationStatus
    isActive
    createdAt
    customer {
      id
      emailAddress
    }
  }
}
```

## Method 2: Using cURL (Command Line)

1. **Login and get session cookie**:

```bash
curl -X POST http://localhost:3000/shop-api \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "query": "mutation { login(username: \"customer@example.com\", password: \"password\") { ... on CurrentUser { id identifier } } }"
  }'
```

2. **Register as seller** (using the session cookie):

```bash
curl -X POST http://localhost:3000/shop-api \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "query": "mutation { registerAsSeller(input: { shopName: \"My Shop\", shopDescription: \"My shop description\", businessName: \"My Business\" }) { id shopName shopSlug verificationStatus isActive } }"
  }'
```

## Method 3: Using a GraphQL Client (Postman, Insomnia, etc.)

1. **Set endpoint**: `http://localhost:3000/shop-api`
2. **Set method**: POST
3. **Set headers**:
   - `Content-Type: application/json`
4. **Login first** (to get auth cookie):
   ```json
   {
     "query": "mutation { login(username: \"customer@example.com\", password: \"password\") { ... on CurrentUser { id } } }"
   }
   ```
5. **Register as seller** (in the same session):
   ```json
   {
     "query": "mutation { registerAsSeller(input: { shopName: \"Test Shop\", shopDescription: \"Test description\" }) { id shopName shopSlug } }"
   }
   ```

## Method 4: Using the Test Scripts (Easiest)

We've created helper scripts that automate the entire process:

### Step 1: Create a Test Customer

```bash
node scripts/create-test-customer.mjs
```

Or with custom details:

```bash
node scripts/create-test-customer.mjs customer@test.com password123 "John" "Doe"
```

### Step 2: Test Seller Registration

```bash
node scripts/test-seller-registration.mjs customer@test.com password123
```

Or let it use defaults (it will generate unique credentials):

```bash
node scripts/test-seller-registration.mjs
```

## Method 5: Create a Test Customer Account (Manual)

If you don't have a customer account yet, you can create one:

1. **Register a new customer** (via shop API):

```graphql
mutation {
  registerCustomerAccount(input: {
    emailAddress: "seller@example.com"
    password: "password123"
    firstName: "John"
    lastName: "Seller"
  }) {
    ... on Success {
      success
    }
    ... on ErrorResult {
      errorCode
      message
    }
  }
}
```

2. **Verify email** (if email verification is enabled):
   - Check your email or the test emails directory (`static/email/test-emails/`)
   - Use the verification token to verify the account

3. **Login and register as seller** (see Method 1)

## Input Fields

The `RegisterSellerInput` requires:

- **shopName** (required): The name of your shop (must be unique)
- **shopDescription** (optional): A description of your shop
- **businessName** (optional): Your business name (for tax/business purposes)

## Expected Response

On success, you'll receive a `MarketplaceSeller` object:

```graphql
{
  "data": {
    "registerAsSeller": {
      "id": "1",
      "shopName": "My Awesome Shop",
      "shopDescription": "I sell amazing handmade products",
      "shopSlug": "my-awesome-shop",
      "verificationStatus": "PENDING",
      "isActive": true,
      "createdAt": "2026-01-11T12:00:00.000Z",
      "customer": {
        "id": "123",
        "emailAddress": "customer@example.com"
      }
    }
  }
}
```

## Error Handling

If registration fails, you'll get an error response. Common errors:

- **ALREADY_REGISTERED**: Customer is already a seller
- **SHOP_NAME_TAKEN**: Shop name is already in use
- **INVALID_SHOP_NAME**: Shop name doesn't meet validation requirements
- **UNAUTHORIZED**: Not logged in (need to authenticate first)

Example error response:

```graphql
{
  "errors": [
    {
      "message": "Shop name is already taken",
      "extensions": {
        "code": "SHOP_NAME_TAKEN"
      }
    }
  ]
}
```

## Verification Status

After registration, sellers start with `verificationStatus: PENDING`. This status can be:
- `PENDING`: Newly registered, awaiting verification
- `VERIFIED`: Verified and approved
- `REJECTED`: Registration was rejected
- `SUSPENDED`: Account is suspended

## Testing Workflow

1. ✅ Register a customer account
2. ✅ Login as the customer
3. ✅ Register as a seller
4. ✅ Verify the seller was created (check shopName, shopSlug, etc.)
5. ✅ Test error cases (duplicate shop name, missing authentication, etc.)

## Query Your Seller Account

After registering, you can query your seller account:

```graphql
query {
  activeSeller {
    id
    shopName
    shopDescription
    shopSlug
    verificationStatus
    isActive
  }
}
```

## Next Steps

- Create a storefront UI for seller registration (currently only available via API)
- Implement seller verification workflow (admin approves sellers)
- Add seller dashboard functionality
