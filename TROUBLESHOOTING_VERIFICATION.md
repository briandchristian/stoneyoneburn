# Troubleshooting Email Verification 400 Error

If you're getting a 400 error when verifying an email address, here are steps to diagnose and fix:

## Check the Browser Console

1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Look for the actual error message - it should show what's wrong with the GraphQL request

## Common Issues

### 1. Token Encoding Issues
The token in the URL might be URL-encoded. The verification page now handles this automatically, but if you're still having issues:

- Check if the token contains `%` signs (URL encoding)
- Try manually decoding: `decodeURIComponent(token)`

### 2. Mutation Signature
Verify the mutation is correct by checking the Vendure GraphQL schema:

```graphql
mutation VerifyCustomerAccount($token: String!) {
  verifyCustomerAccount(token: $token) {
    __typename
    ... on CurrentUser {
      id
      identifier
    }
    ... on VerificationTokenError {
      errorCode
      message
    }
  }
}
```

### 3. API Endpoint
Ensure the Apollo Client is pointing to the correct endpoint:
- Shop API: `http://localhost:3000/shop-api`
- Check `storefront/lib/apollo-client.ts` for the correct URL

### 4. Token Expiry
Verification tokens expire. If the token is old:
- Register a new account
- Use the latest verification email
- Run: `node scripts/show-latest-verification-url.js`

### 5. Check Network Tab
1. Open Developer Tools → Network tab
2. Try the verification again
3. Find the GraphQL request
4. Check the Request Payload to see what's being sent
5. Check the Response to see the actual error message

## Testing the Mutation Directly

You can test the mutation directly using GraphiQL:

1. Open: `http://localhost:3000/shop-api` (or your Vendure server URL)
2. Use this mutation:
```graphql
mutation {
  verifyCustomerAccount(token: "YOUR_TOKEN_HERE") {
    __typename
    ... on CurrentUser {
      id
      identifier
    }
    ... on VerificationTokenError {
      errorCode
      message
    }
  }
}
```

Replace `YOUR_TOKEN_HERE` with the actual token from the verification email.

## Getting the Latest Token

Run the helper script:
```bash
node scripts/show-latest-verification-url.js
```

This will show you the latest verification URL with the correct token.
