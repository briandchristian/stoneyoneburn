# StoneyOneBurn Storefront

Next.js storefront for the StoneyOneBurn marketplace.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```env
NEXT_PUBLIC_VENDURE_SHOP_API_URL=http://localhost:3000/shop-api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

3. Start the development server:
```bash
npm run dev
```

The storefront will be available at `http://localhost:3001` (Next.js default port).

## Features

- **Product Catalog**: Browse all available products
- **Product Details**: View individual product information
- **Shopping Cart**: Add items to cart (coming soon)
- **Checkout**: Complete purchases (coming soon)

## Development

Make sure the Vendure server is running on port 3000 before starting the storefront.

```bash
# In the root directory
npm run dev
```

## Build

```bash
npm run build
npm start
```
